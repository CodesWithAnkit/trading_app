export interface Tick {
  token: string;
  timestamp: number;
  lastTradedPrice: number;
  lastTradedQuantity: number;
  volume: number;
}

export interface ScannerCandle {
  symbol: string;
  timestamp: string; // ISO string for strategy engine compatibility
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete: boolean;
}
