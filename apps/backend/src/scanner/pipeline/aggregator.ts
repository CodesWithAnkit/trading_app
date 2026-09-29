import { Tick, ScannerCandle } from './types.js';

export class CandleAggregator {
  private current1m: Record<string, ScannerCandle> = {};
  private current5m: Record<string, ScannerCandle> = {};

  // Callbacks for when candles are completed
  public on1mComplete?: (candle: ScannerCandle) => void;
  public on5mComplete?: (candle: ScannerCandle) => void;

  /**
   * Process a new incoming tick and aggregate into 1m and 5m candles.
   */
  public processTick(tick: Tick) {
    const symbol = tick.token;
    const date = new Date(tick.timestamp);
    
    // Normalize to 1m boundary
    const min1Date = new Date(date);
    min1Date.setSeconds(0, 0);
    const min1Ts = min1Date.toISOString();

    // Normalize to 5m boundary
    const min5Date = new Date(date);
    min5Date.setMinutes(Math.floor(min5Date.getMinutes() / 5) * 5, 0, 0);
    const min5Ts = min5Date.toISOString();

    this.updateCandle(this.current1m, symbol, min1Ts, tick, this.on1mComplete);
    this.updateCandle(this.current5m, symbol, min5Ts, tick, this.on5mComplete);
  }

  private updateCandle(
    store: Record<string, ScannerCandle>, 
    symbol: string, 
    ts: string, 
    tick: Tick,
    onComplete?: (candle: ScannerCandle) => void
  ) {
    const existing = store[symbol];

    // If we have an existing candle that belongs to an older timeframe, complete it
    if (existing && existing.timestamp !== ts) {
      existing.isComplete = true;
      if (onComplete) {
        onComplete({ ...existing });
      }
      // Start a new candle
      store[symbol] = this.createNewCandle(symbol, ts, tick);
    } else if (!existing) {
      store[symbol] = this.createNewCandle(symbol, ts, tick);
    } else {
      // Update existing candle
      existing.high = Math.max(existing.high, tick.lastTradedPrice);
      existing.low = Math.min(existing.low, tick.lastTradedPrice);
      existing.close = tick.lastTradedPrice;
      existing.volume += tick.lastTradedQuantity;
    }
  }

  private createNewCandle(symbol: string, timestamp: string, tick: Tick): ScannerCandle {
    return {
      symbol,
      timestamp,
      open: tick.lastTradedPrice,
      high: tick.lastTradedPrice,
      low: tick.lastTradedPrice,
      close: tick.lastTradedPrice,
      volume: tick.lastTradedQuantity,
      isComplete: false
    };
  }
}
