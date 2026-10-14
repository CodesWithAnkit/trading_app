import { StrategyConfig } from '../config/strategyConfig.js';
import { Candle } from '../market/candleTypes.js';
import { TrendFeature, TrendState } from './featureTypes.js';

// Placeholder for EMA calculation if method is EMA, etc.
function calculateSMA(candles: Candle[], periods: number): number | null {
  if (candles.length < periods) return null;
  const slice = candles.slice(-periods);
  const sum = slice.reduce((acc, c) => acc + c.close, 0);
  return sum / periods;
}

export function calculateTrend(
  config: StrategyConfig,
  current5mCandle: Candle,
  historical5mCandles: Candle[],
  current1mCandle: Candle,
  historical1mCandles: Candle[]
): TrendFeature {
  const method = config.trend.method;
  if (!method) {
    return {
      state: "UNAVAILABLE",
      primaryContext: "UNCONFIGURED",
      secondaryContext: "UNCONFIGURED"
    };
  }

  // A basic implementation based on a 20-period SMA for primary and 20-period for secondary.
  // In a real scenario, the exact method would be driven by the "method" string (e.g., "EMA_CROSS", "PRICE_VS_SMA20")
  
  // Here we use PRICE_VS_SMA20 as a deterministic default if the method is something like that.
  const primarySma = calculateSMA(historical5mCandles, 20);
  const secondarySma = calculateSMA(historical1mCandles, 20);

  if (primarySma === null || secondarySma === null) {
    return {
      state: "UNAVAILABLE",
      primaryContext: "INSUFFICIENT_DATA",
      secondaryContext: "INSUFFICIENT_DATA"
    };
  }

  const primaryBullish = current5mCandle.close > primarySma;
  const secondaryBullish = current1mCandle.close > secondarySma;

  let state: TrendState = "MIXED";
  if (primaryBullish && secondaryBullish) {
    state = "BULLISH";
  } else if (!primaryBullish && !secondaryBullish) {
    state = "BEARISH";
  } else {
    // Contradictory higher-timeframe context
    // If primary is Bearish but secondary is Bullish, or vice versa
    state = "CONTRADICTORY";
  }

  return {
    state,
    primaryContext: primaryBullish ? "ABOVE_SMA" : "BELOW_SMA",
    secondaryContext: secondaryBullish ? "ABOVE_SMA" : "BELOW_SMA"
  };
}
