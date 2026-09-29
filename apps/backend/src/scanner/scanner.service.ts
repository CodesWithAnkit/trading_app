import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
import { evaluateAllStrategies } from './strategy/setup/multiStrategyEngine.js';
import { validateRiskReward } from './strategy/plan/riskRewardValidator.js';
import { buildSignalSnapshot } from './strategy/signal/signalSnapshot.js';

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private provider: MarketDataProvider | null = null;
  private healthFlushInterval: NodeJS.Timeout | null = null;
  private lastHealthStatus = '';

  public readonly latestTicks = new Map<string, { symbol: string, ltp: number, timestamp: Date, dayOpen: number, volume: number, change1dPct: number }>();
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

  private tokenToSymbol = new Map<string, string>();
  private aggregator = new CandleAggregator();
  
  private history1m = new Map<string, any[]>();
  private history5m = new Map<string, any[]>();

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
      this.provider = new AngelOneMarketDataProvider({
        apiKey: config.angelOne.apiKey,
        clientCode: config.angelOne.clientCode,
        password: config.angelOne.password,
        totpSecret: config.angelOne.totpSecret
      });
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
      if (hist.length > 100) hist.shift();
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
      if (hist.length > 50) hist.shift();
      this.history5m.set(candle.symbol, hist);

      await this.persistCandle(candle);
      await this.evaluateStrategy(candle.symbol);
    };

    // Receive ticks from provider
    this.provider.onTick((tick) => {
      this.processTick(tick);
    });

    // Start connection
    await this.provider.connect();

    // Setup subscriptions based on instruments table
    setTimeout(() => {
      this.setupSubscriptions();
    }, 5000);

    // Flush health every 60s
    this.healthFlushInterval = setInterval(() => {
      this.flushHealth();
    }, 60000);
  }

  async setupSubscriptions() {
    const symbols = (process.env.SCANNER_INSTRUMENTS || '').split(',').map(s => s.trim()).filter(Boolean);

    if (!this.supabase.client) return;

    let query = this.supabase.client
      .from('instruments')
      .select('*')
      .eq('status', 'ACTIVE');

    if (symbols.length > 0) {
      query = query.in('symbol', symbols);
    } else {
      this.logger.log('No SCANNER_INSTRUMENTS defined. Dynamically fetching up to 50 active instruments from DB.');
      query = query.limit(50);
    }

    // Fetch tokens from db
    const { data: instruments, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch instruments from DB:', error.message);
      return;
    }

    if (!instruments || instruments.length === 0) {
      this.logger.warn('No active instruments found in DB matching SCANNER_INSTRUMENTS. Ensure seed-instruments was run.');
      return;
    }

    const tokens = instruments.map(i => {
      this.tokenToSymbol.set(i.token, i.symbol);
      return i.token;
    });

    this.logger.log(`Subscribing to ${tokens.length} instruments...`);

    this.provider?.subscribe([
      {
        exchangeType: '1', // NSE
        tokens: tokens
      }
    ]);
  }

  processTick(tick: MarketTick) {
    const sessionState = this.getSessionState(tick.timestamp);
    this.scannerMetrics.sessionState = sessionState;

    if (sessionState === 'CLOSED' || sessionState === 'PRE_MARKET') {
      // Do not process ticks outside session + grace period
      return;
    }

    // Resolve symbol from token if not provided by provider
    if (!tick.symbol) {
      tick.symbol = this.tokenToSymbol.get(tick.instrumentToken) || tick.instrumentToken;
    }

    this.scannerMetrics.ticksReceived++;
    this.scannerMetrics.lastTickAt = tick.timestamp;

    // Update latestTicks Map
    const existing = this.latestTicks.get(tick.symbol) || {
      symbol: tick.symbol,
      ltp: tick.ltp,
      timestamp: tick.timestamp,
      dayOpen: tick.ltp, // Fallback if open not provided
      volume: 0,
      change1dPct: 0
    };

    existing.ltp = tick.ltp;
    existing.timestamp = tick.timestamp;
    if (tick.open && existing.dayOpen === existing.ltp) {
      existing.dayOpen = tick.open; // Real open price if tick supplies it
    }
    
    // Some providers send cumulative volume, some send interval volume. Angel One sends cumulative (often) or interval.
    // In our Angel One normalization, we expect cumulative or we accumulate it.
    if (tick.volume) {
      existing.volume = tick.volume; // Assuming cumulative for now
    }

    if (existing.dayOpen > 0) {
      existing.change1dPct = ((existing.ltp - existing.dayOpen) / existing.dayOpen) * 100;
    }

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
        await this.supabase.client.from('signals').insert({
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
        });
        this.logger.log(`Created new signal for ${symbol} (${signal.direction})`);
      }

      } // End of for-loop
    } catch (e) {
      this.logger.warn(`Strategy evaluation failed for ${symbol}: ${e}`);
    }
  }

  async persistCandle(candle: Candle) {
    if (!this.supabase.client) return;
    try {
      const { error } = await this.supabase.client
        .from('candles')
        .insert({
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
        });
      
      if (error) {
        this.logger.error(`Failed to insert candle: ${error.message}`);
      }
    } catch (err: any) {
      this.logger.error('Failed to persist candle:', err.message);
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
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
