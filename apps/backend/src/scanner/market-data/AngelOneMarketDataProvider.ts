import { Logger } from '@nestjs/common';
import { SmartAPI, WebSocketV2 } from 'smartapi-javascript';
import * as OTPAuth from 'otpauth';
import {
  MarketDataProvider,
  InstrumentSubscription,
  MarketTick,
  FeedHealth,
  FeedStatus
} from './types.js';
import { TickNormalizer } from './TickNormalizer.js';

export interface AngelOneConfig {
  apiKey: string;
  clientCode: string;
  password?: string;
  totpSecret: string;
}

export class AngelOneMarketDataProvider implements MarketDataProvider {
  private readonly logger = new Logger(AngelOneMarketDataProvider.name);
  private config: AngelOneConfig;
  
  private smartApi: any = null;
  private webSocket: any = null;
  
  private health: FeedHealth = {
    status: 'DISCONNECTED',
    lastTickAt: null,
    lastCandleAt: null,
    connectionStartedAt: null,
    reconnectCount: 0,
    subscribedInstrumentCount: 0
  };

  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentBackoffMs = 1000;
  private readonly maxBackoffMs = 30000;
  
  private tickHandler?: (tick: MarketTick) => void;
  private normalizer = new TickNormalizer();
  
  private subscriptions: InstrumentSubscription[] = [];

  constructor(config: AngelOneConfig) {
    this.config = config;
    this.smartApi = new SmartAPI({
      api_key: config.apiKey
    });
  }

  public async connect(): Promise<void> {
    if (this.health.status === 'CONNECTING' || this.health.status === 'CONNECTED') {
      return;
    }

    this.updateStatus('CONNECTING');
    this.logger.log('Authenticating with Angel One...');

    try {
      // 1. Generate TOTP
      const totpObj = new OTPAuth.TOTP({ secret: this.config.totpSecret });
      const totp = totpObj.generate();

      // 2. Login via REST
      const session = await this.smartApi.generateSession(
        this.config.clientCode,
        this.config.password || this.config.clientCode, // SDK expects a password, some use pin/clientcode
        totp
      );

      if (!session || !session.data || !session.data.feedToken) {
        throw new Error('Authentication succeeded but failed to receive a feedToken.');
      }

      const { feedToken, jwtToken } = session.data;
      this.logger.log('✅ Authentication successful, initiating WebSocket V2...');

      // 3. Connect WebSocket V2
      this.webSocket = new WebSocketV2({
        jwttoken: jwtToken,
        apikey: this.config.apiKey,
        clientcode: this.config.clientCode,
        feedtype: feedToken
      });

      this.webSocket.connect()
        .then(() => {
          this.handleConnected();
        })
        .catch((err: any) => {
          this.logger.error('WebSocket connection promise rejected:', err);
          this.handleDisconnected(err.message || 'Connection failed');
        });

      // Bind events
      this.webSocket.on('tick', this.handleRawTick.bind(this));
      this.webSocket.on('close', () => this.handleDisconnected('Connection closed'));
      this.webSocket.on('error', (err: any) => {
        this.logger.error('WebSocket error event:', err);
      });
      // The SDK uses custom 'pong' or similar for heartbeats
      this.webSocket.on('pong', () => {
         // handle heartbeat if needed
      });

    } catch (error: any) {
      this.logger.error('Failed to authenticate or connect', error.message);
      this.handleDisconnected(error.message);
    }
  }

  public async disconnect(): Promise<void> {
    this.updateStatus('DISCONNECTED');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.webSocket) {
      try {
        this.webSocket.close();
      } catch (err) {}
      this.webSocket = null;
    }
  }

  public async subscribe(instruments: InstrumentSubscription[]): Promise<void> {
    // Keep track of active subscriptions to re-apply on reconnect
    this.subscriptions = instruments;
    this.health.subscribedInstrumentCount = instruments.reduce((sum, i) => sum + i.tokens.length, 0);

    if (this.health.status !== 'CONNECTED' || !this.webSocket) {
      this.logger.warn('Cannot subscribe immediately, socket not connected. Will subscribe upon connection.');
      return;
    }

    try {
      this.applySubscriptions(instruments);
    } catch (err: any) {
      this.logger.error('Subscription failed', err.message);
    }
  }

  public async unsubscribe(instruments: InstrumentSubscription[]): Promise<void> {
    if (this.health.status !== 'CONNECTED' || !this.webSocket) return;
    
    // SDK expects: { action: 0, mode: 1, exchangeType: 1, tokens: [...] }
    for (const inst of instruments) {
      const req = {
        correlationID: `unsub-${Date.now()}`,
        action: 0, // 0=unsub
        mode: 1, // 1=LTP
        exchangeType: Number(inst.exchangeType),
        tokens: inst.tokens
      };
      this.webSocket.fetchData(req);
    }
  }

  public onTick(handler: (tick: MarketTick) => void): void {
    this.tickHandler = handler;
  }

  public getHealth(): FeedHealth {
    return { ...this.health };
  }

  private handleConnected() {
    this.logger.log('📡 Angel One WebSocket V2 Connected');
    this.updateStatus('CONNECTED');
    this.currentBackoffMs = 1000; // Reset backoff
    this.health.reconnectCount = 0;
    this.health.connectionStartedAt = new Date();
    
    // Apply existing subscriptions
    if (this.subscriptions.length > 0) {
      this.applySubscriptions(this.subscriptions);
    }
  }

  private handleDisconnected(reason: string) {
    if (this.health.status === 'DISCONNECTED') return; // explicit disconnect
    
    this.updateStatus('RECONNECTING');
    this.health.lastErrorMessage = reason;
    this.webSocket = null;

    if (!this.reconnectTimer) {
      this.logger.warn(`Connection lost (${reason}). Scheduling reconnect in ${this.currentBackoffMs}ms`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.health.reconnectCount++;
        // exponential backoff
        this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.maxBackoffMs);
        this.connect();
      }, this.currentBackoffMs);
    }
  }

  private applySubscriptions(instruments: InstrumentSubscription[]) {
    // Angel One V2 req structure for SDK's fetchData function
    for (const inst of instruments) {
      const req = {
        correlationID: `sub-${Date.now()}`,
        action: 1, // 1=sub
        mode: 1, // 1 for LTP
        exchangeType: Number(inst.exchangeType),
        tokens: inst.tokens
      };
      this.webSocket.fetchData(req);
    }
    this.logger.log(`Requested subscription for ${this.health.subscribedInstrumentCount} tokens`);
  }

  private handleRawTick(data: any) {
    this.logger.debug('Received raw tick data:', JSON.stringify(data));
    // If the SDK passes back a buffer or string, we assume the normalizer handles it or it's pre-parsed.
    // Usually smartapi-javascript `tick` event passes a parsed object array
    
    // Some versions pass an array of ticks
    const items = Array.isArray(data) ? data : [data];
    
    for (const raw of items) {
      const tick = this.normalizer.normalize(raw);
      if (tick) {
        this.health.lastTickAt = new Date();
        if (this.tickHandler) {
          this.tickHandler(tick);
        }
      }
    }
  }

  private updateStatus(status: FeedStatus) {
    if (this.health.status !== status) {
      this.health.status = status;
      this.logger.log(`Feed status changed to: ${status}`);
    }
  }
}
