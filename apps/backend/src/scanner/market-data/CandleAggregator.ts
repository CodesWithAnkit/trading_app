import { MarketTick, Candle } from './types.js';

export class CandleAggregator {
  private current1m: Record<string, Candle> = {};
  private current5m: Record<string, Candle> = {};

  public on1mComplete?: (candle: Candle) => void;
  public on5mComplete?: (candle: Candle) => void;

  public processTick(tick: MarketTick) {
    // Normalize to 1m boundary
    const min1Date = new Date(tick.timestamp);
    min1Date.setSeconds(0, 0);
    const end1mDate = new Date(min1Date.getTime() + 60000);

    // Normalize to 5m boundary
    const min5Date = new Date(tick.timestamp);
    min5Date.setMinutes(Math.floor(min5Date.getMinutes() / 5) * 5, 0, 0);
    const end5mDate = new Date(min5Date.getTime() + 5 * 60000);

    this.updateCandle(this.current1m, '1m', min1Date, end1mDate, tick, this.on1mComplete);
    this.updateCandle(this.current5m, '5m', min5Date, end5mDate, tick, this.on5mComplete);
  }

  private updateCandle(
    store: Record<string, Candle>,
    timeframe: '1m' | '5m',
    startTime: Date,
    endTime: Date,
    tick: MarketTick,
    onComplete?: (candle: Candle) => void
  ) {
    const symbol = tick.symbol;
    const existing = store[symbol];
    const tsKey = startTime.getTime();
    
    // Check if the tick timestamp belongs to an older/newer candle boundary
    if (existing && existing.startTime.getTime() !== tsKey) {
      // Only complete if we've moved forward in time
      if (tsKey > existing.startTime.getTime()) {
        existing.isComplete = true;
        if (onComplete) {
          onComplete({ ...existing });
        }
        store[symbol] = this.createNewCandle(timeframe, startTime, endTime, tick);
      } else {
        // Late tick from a past interval, discard or handle differently.
        // For now, we drop late ticks outside the current forming candle.
        return;
      }
    } else if (!existing) {
      store[symbol] = this.createNewCandle(timeframe, startTime, endTime, tick);
    } else {
      // Update existing candle
      existing.high = Math.max(existing.high, tick.ltp);
      existing.low = Math.min(existing.low, tick.ltp);
      existing.close = tick.ltp;
      if (tick.volume) {
        existing.volume += tick.volume;
      }
    }
  }

  private createNewCandle(timeframe: '1m' | '5m', startTime: Date, endTime: Date, tick: MarketTick): Candle {
    return {
      symbol: tick.symbol,
      instrumentToken: tick.instrumentToken,
      timeframe,
      open: tick.ltp,
      high: tick.ltp,
      low: tick.ltp,
      close: tick.ltp,
      volume: tick.volume || 0,
      startTime,
      endTime,
      isComplete: false
    };
  }
}
