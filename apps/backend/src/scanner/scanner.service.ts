import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Subject } from 'rxjs';
import { config } from './config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';
import { CandleAggregator } from './market-data/CandleAggregator.js';
import { MarketDataProvider, Candle, MarketTick } from './market-data/types.js';
import { StrategyConfig } from './strategy/config/strategyConfig.js';
import { evaluateEligibility } from './strategy/eligibility/eligibilityEngine.js';
import { calculateStructure } from './strategy/features/structureCalculator.js';
import { calculateRvol } from './strategy/features/rvolCalculator.js';
import { calculateTrend } from './strategy/features/trendCalculator.js';
import { evaluateAllStrategies, evaluateStrategyProximity, StrategyProximity } from './strategy/setup/multiStrategyEngine.js';
import { validateRiskReward } from './strategy/plan/riskRewardValidator.js';
import { TradePlan } from './strategy/plan/planTypes.js';
import { buildSignalSnapshot } from './strategy/signal/signalSnapshot.js';
import { calculateMomentumScore, MomentumStock, rankByMomentum, relativeVolumeFrom5m, trendFrom5m } from './analysis/momentumScore.js';
import { reconcileOutcomes } from './outcomes/reconcileOutcomes.js';
import { toApiSignal, referenceEntryOf, stopOf, target1Of } from './signalMapper.js';
import { IST_TIMEZONE, istDateString, istDayRange } from './time/ist.js';
import { UniverseService, UniverseStatus, WatchedStock } from './universe/UniverseService.js';
import { buildBackfill, CandleRow } from './universe/backfill.js';
import { downloadFnoStocks } from './universe/instrumentFile.js';
import { isAtOrAfterTimeExit, isInExitWindow, isIstWeekday } from './universe/schedule.js';
import { checkExit, EXIT_STATUS, ExitReason, pnlPct, Plan, PlanBook } from './plans/planBook.js';

export type ApproachingSetup = {
  symbol: string;
  price: number;
  dayChangePct: number;
  volume: number;
  relativeVolume: number;
  momentumScore: number;
  strategies: StrategyProximity[];
  closestDistancePct: number;
  updatedAt: string;
};

export type ScannerEvent =
  | { type: 'signal:new'; data: ReturnType<typeof toApiSignal> }
  | { type: 'approaching:update'; data: ApproachingSetup[] }
  | { type: 'momentum:update'; data: { watching: number; stocks: MomentumStock[] } }
  | { type: 'signal:exit'; data: SignalExit };

export type SignalExit = {
  id: string;
  symbol: string;
  setup: string;
  reason: ExitReason;
  exitPrice: number;
  exitAt: string;
  pnlPct: number;
  stale: boolean;
};

// 5m candles for every watched symbol close together; coalesce their updates into one push.
const PUSH_COALESCE_MS = 1000;
// A full session is 375 one minute candles; keep the opening range all day (spec 0009 AC-15).
const HISTORY_1M_LIMIT = 400;
const HISTORY_5M_LIMIT = 80;
/** Only the strongest gainers may open plans (spec 0009 AC-16). */
const TOP_GAINERS = 20;
const CANDLE_FLUSH_MS = 2000;
const CANDLE_QUEUE_LIMIT = 5000;
const PAGE_SIZE = 1000;

type LatestTick = { symbol: string, ltp: number, timestamp: Date, dayOpen: number, volume: number, change1dPct: number, prevClose: number | null };

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private provider: MarketDataProvider | null = null;
  private healthFlushInterval: NodeJS.Timeout | null = null;
  private lastHealthStatus = '';

  public readonly latestTicks = new Map<string, LatestTick>();
  public readonly scannerMetrics = {
    ticksReceived: 0,
    candlesCompleted1m: 0,
    candlesCompleted5m: 0,
    strategyEvaluations: 0,
    eligibleSetups: 0,
    activeSignals: 0,
    lastTickAt: null as Date | null,
    lastCandleAt: null as Date | null,
    providerType: 'mock',
    sessionState: 'CLOSED',
    uptimeStart: new Date()
  };

  private aggregator = new CandleAggregator();
  private universe: UniverseService | null = null;
  /** Stocks whose history is still being backfilled; they skip strategy checks. */
  private readonly warming = new Set<string>();
  
  private history1m = new Map<string, any[]>();
  private history5m = new Map<string, any[]>();

  private readonly approaching = new Map<string, ApproachingSetup>();
  /** Open trade plans, one per stock and strategy (spec 0010). */
  readonly planBook = new PlanBook();
  /** Top gainers, frozen for the 5m bucket they were computed in (spec 0009 AC-16). */
  private topGainers: { bucket: string; symbols: Set<string> } | null = null;
  /** Completed candles waiting for the next batched upsert (spec 0009 AC-15). */
  private readonly candleQueue = new Map<string, Candle>();
  private candleFlushTimer: NodeJS.Timeout | null = null;
  /** Scanner pushes for SSE subscribers. */
  public readonly events$ = new Subject<ScannerEvent>();
  private pushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  getSessionState(now: Date = new Date()): 'PRE_MARKET' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const timeNum = istTime.getHours() * 100 + istTime.getMinutes();
    
    if (timeNum < 915) return 'PRE_MARKET';
    if (timeNum >= 915 && timeNum < 1530) return 'OPEN';
    if (timeNum >= 1530 && timeNum < 1532) return 'CLOSING';
    return 'CLOSED';
  }

  async onModuleInit() {
    this.logger.log('ScannerService starting...');

    const providerType = process.env.MARKET_DATA_PROVIDER || 'mock';
    this.scannerMetrics.providerType = providerType;

    if (providerType === 'angelone') {
      if (!config.angelOne.apiKey || !config.angelOne.clientCode || !config.angelOne.totpSecret) {
        this.logger.error('❌ Missing Angel One credentials in environment while MARKET_DATA_PROVIDER is angelone. FAILING FAST.');
        process.exit(1);
      }
      const angel = new AngelOneMarketDataProvider({
        apiKey: config.angelOne.apiKey,
        clientCode: config.angelOne.clientCode,
        password: config.angelOne.password,
        totpSecret: config.angelOne.totpSecret
      });
      this.provider = angel;
      this.universe = new UniverseService({
        client: this.supabase.client,
        download: () => downloadFnoStocks(),
        subscribe: tokens => angel.subscribe([{ exchangeType: '1', tokens }]), // 1 = NSE cash
        onAdded: async stocks => this.warmUp(stocks)
      });
      angel.setSymbolResolver(token => this.universe?.resolveSymbol(token));
      // Volume gathered while disconnected must not land in one candle.
      angel.onConnected(() => this.aggregator.resetVolumeBaselines());
    } else {
      this.logger.warn('⚠️ Starting with Mock Market Data Provider (Not fully implemented yet for new interface).');
      return;
    }

    // Aggregator outputs
    this.aggregator.on1mComplete = async (candle: Candle) => {
      this.scannerMetrics.candlesCompleted1m++;
      this.scannerMetrics.lastCandleAt = candle.endTime;
      this.logger.log(`[1m] ${candle.symbol} closed at ${candle.close}`);
      
      const hist = this.history1m.get(candle.symbol) || [];
      hist.push(this.mapCandleForStrategy(candle));
      if (hist.length > HISTORY_1M_LIMIT) hist.shift();
      this.history1m.set(candle.symbol, hist);
      
      this.queueCandle(candle);
      await this.flushHealth();
    };

    this.aggregator.on5mComplete = async (candle: Candle) => {
      this.scannerMetrics.candlesCompleted5m++;
      this.scannerMetrics.lastCandleAt = candle.endTime;
      this.logger.log(`[5m] ${candle.symbol} closed at ${candle.close}`);
      
      const hist = this.history5m.get(candle.symbol) || [];
      hist.push(this.mapCandleForStrategy(candle));
      if (hist.length > HISTORY_5M_LIMIT) hist.shift();
      this.history5m.set(candle.symbol, hist);

      this.queueCandle(candle);
      await this.evaluateStrategy(candle.symbol);
      this.updateApproaching(candle.symbol);
      this.schedulePush();
    };

    // Receive ticks from provider
    this.provider.onTick((tick) => {
      this.processTick(tick);
    });

    // Start connection
    await this.provider.connect();

    this.candleFlushTimer = setInterval(() => void this.flushCandles(), CANDLE_FLUSH_MS);

    // Close or reload open plans, then stream today's F&O list
    setTimeout(() => {
      this.startUniverse().catch(err => this.logger.error(`Universe startup failed: ${err.message}`));
    }, 5000);

    // Flush health every 60s
    this.healthFlushInterval = setInterval(() => {
      this.flushHealth();
    }, 60000);
  }

  /** Startup: settle open plans, then stream today's F&O list (spec 0009 AC-12, spec 0010 AC-7). */
  async startUniverse(now: Date = new Date()) {
    if (!this.universe) return;
    await this.catchUpPlans(now);
    if (!isIstWeekday(now)) return;
    await this.universe.load(istDateString(now));
  }

  /** Reload the F&O list before the open (spec 0009 AC-12). */
  @Cron('0 45 8 * * 1-5', { name: 'universe-load', timeZone: IST_TIMEZONE })
  async handleUniverseLoad() {
    await this.universe?.load(istDateString());
  }

  /** New trading day: forget yesterday's stocks, histories and volume baselines (spec 0009 invariant). */
  @Cron('0 0 9 * * 1-5', { name: 'universe-daily-reset', timeZone: IST_TIMEZONE })
  async dailyReset() {
    this.universe?.reset();
    this.aggregator.reset();
    this.history1m.clear();
    this.history5m.clear();
    this.latestTicks.clear();
    this.approaching.clear();
    this.warming.clear();
    this.topGainers = null;
    this.planBook.clear();
    this.schedulePush();
    this.logger.log('Daily reset: universe cleared until the F&O list streams.');
    await this.catchUpPlans(new Date());
    await this.universe?.load(istDateString());
  }

  getUniverseStatus(): UniverseStatus | null {
    return this.universe?.getStatus() ?? null;
  }

  /** After a restart mid session, stocks skip strategy checks until today's saved candles are reloaded (spec 0009 AC-15). */
  warmUp(stocks: WatchedStock[]) {
    const state = this.getSessionState();
    if (state !== 'OPEN' && state !== 'CLOSING') return;
    stocks.forEach(s => this.warming.add(s.symbol));
    void this.reloadHistory(stocks);
  }

  private async reloadHistory(stocks: WatchedStock[]) {
    for (const { symbol, token } of stocks) {
      try {
        const now = new Date();
        const rows = await this.loadSavedCandles(symbol, istDayRange(istDateString(now)).sessionStart, now);
        const { oneMinute, fiveMinute } = buildBackfill(symbol, token, rows, now);
        this.seedHistory(symbol, oneMinute, fiveMinute);
      } catch (err: any) {
        this.logger.warn(`History reload failed for ${symbol}, it starts cold: ${err.message}`);
      } finally {
        this.warming.delete(symbol);
      }
    }
    this.logger.log(`Reloaded today's saved candles for ${stocks.length} stock(s).`);
  }

  /** Today's saved 1m candles for one stock, ordered and paged. */
  private async loadSavedCandles(symbol: string, from: Date, to: Date): Promise<CandleRow[]> {
    if (!this.supabase.client) return [];
    const rows: CandleRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.supabase.client
        .from('candles')
        .select('start_time, open, high, low, close, volume')
        .eq('symbol', symbol)
        .eq('timeframe', '1m')
        .gte('start_time', from.toISOString())
        .lt('start_time', to.toISOString())
        .order('start_time', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      for (const r of data || []) {
        rows.push({ startTime: new Date(r.start_time), open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume) });
      }
      if (!data || data.length < PAGE_SIZE) return rows;
    }
  }

  /** Merges reloaded candles under any live ones by start time; a live candle wins for the same minute. */
  seedHistory(symbol: string, oneMinute: Candle[], fiveMinute: Candle[]) {
    const merge = (store: Map<string, any[]>, candles: Candle[], limit: number) => {
      const byStart = new Map<string, any>();
      for (const c of candles) byStart.set(c.startTime.toISOString(), this.mapCandleForStrategy(c));
      for (const c of store.get(symbol) || []) byStart.set(c.timestamp, c);
      const merged = [...byStart.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      store.set(symbol, merged.slice(-limit));
    };
    merge(this.history1m, oneMinute, HISTORY_1M_LIMIT);
    merge(this.history5m, fiveMinute, HISTORY_5M_LIMIT);
  }

  /**
   * Whether `symbol` is among the top gainers, computed once per 5m bucket and frozen for
   * that evaluation pass: ranked stocks by day change, ties by symbol (spec 0009 AC-16).
   */
  isTopGainer(symbol: string, bucket: string): boolean {
    if (this.topGainers?.bucket !== bucket) {
      const ranked = [...this.latestTicks.values()]
        .filter(t => t.prevClose !== null)
        .sort((a, b) => b.change1dPct - a.change1dPct || a.symbol.localeCompare(b.symbol))
        .slice(0, TOP_GAINERS);
      this.topGainers = { bucket, symbols: new Set(ranked.map(t => t.symbol)) };
    }
    return this.topGainers.symbols.has(symbol);
  }

  processTick(tick: MarketTick) {
    const sessionState = this.getSessionState(tick.timestamp);
    this.scannerMetrics.sessionState = sessionState;

    if (sessionState === 'CLOSED' || sessionState === 'PRE_MARKET') {
      // Do not process ticks outside session + grace period
      return;
    }

    // After the daily reset the socket still carries yesterday's tokens; only today's universe counts.
    if (this.universe && !this.universe.resolveSymbol(tick.instrumentToken)) return;
    if (!tick.symbol) {
      tick.symbol = this.universe?.resolveSymbol(tick.instrumentToken) || tick.instrumentToken;
    }

    this.scannerMetrics.ticksReceived++;
    this.scannerMetrics.lastTickAt = tick.timestamp;

    // Update latestTicks Map
    const existing: LatestTick = this.latestTicks.get(tick.symbol) || {
      symbol: tick.symbol,
      ltp: tick.ltp,
      timestamp: tick.timestamp,
      dayOpen: tick.ltp, // Fallback if open not provided
      volume: 0,
      change1dPct: 0,
      prevClose: null
    };

    existing.ltp = tick.ltp;
    existing.timestamp = tick.timestamp;
    if (tick.open) existing.dayOpen = tick.open;
    if (tick.prevClose) existing.prevClose = tick.prevClose;

    // Quote mode sends the day's cumulative volume; other feeds send per tick volume.
    if (tick.cumulativeVolume !== undefined) {
      existing.volume = tick.cumulativeVolume;
    } else if (tick.volume) {
      existing.volume += tick.volume;
    }

    // Day change is measured from the previous close (spec 0009 AC-14); without one the stock is unranked.
    existing.change1dPct = existing.prevClose ? ((existing.ltp - existing.prevClose) / existing.prevClose) * 100 : 0;

    this.latestTicks.set(tick.symbol, existing);
    this.checkPlans(tick);

    // Only aggregate candles if OPEN or CLOSING grace period
    this.aggregator.processTick(tick);
  }

  /** Target or stop on every valid tick (spec 0010 AC-2). */
  private checkPlans(tick: MarketTick) {
    if (!(tick.ltp > 0) || !isInExitWindow(tick.timestamp)) return;
    for (const plan of this.planBook.openFor(tick.symbol)) {
      if (!plan.signalId || tick.timestamp.getTime() <= new Date(plan.firedAt).getTime()) continue;
      const reason = checkExit(plan, tick.ltp);
      if (reason) void this.closePlan(plan, reason, tick.ltp, tick.timestamp);
    }
  }

  /** Records an exit once: out of the book first, then the atomic RPC, then the alert (spec 0010 AC-5, AC-6). */
  async closePlan(plan: Plan, reason: ExitReason, price: number, at: Date, stale = false) {
    const taken = this.planBook.take(plan.symbol, plan.setup);
    if (!taken || !taken.signalId) return;
    await this.recordExit(taken.signalId, reason, price, at);
    this.scannerMetrics.activeSignals = Math.max(0, this.scannerMetrics.activeSignals - 1);
    const exit: SignalExit = {
      id: taken.signalId,
      symbol: taken.symbol,
      setup: taken.setup,
      reason,
      exitPrice: Math.round(price * 100) / 100,
      exitAt: at.toISOString(),
      pnlPct: pnlPct(taken, price),
      stale
    };
    this.logger.log(`Exit ${exit.symbol} ${exit.setup}: ${reason} at ${exit.exitPrice} (${exit.pnlPct}%)${stale ? ' [stale]' : ''}`);
    this.events$.next({ type: 'signal:exit', data: exit });
  }

  /** Conditional update plus history row in one transaction; retried once (spec 0010). */
  private async recordExit(signalId: string, reason: ExitReason, price: number, at: Date): Promise<boolean> {
    if (!this.supabase.client) return false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await this.supabase.client.rpc('close_signal_plan', {
        p_signal_id: signalId,
        p_to_status: EXIT_STATUS[reason],
        p_exit_price: price,
        p_exit_at: at.toISOString(),
        p_exit_reason: reason
      });
      if (!error) return data === true;
      this.logger.error(`Failed to record exit for signal ${signalId} (attempt ${attempt + 1}): ${error.message}`);
    }
    return false;
  }

  /** Closes every open plan at 15:15 IST at its last price (spec 0010 AC-3). */
  @Cron('0 15 15 * * 1-5', { name: 'plans-time-exit', timeZone: IST_TIMEZONE })
  async handleTimeExit(at: Date = new Date()) {
    for (const plan of this.planBook.all()) {
      const { price, stale } = this.lastPriceFor(plan);
      await this.closePlan(plan, 'TIME', price, at, stale);
    }
  }

  private lastPriceFor(plan: Plan): { price: number; stale: boolean } {
    const tick = this.latestTicks.get(plan.symbol);
    if (tick && tick.ltp > 0) return { price: tick.ltp, stale: Date.now() - tick.timestamp.getTime() > 5 * 60_000 };
    const hist = this.history1m.get(plan.symbol) || [];
    if (hist.length > 0) return { price: hist[hist.length - 1].close, stale: true };
    return { price: plan.entry, stale: true };
  }

  /**
   * Startup and daily reset: closes plans left open from earlier days, closes today's if it is
   * already 15:15, and otherwise loads today's open plans into the book (spec 0010 AC-7).
   */
  async catchUpPlans(now: Date) {
    if (!this.supabase.client) return;
    const { dayStart, dayEnd } = istDayRange(istDateString(now));
    const { data, error } = await this.supabase.client
      .from('signals')
      .select('*')
      .eq('status', 'ACTIVE')
      .lt('created_at', dayEnd.toISOString());
    if (error) {
      this.logger.error(`Failed to load open plans: ${error.message}`);
      return;
    }

    const afterTimeExit = isAtOrAfterTimeExit(now);
    let loaded = 0;
    for (const row of data || []) {
      const plan = this.planFromRow(row);
      if (!plan) continue;
      const earlierDay = new Date(row.created_at) < dayStart;
      if (earlierDay || afterTimeExit) {
        const price = earlierDay ? plan.entry : (await this.lastSavedClose(plan.symbol)) ?? plan.entry;
        if (await this.recordExit(plan.signalId!, 'TIME', price, now)) {
          this.logger.warn(`Closed ${earlierDay ? 'stale' : "today's"} open plan ${plan.symbol} ${plan.setup} as TIME_EXIT at ${price}.`);
        }
        continue;
      }
      if (this.planBook.reserve(plan)) loaded++;
    }
    if (loaded > 0) this.logger.log(`Reloaded ${loaded} open plan(s) for tracking.`);
  }

  private planFromRow(row: any): Plan | null {
    const symbol = row.snapshot_json?.symbol;
    const entry = referenceEntryOf(row);
    const target = target1Of(row);
    if (!symbol || !entry || target === null) {
      this.logger.warn(`Skipping open plan ${row.id}: incomplete snapshot.`);
      return null;
    }
    return {
      signalId: row.id,
      symbol,
      setup: row.setup_family,
      direction: row.direction === 'SHORT' ? 'SHORT' : 'LONG',
      entry,
      stop: stopOf(row),
      target,
      firedAt: row.created_at
    };
  }

  private async lastSavedClose(symbol: string): Promise<number | null> {
    if (!this.supabase.client) return null;
    const { data } = await this.supabase.client
      .from('candles')
      .select('close')
      .eq('symbol', symbol)
      .eq('timeframe', '1m')
      .order('start_time', { ascending: false })
      .limit(1);
    return data?.[0] ? Number(data[0].close) : null;
  }

  private mapCandleForStrategy(c: Candle) {
    return {
      symbol: c.symbol,
      timestamp: c.startTime.toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      exchange: 'NSE',
      timeframe: c.timeframe,
      isComplete: true
    };
  }

  private async evaluateStrategy(symbol: string) {
    if (this.warming.has(symbol)) return;
    this.scannerMetrics.strategyEvaluations++;
    const hist1m = this.history1m.get(symbol) || [];
    const hist5m = this.history5m.get(symbol) || [];
    
    if (hist1m.length === 0 || hist5m.length === 0) return;
    
    const current1m = hist1m[hist1m.length - 1];
    const current5m = hist5m[hist5m.length - 1];

    // No new plan from a trigger candle ending at or after 15:15 IST (spec 0010 AC-3).
    if (isAtOrAfterTimeExit(new Date(new Date(current1m.timestamp).getTime() + 60_000))) return;
    // Only the current top gainers may open plans (spec 0009 AC-16).
    if (!this.isTopGainer(symbol, current5m.timestamp)) return;

    const context = {
      symbol: symbol,
      instrumentType: "NSE_CASH_EQUITY",
      isActive: true,
      isSuspended: false,
      isCautionary: false,
      isUnsuitable: false,
      currentPrice: current1m.close,
      avg1mVolume: current1m.volume,
      avg5mVolume: current5m.volume,
      avgTradedValue: current5m.volume * current5m.close,
      currentSpreadBps: 2,
      available1mCandles: hist1m.length,
      available5mCandles: hist5m.length,
    } as any;

    const dummyConfig = {
      strategy: { id: "live", version: "1.0", strategy_version: "1.0", configuration_version: 1, status: "live", effective_from: new Date().toISOString() },
      market: { exchange: "NSE", segment: "CASH_EQUITY", timezone: "Asia/Kolkata", currency: "INR", supported_directions: ["LONG", "SHORT"] },
      candles: { primary: ["1m", "5m"], signal_context: { setup_timeframe: "5m", execution_context: "1m" }, use_completed_candles_for_confirmation: true, allow_forming_candle_for_monitoring: false, required_history: { one_minute: null, five_minute: null } },
      eligibility: { instrument_type: "NSE_CASH_EQUITY", require_active_status: false, exclude_suspended: false, exclude_cautionary: false, exclude_unsuitable: false, min_price: null, min_avg_1m_volume: null, min_avg_5m_volume: null, min_avg_traded_value: null, max_allowed_spread_bps: null, min_required_1m_candles: null, min_required_5m_candles: null },
      setups: { enabled: ["BREAKOUT_MOMENTUM"], breakout: { enabled: true }, breakdown: { enabled: true } },
      structure: { lookback_1m: null, lookback_5m: null, reference_method: null, minimum_structure_quality: null, allow_extended_range: true },
      breakout: { confirmation_window_candles: null, minimum_acceptance_distance_bps: null, require_volume_confirmation: false, reject_immediate_range_return: false, late_entry_buffer_bps: null },
      volume: { enabled: false },
      trend: { timeframe_primary: "5m", timeframe_secondary: "1m", method: null, long: { allowed_states: [] }, short: { allowed_states: [] } },
      volatility: { method: null, timeframe: "5m", lookback_periods: null, block_signal_in_extreme: false },
      liquidity: { enabled: false },
      risk_reward: { minimum_ratio: null, require_valid_ordering: false, long: { required_order: [] }, short: { required_order: [] } },
      entry: { mode: "POINT", reference_method: null, max_width_bps: null, reject_late_entry: false, late_entry_buffer_bps: null },
      stop: { method: null, structural: { enabled: false }, volatility_adjustment: { enabled: false }, minimum_distance_bps: null, maximum_distance_bps: null, reject_if_risk_too_small: false, reject_if_risk_too_large: false },
      targets: { t1: { method: "PERCENT_FROM_REFERENCE_ENTRY", default_move_percent: 1 }, t2_plus: { enabled: false } },
      trailing: { enabled: false },
      confidence: { enabled: false }
    } as any as StrategyConfig;

    try {
      const eligibility = evaluateEligibility(dummyConfig, context);
      // Unset thresholds mean "no limit" for the F&O universe; any other rejection still blocks (spec 0011, Assumed).
      const onlyUnsetThresholds = eligibility.status === 'CONFIG_INCOMPLETE' && eligibility.reasons.length === 1;
      if (!eligibility.eligible && !onlyUnsetThresholds) return;

      this.scannerMetrics.eligibleSetups++;

      const structure = calculateStructure(dummyConfig, hist5m);
      const rvol = calculateRvol(dummyConfig, current5m, hist5m);
      const trend = calculateTrend(dummyConfig, current5m, hist5m, current1m, hist1m);

      // Use the new Multi-Strategy Engine
      const candidates = evaluateAllStrategies(symbol, current1m, hist1m, current5m, hist5m);
      
      for (const candidate of candidates) {
        if (!candidate.valid || candidate.dynamicEntry === undefined || candidate.dynamicStop === undefined || candidate.dynamicTarget === undefined) continue;
        // One open plan per stock and strategy (spec 0010 AC-4).
        if (this.planBook.has(symbol, candidate.setupFamily)) continue;

        const entry = candidate.dynamicEntry;
        const stopPrice = candidate.dynamicStop;
        const target = candidate.dynamicTarget;
        // The engine's TradePlan shape (plan/planTypes.ts); the engine's levels are used unchanged.
        const plan: TradePlan = {
          direction: 'LONG',
          entryZone: { entryLow: entry * 0.9995, entryHigh: entry * 1.0005, referenceEntry: entry },
          stop: {
            price: stopPrice,
            method: 'TECHNICAL',
            structuralReference: null,
            distanceFromEntry: Math.abs(entry - stopPrice),
            distanceBps: (Math.abs(entry - stopPrice) / entry) * 10000
          },
          targets: { t1: target, t2: null },
          trailing: { enabled: false, activationCondition: null, trailingMethod: null, trailingDistance: null, initialStop: stopPrice }
        };

        const rr = validateRiskReward(dummyConfig, plan);

        const signal = buildSignalSnapshot(
          dummyConfig,
          symbol,
          "NSE",
          current1m.close,
          current1m.timestamp,
          candidate.setupFamily,
          plan,
          structure,
          rvol,
          trend,
          { score: Math.round(Math.random() * 20 + 80), band: "HIGH", components: {} as any, weights: {} }, // dynamically score later
          { eligible: true, status: "ELIGIBLE", reasons: [], metrics: {} as any },
          rr
        );

        if (!this.supabase.client) continue;

        // Reserve before the insert so a tick or a second candidate can't slip in (spec 0010).
        const tracked: Plan = {
          signalId: null, symbol, setup: candidate.setupFamily, direction: 'LONG',
          entry, stop: stopPrice, target, firedAt: signal.createdAt
        };
        if (!this.planBook.reserve(tracked)) continue;

        const { data: inserted, error: insertError } = await this.supabase.client.from('signals').insert({
          direction: signal.direction,
          setup_family: signal.setupFamily,
          status: signal.state,
          entry_low: signal.entryZone.entryLow,
          entry_high: signal.entryZone.entryHigh,
          target_1: signal.targets.t1,
          target_2: signal.targets.t2,
          snapshot_json: {
            symbol: signal.symbol,
            exchange: signal.exchange,
            setup: signal.setupFamily,
            price: signal.currentPrice,
            reference_entry: signal.referenceEntry,
            // `level` is what the mapper, reconciliation and replay read.
            stop: { ...signal.stop, level: signal.stop.price },
            targets: signal.targets,
            confidence: signal.confidence,
            confidence_band: signal.confidenceBand,
            rationale: "Automated Strategy",
            metrics: signal.rawFeatures,
            expires_at: signal.expiresAt
          },
          created_at: signal.createdAt
        }).select().single();
        if (insertError) {
          this.planBook.release(symbol, candidate.setupFamily);
          this.logger.error(`Failed to insert signal for ${symbol}: ${insertError.message}`);
          continue;
        }

        this.planBook.attach(symbol, candidate.setupFamily, inserted.id);
        this.scannerMetrics.activeSignals++;
        this.logger.log(`Created new signal for ${symbol} (${signal.direction})`);
        this.events$.next({ type: 'signal:new', data: toApiSignal(inserted) });

        // A price that moved past a level during the insert closes the plan now.
        const ltp = this.latestTicks.get(symbol)?.ltp;
        const hit = ltp ? checkExit(tracked, ltp) : null;
        if (hit && ltp) void this.closePlan(tracked, hit, ltp, new Date());
      }
    } catch (e) {
      this.logger.warn(`Strategy evaluation failed for ${symbol}: ${e}`);
    }
  }

  /** Re-checks how close `symbol` is to each strategy trigger (AC-2). */
  updateApproaching(symbol: string) {
    if (this.warming.has(symbol)) return;
    const hist5m = this.history5m.get(symbol) || [];
    const bucket = hist5m[hist5m.length - 1]?.timestamp;
    // Approaching cards follow the same top gainers gate as signals (spec 0009 AC-16).
    if (bucket && !this.isTopGainer(symbol, bucket)) {
      this.approaching.delete(symbol);
      return;
    }
    const hist1m = this.history1m.get(symbol) || [];
    const current1m = hist1m[hist1m.length - 1];
    const strategies = current1m ? evaluateStrategyProximity(current1m, hist1m) : [];
    if (strategies.length === 0) {
      this.approaching.delete(symbol);
      return;
    }

    const stock = this.momentumFor(symbol);
    this.approaching.set(symbol, {
      symbol,
      price: stock?.ltp ?? current1m.close,
      dayChangePct: stock?.dayChangePct ?? 0,
      volume: stock?.volume ?? 0,
      relativeVolume: stock?.relativeVolume ?? 1,
      momentumScore: stock?.momentumScore ?? 0,
      strategies,
      closestDistancePct: strategies[0].distancePct,
      updatedAt: new Date().toISOString()
    });
  }

  /** Approaching setups, closest to triggering first (AC-3). */
  getApproachingSetups(): ApproachingSetup[] {
    return [...this.approaching.values()].sort((a, b) => a.closestDistancePct - b.closestDistancePct);
  }

  getApproachingSetup(symbol: string): ApproachingSetup | undefined {
    return this.approaching.get(symbol);
  }

  /** Every watched stock ranked by daily momentum score (AC-1). */
  getMomentumRanking(): MomentumStock[] {
    const stocks = [...this.latestTicks.keys()]
      .map(symbol => this.momentumFor(symbol))
      .filter((s): s is MomentumStock => s !== null);
    return rankByMomentum(stocks);
  }

  private momentumFor(symbol: string): MomentumStock | null {
    const tick = this.latestTicks.get(symbol);
    if (!tick) return null;
    const hist5m = this.history5m.get(symbol) || [];
    const relativeVolume = relativeVolumeFrom5m(hist5m);
    const trend = trendFrom5m(hist5m);
    const ranked = tick.prevClose !== null;
    return {
      symbol,
      ltp: tick.ltp,
      dayChangePct: Math.round(tick.change1dPct * 100) / 100,
      volume: tick.volume,
      relativeVolume,
      trend,
      ranked,
      momentumScore: ranked ? calculateMomentumScore(tick.change1dPct, relativeVolume, trend) : 0,
      lastTickAt: tick.timestamp.toISOString()
    };
  }

  private schedulePush() {
    if (this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.events$.next({ type: 'approaching:update', data: this.getApproachingSetups() });
      this.events$.next({ type: 'momentum:update', data: { watching: this.latestTicks.size, stocks: this.getMomentumRanking() } });
    }, PUSH_COALESCE_MS);
  }

  /** End-of-day outcome reconciliation, 15:32 IST on trading weekdays (AC-7). */
  @Cron('32 15 * * 1-5', { name: 'eod-reconciliation', timeZone: IST_TIMEZONE })
  async handleEodReconciliation() {
    if (!this.supabase.client) {
      this.logger.warn('Skipping EOD reconciliation: database not configured.');
      return;
    }
    try {
      await reconcileOutcomes(this.supabase.client, istDateString());
    } catch (err: any) {
      this.logger.error(`EOD reconciliation failed: ${err.message}`);
    }
  }

  async persistCandle(candle: Candle) {
    await this.persistCandles([candle]);
  }

  /** Queues a completed candle for the next batched upsert; the latest write per key wins. */
  queueCandle(candle: Candle) {
    this.candleQueue.set(`${candle.symbol}|${candle.timeframe}|${candle.startTime.toISOString()}`, candle);
    while (this.candleQueue.size > CANDLE_QUEUE_LIMIT) {
      const oldest = this.candleQueue.keys().next().value!;
      this.candleQueue.delete(oldest);
      this.logger.warn('Candle queue full; dropped the oldest candle.');
    }
  }

  /** One upsert for everything queued; failures go back in the queue (spec 0009 AC-15). */
  async flushCandles() {
    if (this.candleQueue.size === 0) return;
    const batch = [...this.candleQueue.values()];
    this.candleQueue.clear();
    if (!(await this.persistCandles(batch))) {
      for (const c of batch) {
        const key = `${c.symbol}|${c.timeframe}|${c.startTime.toISOString()}`;
        if (!this.candleQueue.has(key)) this.candleQueue.set(key, c);
      }
    }
  }

  /** Upserts on (symbol, timeframe, start_time), so restarts and reconnects never duplicate a candle. */
  async persistCandles(candles: Candle[]): Promise<boolean> {
    if (!this.supabase.client || candles.length === 0) return true;
    try {
      const { error } = await this.supabase.client
        .from('candles')
        .upsert(candles.map(candle => ({
          symbol: candle.symbol,
          instrument_token: candle.instrumentToken,
          timeframe: candle.timeframe,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          start_time: candle.startTime.toISOString(),
          end_time: candle.endTime.toISOString(),
          is_complete: candle.isComplete
        })), { onConflict: 'symbol,timeframe,start_time' });

      if (error) {
        this.logger.error(`Failed to upsert ${candles.length} candle(s): ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error('Failed to persist candle(s):', err.message);
      return false;
    }
  }

  async flushHealth() {
    if (!this.provider || !this.supabase.client) return;
    
    const health = this.provider.getHealth();
    const sessionState = this.getSessionState();
    
    // Override health status if session is closed but we're connected
    if (sessionState === 'CLOSED' && health.status === 'CONNECTED') {
      health.status = 'DISCONNECTED'; // Or logic to disconnect provider at 15:32
    }
    
    if (this.lastHealthStatus !== health.status) {
      this.lastHealthStatus = health.status;
    }

    try {
      const { error } = await this.supabase.client
        .from('feed_health')
        .insert({
          status: health.status,
          last_tick_at: health.lastTickAt ? health.lastTickAt.toISOString() : null,
          last_candle_at: health.lastCandleAt ? health.lastCandleAt.toISOString() : null,
          connection_started_at: health.connectionStartedAt ? health.connectionStartedAt.toISOString() : null,
          reconnect_count: health.reconnectCount,
          subscribed_instrument_count: health.subscribedInstrumentCount,
          last_error_code: health.lastErrorCode,
          last_error_message: health.lastErrorMessage
        });

      if (error) {
        this.logger.error(`Failed to insert feed health: ${error.message}`);
      }
    } catch (err: any) {
      this.logger.error('Failed to persist feed health:', err.message);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down scanner worker...');
    if (this.healthFlushInterval) {
      clearInterval(this.healthFlushInterval);
    }
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }
    if (this.candleFlushTimer) {
      clearInterval(this.candleFlushTimer);
    }
    await this.flushCandles();
    this.events$.complete();
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
