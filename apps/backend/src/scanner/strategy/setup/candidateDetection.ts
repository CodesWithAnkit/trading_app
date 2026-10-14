import { StrategyConfig } from '../config/strategyConfig.js';
import { Candle } from '../market/candleTypes.js';
import { StructureFeature, RvolFeature, TrendFeature } from '../features/featureTypes.js';
import { CandidateSetup } from './setupTypes.js';

export function detectCandidate(
  config: StrategyConfig,
  current1mCandle: Candle,
  structure: StructureFeature,
  rvol: RvolFeature,
  trend: TrendFeature
): CandidateSetup {
  const reasons: string[] = [];
  let setupFamily: CandidateSetup["setupFamily"] = "NONE";

  if (structure.referenceHigh === null || structure.referenceLow === null) {
    return { valid: false, setupFamily, rejectionReasons: ["INVALID_STRUCTURE"] };
  }

  const { breakout, breakdown, setups } = config;

  // Determine if price is crossing the reference levels (Breakout = LONG, Breakdown = SHORT)
  const isBreakout = current1mCandle.close > structure.referenceHigh;
  const isBreakdown = current1mCandle.close < structure.referenceLow;

  if (isBreakout && setups.enabled.includes("BREAKOUT_MOMENTUM") && setups.breakout.enabled) {
    setupFamily = "BREAKOUT_MOMENTUM";
  } else if (isBreakdown && setups.enabled.includes("BREAKDOWN_MOMENTUM") && setups.breakdown.enabled) {
    setupFamily = "BREAKDOWN_MOMENTUM";
  } else {
    return { valid: false, setupFamily, rejectionReasons: ["NO_ACCEPTANCE_BEYOND_REFERENCE"] };
  }

  // 1. Minimum acceptance distance check
  const activeConfig = setupFamily === "BREAKOUT_MOMENTUM" ? breakout : breakdown;
  if (activeConfig.minimum_acceptance_distance_bps !== null) {
    const refLevel = setupFamily === "BREAKOUT_MOMENTUM" ? structure.referenceHigh : structure.referenceLow;
    const distance = Math.abs(current1mCandle.close - refLevel);
    const bps = (distance / refLevel) * 10000;
    if (bps < activeConfig.minimum_acceptance_distance_bps) {
      reasons.push("INSUFFICIENT_ACCEPTANCE_DISTANCE");
    }
  }

  // 2. Volume confirmation
  if (activeConfig.require_volume_confirmation && config.volume.confirmation.required_for_signal) {
    if (rvol.rvol === null) {
      reasons.push("INSUFFICIENT_RVOL_DATA");
    } else if (
      config.volume.rvol.min_rvol !== null && 
      rvol.rvol < config.volume.rvol.min_rvol
    ) {
      reasons.push("INSUFFICIENT_RVOL");
    }
  }

  // 3. Trend compatibility
  if (setupFamily === "BREAKOUT_MOMENTUM") {
    if (!config.trend.long.allowed_states.includes(trend.state as any)) {
      reasons.push("INCOMPATIBLE_TREND_LONG");
    }
  } else {
    if (!config.trend.short.allowed_states.includes(trend.state as any)) {
      reasons.push("INCOMPATIBLE_TREND_SHORT");
    }
  }

  // 4. Immediate return into range / Late entry buffer could be checked here
  // based on candle wick or distance from reference.
  if (activeConfig.reject_immediate_range_return) {
    if (setupFamily === "BREAKOUT_MOMENTUM" && current1mCandle.close <= structure.referenceHigh) {
      reasons.push("RANGE_RETURN");
    }
    if (setupFamily === "BREAKDOWN_MOMENTUM" && current1mCandle.close >= structure.referenceLow) {
      reasons.push("RANGE_RETURN");
    }
  }

  return {
    valid: reasons.length === 0,
    setupFamily: reasons.length === 0 ? setupFamily : "NONE",
    rejectionReasons: reasons,
  };
}
