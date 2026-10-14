import { StrategyConfig } from '../config/strategyConfig.js';
import { EligibilityResult, InstrumentContext } from './eligibilityTypes.js';

export function evaluateEligibility(
  config: StrategyConfig,
  context: InstrumentContext
): EligibilityResult {
  const reasons: string[] = [];
  const metrics: Record<string, number | null> = {
    price: context.currentPrice,
    avg1mVolume: context.avg1mVolume,
    avg5mVolume: context.avg5mVolume,
    avgTradedValue: context.avgTradedValue,
    spreadBps: context.currentSpreadBps,
    available1mCandles: context.available1mCandles,
    available5mCandles: context.available5mCandles,
  };

  const { eligibility, candles } = config;

  // 1. Fixed conditions
  if (eligibility.instrument_type !== context.instrumentType) {
    reasons.push(`Instrument type is ${context.instrumentType}, expected ${eligibility.instrument_type}`);
  }
  if (eligibility.require_active_status && !context.isActive) {
    reasons.push("Instrument is not active");
  }
  if (eligibility.exclude_suspended && context.isSuspended) {
    reasons.push("Instrument is suspended");
  }
  if (eligibility.exclude_cautionary && context.isCautionary) {
    reasons.push("Instrument is cautionary");
  }
  if (eligibility.exclude_unsuitable && context.isUnsuitable) {
    reasons.push("Instrument is unsuitable");
  }

  // 2. Data / configuration validation
  let isConfigIncomplete = false;
  let isDataInvalid = false;

  // Configuration completeness checks
  if (
    eligibility.min_price === null ||
    eligibility.min_avg_1m_volume === null ||
    eligibility.min_avg_5m_volume === null ||
    eligibility.min_avg_traded_value === null ||
    eligibility.max_allowed_spread_bps === null ||
    eligibility.min_required_1m_candles === null ||
    eligibility.min_required_5m_candles === null ||
    candles.required_history.one_minute === null ||
    candles.required_history.five_minute === null
  ) {
    isConfigIncomplete = true;
    reasons.push("Configuration for eligibility thresholds is incomplete (contains null)");
  }

  // Data completeness checks (if config was complete)
  if (!isConfigIncomplete) {
    if (context.currentPrice === null) {
      isDataInvalid = true;
      reasons.push("Current price is missing");
    } else if (context.currentPrice < (eligibility.min_price as number)) {
      reasons.push(`Price ${context.currentPrice} is below min ${eligibility.min_price}`);
    }

    if (context.avg1mVolume === null) {
      isDataInvalid = true;
      reasons.push("Average 1m volume is missing");
    } else if (context.avg1mVolume < (eligibility.min_avg_1m_volume as number)) {
      reasons.push(`Avg 1m volume ${context.avg1mVolume} is below min ${eligibility.min_avg_1m_volume}`);
    }

    if (context.avg5mVolume === null) {
      isDataInvalid = true;
      reasons.push("Average 5m volume is missing");
    } else if (context.avg5mVolume < (eligibility.min_avg_5m_volume as number)) {
      reasons.push(`Avg 5m volume ${context.avg5mVolume} is below min ${eligibility.min_avg_5m_volume}`);
    }

    if (context.avgTradedValue === null) {
      isDataInvalid = true;
      reasons.push("Average traded value is missing");
    } else if (context.avgTradedValue < (eligibility.min_avg_traded_value as number)) {
      reasons.push(`Avg traded value ${context.avgTradedValue} is below min ${eligibility.min_avg_traded_value}`);
    }

    if (context.currentSpreadBps === null) {
      isDataInvalid = true;
      reasons.push("Current spread is missing");
    } else if (context.currentSpreadBps > (eligibility.max_allowed_spread_bps as number)) {
      reasons.push(`Spread ${context.currentSpreadBps}bps is above max ${eligibility.max_allowed_spread_bps}bps`);
    }

    const req1m = Math.max(eligibility.min_required_1m_candles as number, candles.required_history.one_minute as number);
    if (context.available1mCandles < req1m) {
      reasons.push(`Available 1m candles ${context.available1mCandles} is below required ${req1m}`);
    }

    const req5m = Math.max(eligibility.min_required_5m_candles as number, candles.required_history.five_minute as number);
    if (context.available5mCandles < req5m) {
      reasons.push(`Available 5m candles ${context.available5mCandles} is below required ${req5m}`);
    }
  }

  // 3. Determine status
  let status: EligibilityResult["status"] = "ELIGIBLE";
  if (isConfigIncomplete) {
    status = "CONFIG_INCOMPLETE";
  } else if (isDataInvalid) {
    status = "DATA_INVALID";
  } else if (reasons.length > 0) {
    status = "INELIGIBLE";
  }

  return {
    eligible: status === "ELIGIBLE",
    status,
    reasons,
    metrics,
  };
}
