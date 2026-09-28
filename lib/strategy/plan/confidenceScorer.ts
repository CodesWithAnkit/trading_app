import { StrategyConfig } from "../config/strategyConfig";
import { ConfidenceScore } from "./confidenceTypes";

export function calculateConfidence(
  config: StrategyConfig,
  components: ConfidenceScore["components"]
): ConfidenceScore {
  const { components: weightsConfig, quality_bands, enabled } = config.confidence;

  const weights = {
    setupQuality: weightsConfig.setup_quality.weight,
    relativeVolume: weightsConfig.relative_volume.weight,
    trendAlignment: weightsConfig.trend_alignment.weight,
    volatility: weightsConfig.volatility.weight,
    liquidity: weightsConfig.liquidity.weight,
    riskReward: weightsConfig.risk_reward.weight,
  };

  if (!enabled) {
    return {
      score: 0,
      band: "LOW",
      components,
      weights,
    };
  }

  // Validate weights sum to 1.0 (with small floating point tolerance)
  const weightValues = Object.values(weights);
  if (weightValues.some((w) => w === null)) {
    return {
      score: 0,
      band: "INVALID_CONFIG",
      components,
      weights,
    };
  }

  const sum = weightValues.reduce((acc, w) => acc! + (w as number), 0) as number;
  if (Math.abs(sum - 1.0) > 0.001) {
    return {
      score: 0,
      band: "INVALID_CONFIG",
      components,
      weights,
    };
  }

  // Score = Σ(componentScore × configuredWeight)
  const score = Math.round(
    components.setupQuality * (weights.setupQuality as number) +
    components.relativeVolume * (weights.relativeVolume as number) +
    components.trendAlignment * (weights.trendAlignment as number) +
    components.volatility * (weights.volatility as number) +
    components.liquidity * (weights.liquidity as number) +
    components.riskReward * (weights.riskReward as number)
  );

  let band: ConfidenceScore["band"] = "LOW";
  if (score >= quality_bands.high.min && score <= quality_bands.high.max) {
    band = "HIGH";
  } else if (score >= quality_bands.medium.min && score <= quality_bands.medium.max) {
    band = "MEDIUM";
  }

  return {
    score,
    band,
    components,
    weights,
  };
}
