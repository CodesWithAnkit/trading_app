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
import { buildSignalSnapshot } from './strategy/signal/signalSnapshot.js';
import { calculateMomentumScore, MomentumStock, rankByMomentum, relativeVolumeFrom5m, trendFrom5m } from './analysis/momentumScore.js';
import { toApiSignal } from './signalMapper.js';
import { reconcileOutcomes } from './outcomes/reconcileOutcomes.js';
import { IST_TIMEZONE, istDateString, istDayRange } from './time/ist.js';
import { UniverseService, UniverseStatus, WatchedStock } from './universe/UniverseService.js';
import { buildBackfill } from './universe/backfill.js';
import { REFRESH_CRON, isFirstRefreshSlot, isInRefreshWindow, isIstWeekday, nextRefreshAt } from './universe/schedule.js';

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
  | { type: 'momentum:update'; data: { watching: number; stocks: MomentumStock[] } };

// 5m candles for every watched symbol close together; coalesce their updates into one push.
const PUSH_COALESCE_MS = 1000;
// A full session is 375 one minute candles; keep the opening range all day (spec 0009 AC-15).
const HISTORY_1M_LIMIT = 400;
const HISTORY_5M_LIMIT = 80;
const FIRST_REFRESH_RETRY_MS = 60_000;

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
  private angel: AngelOneMarketDataProvider | null = null;
  private universe: UniverseService | null = null;
  /** Stocks whose history is still being backfilled; they skip strategy checks. */
  private readonly warming = new Set<string>();
  
  private history1m = new Map<string, any[]>();
  private history5m = new Map<string, any[]>();

  private readonly approaching = new Map<string, ApproachingSetup>();
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
      this.angel = angel;
      this.provider = angel;
      this.universe = new UniverseService({
        client: this.supabase.client,
        rest: angel,
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
      
      await this.persistCandle(candle);
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

      await this.persistCandle(candle);
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

    // Restore today's universe (after a restart mid session) and pull gainers if due
    setTimeout(() => {
      this.startUniverse().catch(err => this.logger.error(`Universe startup failed: ${err.message}`));
    }, 5000);

    // Flush health every 60s
    this.healthFlushInterval = setInterval(() => {
      this.flushHealth();
    }, 60000);
  }

  /** Startup: re-subscribe today's stocks, backfill them, and refresh now if inside the window (spec 0009 AC-13). */
  async startUniverse(now: Date = new Date()) {
    if (!this.universe || !isIstWeekday(now)) return;
    const state = this.getSessionState(now);
    if (state === 'CLOSED' && !isInRefreshWindow(now)) return;

    try {
      await this.universe.restoreToday(istDateString(now));
    } catch (err: any) {
      this.logger.error(err.message);
    }
    this.universe.setNextRefreshAt(nextRefreshAt(now));
    if (isInRefreshWindow(now)) {
      await this.runUniverseRefresh(false);
    }
  }

  /** Top gainers refresh, 09:22 to 15:22 IST every 15 minutes, add only (spec 0009 AC-12). */
  @Cron(REFRESH_CRON, { name: 'universe-refresh', timeZone: IST_TIMEZONE })
  async handleUniverseRefresh() {
    const now = new Date();
    if (!isInRefreshWindow(now)) return;
    await this.runUniverseRefresh(isFirstRefreshSlot(now));
  }

  private async runUniverseRefresh(retryOnFailure: boolean) {
    if (!this.universe) return;
    const now = new Date();
    this.universe.setNextRefreshAt(nextRefreshAt(now));
    try {
      await this.universe.refresh(istDateString(now));
      this.schedulePush();
    } catch {
      // Already logged and recorded for diagnostics; the watched stocks stay as they are.
      if (retryOnFailure) {
        setTimeout(() => void this.runUniverseRefresh(false), FIRST_REFRESH_RETRY_MS);
      }
    }
  }

  /** New trading day: forget yesterday's stocks, histories and volume baselines (spec 0009 invariant). */
  @Cron('0 0 9 * * 1-5', { name: 'universe-daily-reset', timeZone: IST_TIMEZONE })
  dailyReset() {
    this.universe?.reset();
    this.aggregator.reset();
    this.history1m.clear();
    this.history5m.clear();
    this.latestTicks.clear();
    this.approaching.clear();
    this.warming.clear();
    this.schedulePush();
    this.logger.log('Daily reset: universe cleared until the 09:22 gainers pull.');
  }

  getUniverseStatus(): UniverseStatus | null {
    return this.universe?.getStatus() ?? null;
  }

  /** New stocks skip strategy checks until today's candles are backfilled (spec 0009 AC-15). */
  warmUp(stocks: WatchedStock[]) {
    if (!this.angel || this.getSessionState() !== 'OPEN') return;
    stocks.forEach(s => this.warming.add(s.symbol));
    void this.backfill(stocks);
  }

  private async backfill(stocks: WatchedStock[]) {
    for (const { symbol, token } of stocks) {
      try {
        const now = new Date();
        const rows = await this.angel!.getCandles1m(token, istDayRange(istDateString(now)).sessionStart, now);
        const { oneMinute, fiveMinute } = buildBackfill(symbol, token, rows, now);
        this.seedHistory(symbol, oneMinute, fiveMinute);
        await this.persistCandles(oneMinute);
        this.logger.log(`Backfilled ${oneMinute.length} 1m candle(s) for ${symbol}.`);
      } catch (err: any) {
        this.logger.warn(`Backfill failed for ${symbol}, it starts cold: ${err.message}`);
      } finally {
        this.warming.delete(symbol);
      }
    }
  }

  /** Merges backfilled candles under any live ones by start time; a live candle wins for the same minute. */
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

    // Only aggregate candles if OPEN or CLOSING grace period
    this.aggregator.processTick(tick);
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
      if (!eligibility.eligible) return;

      this.scannerMetrics.eligibleSetups++;

      const structure = calculateStructure(dummyConfig, hist5m);
      const rvol = calculateRvol(dummyConfig, current5m, hist5m);
      const trend = calculateTrend(dummyConfig, current5m, hist5m, current1m, hist1m);

      // Use the new Multi-Strategy Engine
      const candidates = evaluateAllStrategies(symbol, current1m, hist1m, current5m, hist5m);
      
      for (const candidate of candidates) {
        if (!candidate.valid) continue;

        // Build the dynamic plan
        const plan = {
          entryZone: {
            upper: candidate.dynamicEntry! * 1.0005,
            lower: candidate.dynamicEntry! * 0.9995,
            referenceLevel: candidate.dynamicEntry!
          },
          stop: {
            level: candidate.dynamicStop!,
            method: "TECHNICAL",
            riskBps: Math.abs(candidate.dynamicEntry! - candidate.dynamicStop!) / candidate.dynamicEntry! * 10000
          },
          targets: {
            t1: { level: candidate.dynamicTarget!, distanceBps: Math.abs(candidate.dynamicTarget! - candidate.dynamicEntry!) / candidate.dynamicEntry! * 10000 }
          }
        } as any;

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

        this.scannerMetrics.activeSignals++;
      
      // Persist to Supabase
      if (this.supabase.client) {
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
            stop: signal.stop,
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
          this.logger.error(`Failed to insert signal for ${symbol}: ${insertError.message}`);
          continue;
        }
        this.logger.log(`Created new signal for ${symbol} (${signal.direction})`);
        this.events$.next({ type: 'signal:new', data: toApiSignal(inserted) });
      }

      } // End of for-loop
    } catch (e) {
      this.logger.warn(`Strategy evaluation failed for ${symbol}: ${e}`);
    }
  }

  /** Re-checks how close `symbol` is to each strategy trigger (AC-2). */
  updateApproaching(symbol: string) {
    if (this.warming.has(symbol)) return;
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

  /** Upserts on (symbol, timeframe, start_time), so restarts, reconnects and backfill never duplicate a candle. */
  async persistCandles(candles: Candle[]) {
    if (!this.supabase.client || candles.length === 0) return;
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
        this.logger.error(`Failed to upsert candle(s): ${error.message}`);
      }
    } catch (err: any) {
      this.logger.error('Failed to persist candle(s):', err.message);
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
    this.events$.complete();
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
