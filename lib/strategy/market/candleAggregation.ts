import { Candle } from "./candleTypes";

/**
 * Aggregates an array of 1-minute candles into a single 5-minute candle.
 * Expected input: 1 to 5 sequential 1-minute candles for the same symbol.
 * Throws if the candles array is empty or if timeframes are not 1m.
 */
export function aggregateTo5m(oneMinuteCandles: Candle[]): Candle {
  if (oneMinuteCandles.length === 0) {
    throw new Error("Cannot aggregate empty candle array");
  }

  const symbol = oneMinuteCandles[0].symbol;
  let maxHigh = -Infinity;
  let minLow = Infinity;
  let totalVolume = 0;

  for (const candle of oneMinuteCandles) {
    if (candle.timeframe !== "1m") {
      throw new Error(`Expected 1m candle, got ${candle.timeframe}`);
    }
    if (candle.symbol !== symbol) {
      throw new Error(`Symbol mismatch in aggregation: expected ${symbol}, got ${candle.symbol}`);
    }

    if (candle.high > maxHigh) maxHigh = candle.high;
    if (candle.low < minLow) minLow = candle.low;
    totalVolume += candle.volume;
  }

  const firstCandle = oneMinuteCandles[0];
  const lastCandle = oneMinuteCandles[oneMinuteCandles.length - 1];

  // A 5-minute bucket is complete if it has exactly 5 1-minute candles 
  // (Assuming no market gaps that omit candles completely, but standard definition applies)
  // For safety, we rely on the final candle's completeness and having 5 elements.
  const isComplete = oneMinuteCandles.length === 5 && lastCandle.isComplete;

  return {
    symbol,
    exchange: "NSE",
    timeframe: "5m",
    // We use the timestamp of the first candle to denote the start of the 5m bucket
    timestamp: firstCandle.timestamp,
    open: firstCandle.open,
    high: maxHigh,
    low: minLow,
    close: lastCandle.close,
    volume: totalVolume,
    isComplete,
  };
}
