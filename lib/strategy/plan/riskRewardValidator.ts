import { StrategyConfig } from "../config/strategyConfig";
import { TradePlan, RiskRewardMetrics } from "./planTypes";

export function validateRiskReward(
  config: StrategyConfig,
  plan: TradePlan
): RiskRewardMetrics {
  const reasons: string[] = [];
  let valid = true;

  const { direction, entryZone, stop, targets } = plan;
  const refEntry = entryZone.referenceEntry;

  // 1. Order Validation
  if (config.risk_reward.require_valid_ordering) {
    if (direction === "LONG") {
      if (!(stop.price < refEntry && (targets.t1 === null || refEntry < targets.t1))) {
        valid = false;
        reasons.push("INVALID_ORDERING_LONG");
      }
    } else {
      if (!(stop.price > refEntry && (targets.t1 === null || refEntry > targets.t1))) {
        valid = false;
        reasons.push("INVALID_ORDERING_SHORT");
      }
    }
  }

  // 2. Stop Distance limits
  if (config.stop.minimum_distance_bps !== null && stop.distanceBps < config.stop.minimum_distance_bps) {
    if (config.stop.reject_if_risk_too_small) {
      valid = false;
      reasons.push("RISK_TOO_SMALL");
    }
  }
  if (config.stop.maximum_distance_bps !== null && stop.distanceBps > config.stop.maximum_distance_bps) {
    if (config.stop.reject_if_risk_too_large) {
      valid = false;
      reasons.push("RISK_TOO_LARGE");
    }
  }

  // 3. Risk Reward Ratio
  const riskPerShare = Math.abs(refEntry - stop.price);
  
  let rewardToTarget1 = null;
  let riskRewardRatio = null;
  
  if (targets.t1 !== null) {
    rewardToTarget1 = Math.abs(targets.t1 - refEntry);
    if (riskPerShare > 0) {
      riskRewardRatio = rewardToTarget1 / riskPerShare;
    }
  }

  if (config.risk_reward.minimum_ratio !== null && riskRewardRatio !== null) {
    if (riskRewardRatio < config.risk_reward.minimum_ratio) {
      valid = false;
      reasons.push("INSUFFICIENT_RR_RATIO");
    }
  }

  return {
    valid,
    riskPerShare,
    rewardToTarget1,
    riskRewardRatio,
    rejectionReasons: reasons,
  };
}
