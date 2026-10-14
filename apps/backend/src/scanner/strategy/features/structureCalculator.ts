import { StrategyConfig } from '../config/strategyConfig.js';
import { Candle } from '../market/candleTypes.js';
import { StructureFeature } from './featureTypes.js';

export function calculateStructure(
  config: StrategyConfig,
  historical5mCandles: Candle[]
): StructureFeature {
  const lookback = config.structure.lookback_5m;
  const method = config.structure.reference_method;

  if (lookback === null || !method || historical5mCandles.length < lookback) {
    return {
      referenceHigh: null,
      referenceLow: null,
      rangeWidth: null,
      rangeWidthBps: null,
      structureQuality: null,
      directionContext: "UNAVAILABLE",
    };
  }

  const recentCandles = historical5mCandles.slice(-lookback);

  let referenceHigh = -Infinity;
  let referenceLow = Infinity;

  // e.g., "SWING_HIGH_LOW" or "RECENT_EXTREMES"
  for (const c of recentCandles) {
    if (c.high > referenceHigh) referenceHigh = c.high;
    if (c.low < referenceLow) referenceLow = c.low;
  }

  const rangeWidth = referenceHigh - referenceLow;
  const rangeWidthBps = referenceLow > 0 ? (rangeWidth / referenceLow) * 10000 : 0;

  // E.g., basic quality metric: number of touches, or just a placeholder for now
  const structureQuality = 50; // out of 100

  // Direction context could be based on where the current close is relative to the range
  const lastClose = recentCandles[recentCandles.length - 1].close;
  const midPoint = (referenceHigh + referenceLow) / 2;

  let directionContext: StructureFeature["directionContext"] = "MIXED";
  if (lastClose > midPoint + (rangeWidth * 0.2)) {
    directionContext = "BULLISH";
  } else if (lastClose < midPoint - (rangeWidth * 0.2)) {
    directionContext = "BEARISH";
  }

  return {
    referenceHigh,
    referenceLow,
    rangeWidth,
    rangeWidthBps,
    structureQuality,
    directionContext,
  };
}
