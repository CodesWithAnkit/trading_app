import { StrategyConfig } from "../config/strategyConfig";
import { Candle } from "../market/candleTypes";
import { RvolFeature } from "./featureTypes";

export function calculateRvol(
  config: StrategyConfig,
  currentCandle: Candle,
  historicalCandles: Candle[]
): RvolFeature {
  if (!config.volume.enabled) {
    return {
      currentVolume: currentCandle.volume,
      baselineVolume: null,
      rvol: null,
      baselineMethod: "DISABLED",
      comparablePeriod: null,
    };
  }

  const { lookback_periods, comparison_method, time_of_day_adjusted } = config.volume.rvol;

  if (lookback_periods === null || comparison_method === null) {
    return {
      currentVolume: currentCandle.volume,
      baselineVolume: null,
      rvol: null,
      baselineMethod: "UNCONFIGURED",
      comparablePeriod: null,
    };
  }

  // Filter historical candles for comparable time-of-day if enabled
  let comparableCandles = historicalCandles;
  
  if (time_of_day_adjusted) {
    const targetDate = new Date(currentCandle.timestamp);
    const targetMinutes = targetDate.getUTCHours() * 60 + targetDate.getUTCMinutes();
    
    comparableCandles = historicalCandles.filter(c => {
      const d = new Date(c.timestamp);
      return (d.getUTCHours() * 60 + d.getUTCMinutes()) === targetMinutes;
    });
  }

  // Take the most recent 'lookback_periods' candles
  const recentComparable = comparableCandles.slice(-lookback_periods);

  if (recentComparable.length < lookback_periods) {
    return {
      currentVolume: currentCandle.volume,
      baselineVolume: null,
      rvol: null,
      baselineMethod: comparison_method,
      comparablePeriod: time_of_day_adjusted ? "TIME_OF_DAY" : "ROLLING",
    };
  }

  const volumes = recentComparable.map(c => c.volume);
  volumes.sort((a, b) => a - b);

  let baselineVolume = 0;
  if (comparison_method === "MEDIAN") {
    const mid = Math.floor(volumes.length / 2);
    baselineVolume = volumes.length % 2 !== 0 
      ? volumes[mid] 
      : (volumes[mid - 1] + volumes[mid]) / 2;
  } else if (comparison_method === "MEAN") {
    baselineVolume = volumes.reduce((acc, val) => acc + val, 0) / volumes.length;
  }

  const rvol = baselineVolume > 0 ? currentCandle.volume / baselineVolume : null;

  return {
    currentVolume: currentCandle.volume,
    baselineVolume,
    rvol,
    baselineMethod: comparison_method,
    comparablePeriod: time_of_day_adjusted ? "TIME_OF_DAY" : "ROLLING",
  };
}
