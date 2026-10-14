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
import { TickNormalizer, SymbolResolver } from './TickNormalizer.js';

/** WebSocket V2 Quote mode: carries day open/high/low, previous close and day volume (spec 0009 AC-14). */
const QUOTE_MODE = 2;
/** Tokens per subscribe request; larger requests can be rejected silently (spec 0009). */
const SUBSCRIBE_CHUNK = 50;

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
  private connectedHandler?: () => void;
  private symbolResolver: SymbolResolver = () => undefined;
  private normalizer = new TickNormalizer(token => this.symbolResolver(token));

  /** Every token ever subscribed, per exchange type; replayed in full on reconnect. */
  private subscriptions = new Map<string, Set<string>>();

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
      const { feedToken, jwtToken } = await this.login();
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

  /** TOTP login via REST; also refreshes the session the REST helpers use. */
  private async login(): Promise<{ feedToken: string; jwtToken: string }> {
    const totp = new OTPAuth.TOTP({ secret: this.config.totpSecret }).generate();
    const session = await this.smartApi.generateSession(
      this.config.clientCode,
      this.config.password || this.config.clientCode, // SDK expects a password, some use pin/clientcode
      totp
    );
    if (!session || !session.data || !session.data.feedToken) {
      throw new Error('Authentication succeeded but failed to receive a feedToken.');
    }
    return session.data;
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

  /** Adds tokens to the subscribed set (never replaces it) and subscribes only the new ones. */
  public async subscribe(instruments: InstrumentSubscription[]): Promise<void> {
    const added: InstrumentSubscription[] = [];
    for (const inst of instruments) {
      const known = this.subscriptions.get(inst.exchangeType) ?? new Set<string>();
      const fresh = inst.tokens.filter(t => !known.has(t));
      fresh.forEach(t => known.add(t));
      this.subscriptions.set(inst.exchangeType, known);
      if (fresh.length > 0) added.push({ exchangeType: inst.exchangeType, tokens: fresh });
    }
    this.health.subscribedInstrumentCount = [...this.subscriptions.values()].reduce((sum, set) => sum + set.size, 0);

    if (added.length === 0) return;
    if (this.health.status !== 'CONNECTED' || !this.webSocket) {
      this.logger.warn('Cannot subscribe immediately, socket not connected. Will subscribe upon connection.');
      return;
    }

    try {
      this.applySubscriptions(added);
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
        mode: QUOTE_MODE,
        exchangeType: Number(inst.exchangeType),
        tokens: inst.tokens
      };
      this.webSocket.fetchData(req);
      inst.tokens.forEach(t => this.subscriptions.get(inst.exchangeType)?.delete(t));
    }
  }

  public onTick(handler: (tick: MarketTick) => void): void {
    this.tickHandler = handler;
  }

  /** Called after every (re)connect, once subscriptions are replayed. */
  public onConnected(handler: () => void): void {
    this.connectedHandler = handler;
  }

  /** Maps tokens to symbols for incoming ticks; owned by the stock universe. */
  public setSymbolResolver(resolver: SymbolResolver): void {
    this.symbolResolver = resolver;
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
    
    // Replay the full subscribed set
    const all = [...this.subscriptions.entries()]
      .filter(([, tokens]) => tokens.size > 0)
      .map(([exchangeType, tokens]) => ({ exchangeType, tokens: [...tokens] }));
    if (all.length > 0) {
      this.applySubscriptions(all);
    }
    this.connectedHandler?.();
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
    // Angel V2 request structure for the SDK's fetchData, sent in chunks of SUBSCRIBE_CHUNK tokens
    let requests = 0;
    for (const inst of instruments) {
      for (let i = 0; i < inst.tokens.length; i += SUBSCRIBE_CHUNK) {
        this.webSocket.fetchData({
          correlationID: `sub-${Date.now()}-${requests++}`,
          action: 1, // 1=sub
          mode: QUOTE_MODE,
          exchangeType: Number(inst.exchangeType),
          tokens: inst.tokens.slice(i, i + SUBSCRIBE_CHUNK)
        });
      }
    }
    const count = instruments.reduce((sum, i) => sum + i.tokens.length, 0);
    this.logger.log(`Requested Quote mode subscription for ${count} token(s) in ${requests} request(s); ${this.health.subscribedInstrumentCount} subscribed in total`);
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
