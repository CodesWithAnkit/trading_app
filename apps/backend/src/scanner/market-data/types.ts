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
  /** Per tick traded volume, when the feed sends it (tests, mock). */
  volume?: number;
  /** Quote mode: cumulative traded volume for the day (`vol_traded`). */
  cumulativeVolume?: number;
  open?: number;
  high?: number;
  low?: number;
  /** Quote mode: the previous session's close (`close_price`). */
  prevClose?: number;
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
  /** Optional: called after every (re)connect. */
  onConnected?(handler: () => void): void;
}

/** A 1m candle from the broker's historical API, used to backfill a stock added mid session. */
export interface HistoricalCandle {
  startTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Broker REST calls the stock universe needs (spec 0009 AC-12, AC-13, AC-15). */
export interface MarketDataRestClient {
  fetchFnoPriceGainers(): Promise<{ tradingSymbol?: string; percentChange?: number | string }[]>;
  searchScrip(symbol: string): Promise<{ exchange?: string; tradingsymbol?: string; symboltoken?: string }[]>;
  getCandles1m(token: string, from: Date, to: Date): Promise<HistoricalCandle[]>;
}
