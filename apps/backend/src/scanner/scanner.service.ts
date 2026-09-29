import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { config } from './config.js';
import { AngelOneAuth } from './angel-one/auth.js';
import { AngelOneSocket, FeedStatus } from './angel-one/socket.js';
import { TickParser } from './pipeline/parser.js';
import { FeedQualityGate } from './pipeline/feed-gate.js';
import { CandleAggregator } from './pipeline/aggregator.js';

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private socket: AngelOneSocket | null = null;

  async onModuleInit() {
    this.logger.log('ScannerService starting...');

    if (!config.angelOne.apiKey || !config.angelOne.clientCode || !config.angelOne.totpSecret) {
      this.logger.warn('⚠️ Missing Angel One credentials in environment. Scanner will start in simulated/offline mode.');
      return;
    }

    const auth = new AngelOneAuth();
    
    try {
      const session = await auth.login();
      this.logger.log('✅ Authenticated with Angel One API');

      this.socket = new AngelOneSocket(session.feedToken, config.angelOne.clientCode);
      const parser = new TickParser();
      const gate = new FeedQualityGate();
      const aggregator = new CandleAggregator();

      // Aggregator outputs
      aggregator.on1mComplete = (candle: any) => {
        this.logger.log(`[1m] ${candle.symbol} closed at ${candle.close}`);
        // Strategy Engine integration happens here
      };

      aggregator.on5mComplete = (candle: any) => {
        this.logger.log(`[5m] ${candle.symbol} closed at ${candle.close}`);
        // Strategy Engine integration happens here
      };

      // Feed Quality gate listener
      gate.onStatusChange = (status: any) => {
        this.logger.log(`⏱️ Feed Quality Gate changed to: ${status}`);
      };
      
      this.socket.onStatusChange = (status: FeedStatus) => {
        this.logger.log(`📡 Socket Status: ${status}`);
      };

      this.socket.onTick = (data: Buffer) => {
        const tick = parser.parse(data);
        if (tick) {
          const isValid = gate.processTick(tick);
          if (isValid) {
            aggregator.processTick(tick);
          } else {
            this.logger.warn(`Dropped tick for ${tick.token} (Status: ${gate.getStatus()})`);
          }
        }
      };

      this.socket.connect();

      // Subscribe to test tokens once connected (Nifty Bank example: 26009)
      setTimeout(() => {
        this.socket?.subscribe([
          {
            exchangeType: 1, // NSE
            tokens: ['26009'] // Nifty Bank token example
          }
        ]);
      }, 5000);

    } catch (error) {
      this.logger.error('❌ Failed to start scanner:', error);
    }
  }

  onModuleDestroy() {
    this.logger.log('Shutting down scanner worker...');
    if (this.socket) {
      // Clean up socket
      this.socket = null;
    }
  }
}
