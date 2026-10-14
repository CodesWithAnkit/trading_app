import { StrategyConfigSchema, StrategyConfig } from './strategyConfig.js';
import crypto from "crypto";

export function validateStrategyConfig(data: unknown): StrategyConfig {
  return StrategyConfigSchema.parse(data);
}

/**
 * Produces a deterministic hash of the strategy configuration.
 * Excludes metadata that doesn't affect signal logic.
 */
export function hashStrategyConfig(config: StrategyConfig): string {
  // We can hash the entire config, but status and effective_from shouldn't change the strategy's deterministic output for the same version
  const configToHash = {
    ...config,
    strategy: {
      id: config.strategy.id,
      version: config.strategy.version,
      strategy_version: config.strategy.strategy_version,
      configuration_version: config.strategy.configuration_version,
    }
  };

  const configString = JSON.stringify(configToHash, Object.keys(configToHash).sort());
  return crypto.createHash("sha256").update(configString).digest("hex");
}
