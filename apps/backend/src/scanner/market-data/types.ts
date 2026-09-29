export type FeedStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'AUTHENTICATING'
  | 'DELAYED'
  | 'STALE'
  | 'DISCONNECTED'
  | 'RECONNECTING';

export interface FeedHealth {
  status: FeedStatus;
  lastTickAt: Date | null;
  lastCandleAt: Date | null;
  connectionStartedAt: Date | null;
  reconnectCount: number;
  subscribedInstrumentCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface MarketTick {
  instrumentToken: string;
  exchange: 'NSE';
  symbol: string;
  ltp: number;
  timestamp: Date;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  rawTimestamp?: number;
}

export interface Candle {
  symbol: string;
  instrumentToken: string;
  timeframe: '1m' | '5m';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startTime: Date;
  endTime: Date;
  isComplete: boolean;
}

export interface InstrumentSubscription {
  exchangeType: string;
  tokens: string[];
}

export interface MarketDataProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(instruments: InstrumentSubscription[]): Promise<void>;
  unsubscribe(instruments: InstrumentSubscription[]): Promise<void>;
  onTick(handler: (tick: MarketTick) => void): void;
  getHealth(): FeedHealth;
}
