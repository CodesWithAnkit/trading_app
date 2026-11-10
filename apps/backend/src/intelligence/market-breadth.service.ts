import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';
import { downloadMarketIndexTokens } from '../scanner/universe/instrumentFile.js';
import {
  MarketContextContract,
  MarketContextSource,
  MarketRegimeType,
  ProvenanceContract,
  SectorMetricContract,
} from './contracts/intelligence.contract.js';
import { istDate } from './news/news.text.js';

interface SectorDefinition {
  name: string;
  symbols: string[];
}

const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    name: 'NIFTY METAL',
    symbols: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'JINDALSTEL', 'NMDC', 'NATIONALUM'],
  },
  {
    name: 'NIFTY AUTO',
    symbols: ['TATAMOTORS', 'MARUTI', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT', 'TVSMOTOR'],
  },
  {
    name: 'NIFTY BANK',
    symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'BANKBARODA'],
  },
  {
    name: 'NIFTY IT',
    symbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'COFORGE', 'PERSISTENT'],
  },
  {
    name: 'NIFTY FMCG',
    symbols: ['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM', 'DABUR', 'GODREJCP'],
  },
  {
    name: 'NIFTY REALTY',
    symbols: ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'PHOENIXLTD', 'BRIGADE'],
  },
  {
    name: 'NIFTY PHARMA',
    symbols: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP', 'LUPIN', 'AUROPHARMA'],
  },
  {
    name: 'NIFTY ENERGY',
    symbols: ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'BPCL', 'COALINDIA', 'IOC'],
  },
];

/** spec 0026 AC-10: the sector a stock belongs to (by definition membership), or null. */
export function sectorNameOf(symbol: string): string | null {
  return SECTOR_DEFINITIONS.find(d => d.symbols.includes(symbol.toUpperCase()))?.name ?? null;
}

/** spec 0026: symbols the market context subscribes as indices; never counted in breadth. */
export const NIFTY_SYMBOL = 'NIFTY';
export const VIX_SYMBOL = 'INDIAVIX';
const INDEX_SYMBOLS = new Set([NIFTY_SYMBOL, VIX_SYMBOL, 'SENSEX']);
/** A tick newer than this is "live"; older ticks from today are the last known reading. */
export const LIVE_WITHIN_MS = 60_000;
export const SNAPSHOT_EVERY_MS = 60_000;
const SUBSCRIBE_RETRY_MS = 30_000;

type Tick = { symbol: string; ltp: number; timestamp: Date; dayOpen: number; change1dPct: number; prevClose: number | null; dayHigh?: number; dayLow?: number };

/** The last real reading of today, as stored in `market_context_snapshots`. */
type SnapshotRow = {
  snapshot_time: string;
  session_date: string | null;
  market_regime: MarketRegimeType | null;
  regime_confidence: number | null;
  advance_count: number | null;
  decline_count: number | null;
  unchanged_count: number | null;
  pct_above_vwap: number | string | null;
  median_day_change: number | string | null;
  sector_metrics: SectorMetricContract[] | null;
  nifty_ltp: number | string | null;
  nifty_change_pct: number | string | null;
  vix_ltp: number | string | null;
  vix_change_pct: number | string | null;
  vix_day_low: number | string | null;
  vix_day_high: number | string | null;
};

const num = (v: number | string | null | undefined): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const r2 = (n: number) => Number(n.toFixed(2));

const REGIMES: Record<MarketRegimeType, { label: string; description: string; confidence: number }> = {
  BULLISH_TREND_DAY: {
    label: 'REGIME 01 // BULLISH TREND DAY',
    description: 'High conviction directional expansion with heavy institutional participation above session VWAP anchors.',
    confidence: 88,
  },
  BEARISH_TREND_DAY: {
    label: 'REGIME 02 // BEARISH TREND DAY',
    description: 'Sustained liquidation pressure with broad declines across multiple large cap sectors below VWAP.',
    confidence: 84,
  },
  RANGE_BOUND_CONGESTED: {
    label: 'REGIME 03 // RANGE BOUND CONGESTED',
    description: 'Balanced two way price action with market breadth oscillating around equilibrium.',
    confidence: 68,
  },
  VOLATILE_DISLOCATED: {
    label: 'REGIME 04 // VOLATILE DISLOCATED',
    description: 'Sharp divergence between index components and underlying breadth indicating liquidity stress.',
    confidence: 74,
  },
} as Record<MarketRegimeType, { label: string; description: string; confidence: number }>;

/** Regime rules (spec 0017 AC-1), unchanged: from the advance ratio and VWAP participation. */
export function classifyRegime(advanceRatio: number, pctAboveVwap: number): MarketRegimeType {
  if (advanceRatio > 60 && pctAboveVwap >= 60) return 'BULLISH_TREND_DAY';
  if (advanceRatio < 35 && pctAboveVwap < 40) return 'BEARISH_TREND_DAY';
  if (pctAboveVwap < 30 && advanceRatio > 50) return 'VOLATILE_DISLOCATED';
  return 'RANGE_BOUND_CONGESTED';
}

export const vixStatusOf = (vix: number | null): MarketContextContract['vixStatus'] =>
  vix === null ? null : vix > 22 ? 'EXTREME_VOLATILE' : vix > 16 ? 'ELEVATED' : 'LOW_NORMAL';

@Injectable()
export class MarketBreadthService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MarketBreadthService.name);
  /** Today's latest stored snapshot (spec 0026 AC-5), loaded at start and after each write. */
  private lastSnapshot: SnapshotRow | null = null;
  private latestNewsRun: { status: string; finishedAt: string | null } | null = null;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private subscribeTimer: NodeJS.Timeout | null = null;
  /** Test seam. */
  now: () => Date = () => new Date();

  constructor(
    private readonly supabase: SupabaseService,
    @Optional() private readonly scanner?: ScannerService,
  ) {}

  async onApplicationBootstrap() {
    if (!this.supabase.client) return;
    await this.refreshStoredState();
    this.snapshotTimer = setInterval(() => void this.tick(), SNAPSHOT_EVERY_MS);
    void this.subscribeIndices();
  }

  onModuleDestroy() {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    if (this.subscribeTimer) clearTimeout(this.subscribeTimer);
  }

  /** AC-1: NIFTY 50 and India VIX on the existing feed; retried until the live feed is up. */
  private async subscribeIndices() {
    if (!this.scanner) return;
    try {
      const { nifty, vix } = await downloadMarketIndexTokens();
      const indices = [{ symbol: NIFTY_SYMBOL, token: nifty, exchangeType: '1' }];
      if (vix) indices.push({ symbol: VIX_SYMBOL, token: vix, exchangeType: '1' });
      else this.logger.warn('India VIX token not found in the instrument file; VIX stays empty');
      const ok = await this.scanner.subscribeIndices(indices);
      if (ok) {
        this.logger.log(`Market context subscribed ${indices.map(i => `${i.symbol} (${i.token})`).join(', ')}`);
        return;
      }
    } catch (err) {
      this.logger.warn(`Market index subscription failed: ${(err as Error).message}`);
    }
    this.subscribeTimer = setTimeout(() => void this.subscribeIndices(), SUBSCRIBE_RETRY_MS);
  }

  private async tick() {
    if (this.getMarketContext().source === 'LIVE') await this.flushSnapshotToDb();
    else await this.refreshStoredState();
  }

  /** Reloads today's latest snapshot and the latest news run (both read only). */
  async refreshStoredState() {
    const db = this.supabase.client;
    if (!db) return;
    const today = istDate(this.now());
    const { data: snap, error } = await db
      .from('market_context_snapshots')
      .select('*')
      .eq('session_date', today)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) this.logger.warn(`Reading the last market snapshot failed: ${error.message}`);
    else this.lastSnapshot = (snap as SnapshotRow | null) ?? null;
    const { data: run } = await db.from('news_fetch_runs').select('status, finished_at').order('started_at', { ascending: false }).limit(1).maybeSingle();
    this.latestNewsRun = run ? { status: run.status, finishedAt: run.finished_at ?? null } : null;
  }

  /** Universe stock ticks from today's IST session (index ticks excluded, AC-2). */
  private stockTicks(today: string): Tick[] {
    const out: Tick[] = [];
    for (const t of (this.scanner?.latestTicks.values() ?? []) as Iterable<Tick>) {
      if (INDEX_SYMBOLS.has(t.symbol) || this.scanner?.isIndexSymbol?.(t.symbol)) continue;
      if (istDate(t.timestamp) !== today) continue;
      out.push(t);
    }
    return out;
  }

  private indexTick(symbol: string, today: string): Tick | null {
    const t = this.scanner?.latestTicks.get(symbol) as Tick | undefined;
    return t && istDate(t.timestamp) === today ? t : null;
  }

  /**
   * spec 0026: computes the context from today's real ticks; with none, today's last stored
   * snapshot (`LAST_KNOWN`, with `asOf`); with neither, every market value is null (`NONE`).
   */
  getMarketContext(): MarketContextContract {
    const now = this.now();
    const today = istDate(now);
    const stocks = this.stockTicks(today);
    const snap = this.lastSnapshot && this.lastSnapshot.session_date === today ? this.lastSnapshot : null;

    const niftyTick = this.indexTick(NIFTY_SYMBOL, today);
    const vixTick = this.indexTick(VIX_SYMBOL, today);
    const niftyLtp = niftyTick ? niftyTick.ltp : num(snap?.nifty_ltp);
    const niftyChangePct = niftyTick?.prevClose ? r2(niftyTick.change1dPct) : num(snap?.nifty_change_pct);
    const vixLtp = vixTick ? vixTick.ltp : num(snap?.vix_ltp);
    const vixChangePct = vixTick?.prevClose ? r2(vixTick.change1dPct) : num(snap?.vix_change_pct);
    const vixDayLow = vixTick ? (vixTick.dayLow ?? null) : num(snap?.vix_day_low);
    const vixDayHigh = vixTick ? (vixTick.dayHigh ?? null) : num(snap?.vix_day_high);

    let source: MarketContextSource;
    let asOf: string | null;
    let breadth: Pick<MarketContextContract, 'advanceCount' | 'declineCount' | 'unchangedCount' | 'pctAboveVwap' | 'medianDayChange' | 'regime' | 'regimeConfidence'>;
    let sectors: SectorMetricContract[];

    if (stocks.length) {
      const latest = Math.max(...stocks.map(t => t.timestamp.getTime()));
      source = now.getTime() - latest <= LIVE_WITHIN_MS ? 'LIVE' : 'LAST_KNOWN';
      asOf = new Date(latest).toISOString();
      let adv = 0, dec = 0, unch = 0, above = 0;
      const changes: number[] = [];
      for (const t of stocks) {
        changes.push(t.change1dPct);
        if (t.change1dPct > 0.05) adv++;
        else if (t.change1dPct < -0.05) dec++;
        else unch++;
        if (t.ltp >= t.dayOpen) above++;
      }
      const total = stocks.length;
      const pctAboveVwap = Math.round((above / total) * 100);
      changes.sort((a, b) => a - b);
      const regime = classifyRegime((adv / total) * 100, pctAboveVwap);
      breadth = {
        advanceCount: adv,
        declineCount: dec,
        unchangedCount: unch,
        pctAboveVwap,
        medianDayChange: r2(changes[Math.floor(changes.length / 2)]),
        regime,
        regimeConfidence: REGIMES[regime].confidence,
      };
      sectors = this.calculateSectors(new Map(stocks.map(t => [t.symbol, t])), niftyChangePct);
    } else if (snap) {
      source = 'LAST_KNOWN';
      asOf = snap.snapshot_time;
      breadth = {
        advanceCount: snap.advance_count,
        declineCount: snap.decline_count,
        unchangedCount: snap.unchanged_count,
        pctAboveVwap: num(snap.pct_above_vwap),
        medianDayChange: num(snap.median_day_change),
        regime: snap.market_regime,
        regimeConfidence: snap.regime_confidence,
      };
      sectors = Array.isArray(snap.sector_metrics) ? snap.sector_metrics : [];
    } else {
      source = niftyLtp !== null || vixLtp !== null ? 'LAST_KNOWN' : 'NONE';
      asOf = niftyTick?.timestamp.toISOString() ?? vixTick?.timestamp.toISOString() ?? null;
      breadth = { advanceCount: null, declineCount: null, unchangedCount: null, pctAboveVwap: null, medianDayChange: null, regime: null, regimeConfidence: null };
      sectors = [];
    }

    const regimeInfo = breadth.regime ? REGIMES[breadth.regime] : null;
    const health = this.scanner?.getFeedHealth?.() ?? null;
    const lastTickAt = this.scanner?.scannerMetrics?.lastTickAt ?? health?.lastTickAt ?? null;
    const feedLatencyMs = lastTickAt ? Math.max(0, now.getTime() - new Date(lastTickAt).getTime()) : null;
    const feedHealth = feedLatencyMs === null || feedLatencyMs > 15000 ? 'DISCONNECTED' : feedLatencyMs > 5000 ? 'DEGRADED' : 'HEALTHY';
    const provenance: ProvenanceContract = {
      feed: { status: health?.status ?? 'NOT_RUNNING', lastTickAt: lastTickAt ? new Date(lastTickAt).toISOString() : null, latencyMs: feedLatencyMs },
      news: this.latestNewsRun,
      institutional: { connected: false },
    };

    return {
      source,
      asOf,
      regime: breadth.regime,
      regimeLabel: regimeInfo?.label ?? null,
      regimeDescription: regimeInfo?.description ?? null,
      regimeConfidence: breadth.regimeConfidence,
      niftyLtp,
      niftyChangePct,
      vixLtp,
      vixChangePct,
      vixDayLow,
      vixDayHigh,
      vixStatus: vixStatusOf(vixLtp),
      advanceCount: breadth.advanceCount,
      declineCount: breadth.declineCount,
      unchangedCount: breadth.unchangedCount,
      advanceDeclineRatio:
        breadth.advanceCount === null || breadth.declineCount === null ? null : r2(breadth.advanceCount / Math.max(1, breadth.declineCount)),
      pctAboveVwap: breadth.pctAboveVwap,
      medianDayChange: breadth.medianDayChange,
      sectors,
      snapshotTime: now.toISOString(),
      feedLatencyMs,
      feedHealth,
      provenance,
    };
  }

  /** Median change and alpha per sector, from real ticks only; a sector with no ticked stock is left out. */
  private calculateSectors(ticks: Map<string, Tick>, niftyChangePct: number | null): SectorMetricContract[] {
    const out: SectorMetricContract[] = [];
    for (const def of SECTOR_DEFINITIONS) {
      const ticked = def.symbols.map(sym => ticks.get(sym)).filter((t): t is Tick => !!t);
      if (!ticked.length) continue;
      const changes = ticked.map(t => t.change1dPct).sort((a, b) => a - b);
      const median = changes[Math.floor(changes.length / 2)];
      const leader = ticked.reduce((a, b) => (b.change1dPct > a.change1dPct ? b : a));
      const alpha = niftyChangePct === null ? null : r2(median - niftyChangePct);
      out.push({
        name: def.name,
        // The sector has no traded price of its own; this is its leader's last price.
        ltp: leader.ltp,
        changePct: r2(median),
        alphaVsNifty: alpha,
        leaderSymbol: leader.symbol,
        leaderChangePct: r2(leader.change1dPct),
        advances: ticked.filter(t => t.change1dPct > 0).length,
        declines: ticked.filter(t => t.change1dPct <= 0).length,
        bias: alpha === null ? 'NEUTRAL' : alpha > 0.3 ? 'LONG' : alpha < -0.3 ? 'SHORT' : 'NEUTRAL',
      });
    }
    return out;
  }

  /** AC-3, AC-5: persists the current context, only while it is live (never stale or null state). */
  async flushSnapshotToDb(): Promise<void> {
    const db = this.supabase.client;
    if (!db) return;
    const c = this.getMarketContext();
    if (c.source !== 'LIVE') return;
    const row = {
      snapshot_time: c.asOf ?? c.snapshotTime,
      session_date: istDate(this.now()),
      market_regime: c.regime,
      regime_confidence: c.regimeConfidence,
      advance_count: c.advanceCount,
      decline_count: c.declineCount,
      unchanged_count: c.unchangedCount,
      pct_above_vwap: c.pctAboveVwap,
      median_day_change: c.medianDayChange,
      sector_metrics: c.sectors,
      nifty_ltp: c.niftyLtp,
      nifty_change_pct: c.niftyChangePct,
      vix_ltp: c.vixLtp,
      vix_change_pct: c.vixChangePct,
      vix_day_low: c.vixDayLow,
      vix_day_high: c.vixDayHigh,
    };
    const { error } = await db.from('market_context_snapshots').insert(row);
    if (error) {
      this.logger.error(`Failed to flush market context snapshot: ${error.message}`);
      return;
    }
    this.lastSnapshot = row as SnapshotRow;
  }
}
