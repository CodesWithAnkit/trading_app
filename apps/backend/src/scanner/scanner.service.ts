import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { config } from './config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';
import { CandleAggregator } from './market-data/CandleAggregator.js';
import { MarketDataProvider, Candle } from './market-data/types.js';

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private provider: MarketDataProvider | null = null;
  private healthFlushInterval: NodeJS.Timeout | null = null;
  private lastHealthStatus = '';

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit() {
    this.logger.log('ScannerService starting...');

    const providerType = process.env.MARKET_DATA_PROVIDER || 'mock';

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

    const aggregator = new CandleAggregator();

    // Aggregator outputs
    aggregator.on1mComplete = async (candle: Candle) => {
      this.logger.log(`[1m] ${candle.symbol} closed at ${candle.close}`);
      await this.persistCandle(candle);
      await this.flushHealth(); // Optionally flush on candle complete for "last_candle_at"
    };

    aggregator.on5mComplete = async (candle: Candle) => {
      this.logger.log(`[5m] ${candle.symbol} closed at ${candle.close}`);
      await this.persistCandle(candle);
    };

    // Receive ticks from provider
    this.provider.onTick((tick) => {
      aggregator.processTick(tick);
    });

    // Start connection
    await this.provider.connect();

    // Subscribe to test tokens once connected. (Wait a bit for auth & websocket setup)
    setTimeout(() => {
      const allowedTokens = process.env.SCANNER_INSTRUMENTS 
        ? process.env.SCANNER_INSTRUMENTS.split(',') 
        : ['26009', '26000'];

      this.provider?.subscribe([
        {
          exchangeType: '1', // NSE_CM? The SDK usually maps 1 to NSE
          tokens: allowedTokens
        }
      ]);
    }, 5000);

    // Flush health every 60s
    this.healthFlushInterval = setInterval(() => {
      this.flushHealth();
    }, 60000);
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
    
    // Also flush if status changed
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
