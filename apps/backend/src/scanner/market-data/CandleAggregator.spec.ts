import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CandleAggregator } from './CandleAggregator.js';
import { MarketTick, Candle } from './types.js';

describe('CandleAggregator', () => {
  let aggregator: CandleAggregator;
  let min1Callback: ReturnType<typeof vi.fn>;
  let min5Callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    aggregator = new CandleAggregator();
    min1Callback = vi.fn();
    min5Callback = vi.fn();
    aggregator.on1mComplete = min1Callback;
    aggregator.on5mComplete = min5Callback;
  });

  const createTick = (ltp: number, timeStr: string, vol: number = 0): MarketTick => ({
    instrumentToken: '26000',
    exchange: 'NSE',
    symbol: 'NIFTY 50',
    ltp,
    timestamp: new Date(timeStr),
    volume: vol,
    rawTimestamp: new Date(timeStr).getTime()
  });

  it('creates and updates a new 1m candle (covers AC-4)', () => {
    // Tick at 10:00:15
    aggregator.processTick(createTick(100, '2023-10-31T10:00:15Z', 10));
    // Tick at 10:00:45
    aggregator.processTick(createTick(110, '2023-10-31T10:00:45Z', 5));
    // Tick at 10:00:55
    aggregator.processTick(createTick(90, '2023-10-31T10:00:55Z', 5));

    // Candle should not be complete yet
    expect(min1Callback).not.toHaveBeenCalled();

    // Trigger complete by sending a tick in the next minute
    aggregator.processTick(createTick(105, '2023-10-31T10:01:05Z', 10));

    expect(min1Callback).toHaveBeenCalledTimes(1);
    
    const completedCandle: Candle = min1Callback.mock.calls[0][0];
    expect(completedCandle.symbol).toBe('NIFTY 50');
    expect(completedCandle.open).toBe(100);
    expect(completedCandle.high).toBe(110);
    expect(completedCandle.low).toBe(90);
    expect(completedCandle.close).toBe(90); // Last tick of the previous minute
    expect(completedCandle.volume).toBe(20); // 10 + 5 + 5
    expect(completedCandle.isComplete).toBe(true);
  });

  it('creates and updates a new 5m candle (covers AC-4)', () => {
    aggregator.processTick(createTick(100, '2023-10-31T10:01:15Z', 10));
    aggregator.processTick(createTick(110, '2023-10-31T10:03:45Z', 5));
    aggregator.processTick(createTick(90, '2023-10-31T10:04:55Z', 5));

    expect(min5Callback).not.toHaveBeenCalled();

    // Next 5m boundary
    aggregator.processTick(createTick(105, '2023-10-31T10:05:05Z', 10));

    expect(min5Callback).toHaveBeenCalledTimes(1);
    const completedCandle: Candle = min5Callback.mock.calls[0][0];
    expect(completedCandle.open).toBe(100);
    expect(completedCandle.high).toBe(110);
    expect(completedCandle.low).toBe(90);
    expect(completedCandle.close).toBe(90);
    expect(completedCandle.timeframe).toBe('5m');
  });

  it('ignores late ticks that fall outside the current forming candle boundary', () => {
    aggregator.processTick(createTick(100, '2023-10-31T10:01:15Z'));
    // Next minute boundary tick completes the first minute candle
    aggregator.processTick(createTick(110, '2023-10-31T10:02:15Z'));
    
    expect(min1Callback).toHaveBeenCalledTimes(1);

    // Late tick from 10:01
    aggregator.processTick(createTick(50, '2023-10-31T10:01:50Z'));
    
    // Trigger next minute
    aggregator.processTick(createTick(120, '2023-10-31T10:03:15Z'));

    const completedCandle: Candle = min1Callback.mock.calls[1][0];
    expect(completedCandle.low).not.toBe(50); // The late tick should have been dropped
    expect(completedCandle.open).toBe(110);
  });
});
