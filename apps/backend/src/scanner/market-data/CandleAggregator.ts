import { MarketTick, Candle } from './types.js';

export class CandleAggregator {
  private current1m: Record<string, Candle> = {};
  private current5m: Record<string, Candle> = {};
  /** Last cumulative day volume seen per symbol (Quote mode `vol_traded`). */
  private lastCumulativeVolume = new Map<string, number>();

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

    const volume = this.volumeDelta(tick);
    this.updateCandle(this.current1m, '1m', min1Date, end1mDate, tick, volume, this.on1mComplete);
    this.updateCandle(this.current5m, '5m', min5Date, end5mDate, tick, volume, this.on5mComplete);
  }

  /**
   * Volume this tick adds to its candle (spec 0009 AC-14). With cumulative day volume the
   * first sighting only sets the starting point, and a drop counts as 0 and resets it.
   */
  private volumeDelta(tick: MarketTick): number {
    if (tick.cumulativeVolume === undefined) return tick.volume || 0;
    const previous = this.lastCumulativeVolume.get(tick.symbol);
    this.lastCumulativeVolume.set(tick.symbol, tick.cumulativeVolume);
    if (previous === undefined) return 0;
    return Math.max(0, tick.cumulativeVolume - previous);
  }

  /** Forget volume starting points, e.g. after a feed reconnect, so a gap is not dumped into one candle. */
  public resetVolumeBaselines() {
    this.lastCumulativeVolume.clear();
  }

  /** Drop all forming candles and volume state (daily reset). */
  public reset() {
    this.current1m = {};
    this.current5m = {};
    this.lastCumulativeVolume.clear();
  }

  private updateCandle(
    store: Record<string, Candle>,
    timeframe: '1m' | '5m',
    startTime: Date,
    endTime: Date,
    tick: MarketTick,
    volume: number,
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
        store[symbol] = this.createNewCandle(timeframe, startTime, endTime, tick, volume);
      } else {
        // Late tick from a past interval, discard or handle differently.
        // For now, we drop late ticks outside the current forming candle.
        return;
      }
    } else if (!existing) {
      store[symbol] = this.createNewCandle(timeframe, startTime, endTime, tick, volume);
    } else {
      // Update existing candle
      existing.high = Math.max(existing.high, tick.ltp);
      existing.low = Math.min(existing.low, tick.ltp);
      existing.close = tick.ltp;
      existing.volume += volume;
    }
  }

  private createNewCandle(timeframe: '1m' | '5m', startTime: Date, endTime: Date, tick: MarketTick, volume: number): Candle {
    return {
      symbol: tick.symbol,
      instrumentToken: tick.instrumentToken,
      timeframe,
      open: tick.ltp,
      high: tick.ltp,
      low: tick.ltp,
      close: tick.ltp,
      volume,
      startTime,
      endTime,
      isComplete: false
    };
  }
}
