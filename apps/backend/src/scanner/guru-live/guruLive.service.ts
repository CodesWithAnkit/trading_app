import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service.js';
import { ScannerService } from '../scanner.service.js';
import { CandleAggregator } from '../market-data/CandleAggregator.js';
import { Candle, MarketTick } from '../market-data/types.js';
import { downloadIndexInstruments } from '../universe/instrumentFile.js';
import { Bar, DailyBar, DEFINITIONS_VERSION, istDate } from '../strategy/guru/index.js';
import { GATE_CACHE_MS, latestRunsByPair, LatestRun, LiveStatusRegistry } from '../../backtest/live/liveToggles.js';
import { toApiSignal } from '../signalMapper.js';
import { Fill, GuruLiveEngine } from './guruLiveEngine.js';

const REFRESH_MS = 60_000;
const EXCHANGE_TYPE: Record<string, string> = { NSE: '1', BSE: '3' };

/**
 * spec 0023: runs passing guru rules live on NIFTY / SENSEX index bars and emits GURU signals
 * through the normal pipeline. Never places an order (AC-9).
 */
@Injectable()
export class GuruLiveService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(GuruLiveService.name);
  private readonly aggregator = new CandleAggregator();
  private readonly engine: GuruLiveEngine;
  private enabled = new Map<string, Set<string>>(); // symbol → enabled rule ids
  private runs = new Map<string, LatestRun>();
  private runsAt = 0;
  private subscribed = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly scanner: ScannerService,
    private readonly supabase: SupabaseService,
    private readonly status: LiveStatusRegistry,
  ) {
    this.engine = new GuruLiveEngine({
      liveRules: (symbol) => [...(this.enabled.get(symbol) ?? [])].filter((r) => this.runs.get(`${r}|${symbol}`)?.passed_gate === true),
      hasOpenPlan: (symbol, ruleId) => this.scanner.planBook.has(symbol, ruleId),
      onFill: (f) => void this.emit(f),
      onWarming: (ruleId, symbol, reason) => this.status.setWarming(ruleId, symbol, reason),
    });
    this.aggregator.on5mComplete = (candle: Candle) => {
      void this.scanner.persistCandles([candle]);
      this.engine.onBarClose(candle.symbol, toBar(candle));
    };
  }

  onApplicationBootstrap() {
    if (!this.supabase.client) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Reload toggles each minute and the gate cache every 5 minutes (AC-7); subscribe feeds on demand (AC-2). */
  async refresh(now = Date.now()) {
    const db = this.supabase.client;
    if (!db) return;
    try {
      const { data, error } = await db.from('strategy_live_toggles').select('rule_id,symbol,enabled').eq('enabled', true);
      if (error) throw new Error(error.message);
      const next = new Map<string, Set<string>>();
      for (const t of data ?? []) next.set(t.symbol, new Set([...(next.get(t.symbol) ?? []), t.rule_id]));
      this.enabled = next;
      if (now - this.runsAt >= GATE_CACHE_MS || this.runs.size === 0) {
        this.runs = await latestRunsByPair(db);
        this.runsAt = now;
      }
      const wanted = [...next.keys()].filter((s) => !this.subscribed.has(s));
      if (wanted.length) await this.startSymbols(wanted);
    } catch (err) {
      this.logger.warn(`Guru live refresh failed: ${(err as Error).message}`);
    }
  }

  private async startSymbols(symbols: string[]) {
    const instruments = (await downloadIndexInstruments()).filter((i) => symbols.includes(i.symbol));
    for (const i of instruments) await this.seed(i.symbol);
    const ok = await this.scanner.subscribeIndices(
      instruments.map((i) => ({ symbol: i.symbol, token: i.token, exchangeType: EXCHANGE_TYPE[i.exchange] })),
      (tick) => this.onTick(tick),
    );
    for (const i of instruments) this.subscribed.add(i.symbol);
    this.logger.log(`Guru live: ${ok ? 'subscribed' : 'no live feed for'} ${instruments.map((i) => `${i.symbol} (${i.exchange} ${i.token})`).join(', ')}`);
  }

  /** AC-3: last 400 5m bars and 30 1d bars from `candles`. */
  private async seed(symbol: string) {
    const db = this.supabase.client!;
    const [five, day] = await Promise.all([
      db.from('candles').select('start_time,open,high,low,close,volume').eq('symbol', symbol).eq('timeframe', '5m').order('start_time', { ascending: false }).limit(400),
      db.from('candles').select('start_time,open,high,low,close').eq('symbol', symbol).eq('timeframe', '1d').order('start_time', { ascending: false }).limit(30),
    ]);
    const bars: Bar[] = (five.data ?? []).reverse().map((r) => ({ t: new Date(r.start_time), o: +r.open, h: +r.high, l: +r.low, c: +r.close, v: +(r.volume ?? 0) }));
    const daily: DailyBar[] = (day.data ?? []).reverse().map((r) => ({ date: istDate(new Date(r.start_time)), o: +r.open, h: +r.high, l: +r.low, c: +r.close }));
    this.engine.seed(symbol, bars, daily);
  }

  private onTick(tick: MarketTick) {
    this.engine.onTick(tick.symbol, tick.ltp, tick.timestamp);
    this.aggregator.processTick(tick);
  }

  /** AC-5: a normal signal row and SSE event, tagged GURU with pinned evidence; plan keyed by rule id (AC-6). */
  private async emit({ ruleId, symbol, position: p, at }: Fill) {
    const db = this.supabase.client;
    if (!db) return;
    const run = this.runs.get(`${ruleId}|${symbol}`);
    const oos = run?.out_of_sample ?? {};
    const full = Object.values(oos.perYear ?? {}).filter((y: any) => y.full) as { netR: number }[];
    const guru = {
      ruleId,
      symbol,
      runId: run?.id ?? null,
      oosProfitFactor: oos.profitFactor ?? null,
      oosYearsPositive: `${full.filter((y) => y.netR > 0).length} / ${full.length}`,
      definitionsVersion: run?.definitions_version ?? DEFINITIONS_VERSION,
    };
    const reserved = this.scanner.planBook.reserve({
      signalId: null, symbol, setup: ruleId, direction: p.side, entry: p.entry, stop: p.stop, target: p.target, firedAt: at.toISOString(),
    });
    if (!reserved) return;
    const { data: inserted, error } = await db
      .from('signals')
      .insert({
        direction: p.side,
        setup_family: 'GURU',
        status: 'ACTIVE',
        entry_low: p.entry,
        entry_high: p.entry,
        target_1: p.target,
        created_at: at.toISOString(),
        snapshot_json: {
          symbol,
          exchange: symbol === 'SENSEX' ? 'BSE' : 'NSE',
          setup: ruleId,
          setupFamily: 'GURU',
          direction: p.side,
          price: p.entry,
          reference_entry: p.entry,
          stop: { level: p.stop, method: 'GURU_RULE' },
          targets: { t1: p.target },
          rationale: `Guru rule ${ruleId} (definitions ${guru.definitionsVersion}), passed the backtest gate`,
          expires_at: closeOfDay(at),
          guru,
        },
      })
      .select()
      .single();
    if (error || !inserted) {
      this.scanner.planBook.release(symbol, ruleId);
      this.logger.warn(`Guru signal insert failed for ${ruleId} ${symbol}: ${error?.message}`);
      return;
    }
    this.scanner.planBook.attach(symbol, ruleId, inserted.id);
    this.scanner.events$.next({ type: 'signal:new', data: toApiSignal(inserted) });
    this.logger.log(`GURU ${ruleId} ${p.side} ${symbol} @ ${p.entry} stop ${p.stop} target ${p.target}`);
  }
}

function toBar(c: Candle): Bar {
  return { t: c.startTime, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume ?? 0 };
}

/** A filled guru signal lives until stop, target, or the 15:15 IST time exit (AC-6). */
function closeOfDay(at: Date): string {
  return new Date(`${istDate(at)}T15:15:00+05:30`).toISOString();
}
