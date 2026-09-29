import { StrategyConfig } from '../config/strategyConfig.js';
import { hashStrategyConfig } from '../config/configValidation.js';
import { TradePlan, RiskRewardMetrics } from '../plan/planTypes.js';
import { ConfidenceScore } from '../plan/confidenceTypes.js';
import { EligibilityResult } from '../eligibility/eligibilityTypes.js';
import { StructureFeature, RvolFeature, TrendFeature } from '../features/featureTypes.js';

export type SignalLifecycleState = "CANDIDATE" | "ACTIVE" | "INVALIDATED" | "EXPIRED" | "SKIPPED" | "ENTERED";

export type SignalSnapshot = {
  // Identity
  strategyVersion: string;
  configurationVersion: number;
  configurationHash: string;
  
  // Target
  symbol: string;
  exchange: string;
  direction: "LONG" | "SHORT";
  setupFamily: string;
  
  // Lifecycle
  createdAt: string;
  expiresAt: string;
  state: SignalLifecycleState;
  
  // Market Context
  currentPrice: number;
  
  // Execution Plan
  entryZone: TradePlan["entryZone"];
  referenceEntry: number;
  stop: TradePlan["stop"];
  targets: TradePlan["targets"];
  trailing: TradePlan["trailing"];
  
  // Features & Validation
  rawFeatures: {
    structure: StructureFeature;
    rvol: RvolFeature;
    trend: TrendFeature;
  };
  
  confidence: number;
  confidenceBand: string;
  confidenceComponents: ConfidenceScore["components"];
  
  eligibilityResult: EligibilityResult;
  riskRewardMetrics: RiskRewardMetrics;
};

export function buildSignalSnapshot(
  config: StrategyConfig,
  symbol: string,
  exchange: string,
  currentPrice: number,
  timestamp: string,
  setupFamily: string,
  plan: TradePlan,
  structure: StructureFeature,
  rvol: RvolFeature,
  trend: TrendFeature,
  confidence: ConfidenceScore,
  eligibilityResult: EligibilityResult,
  riskRewardMetrics: RiskRewardMetrics
): SignalSnapshot {
  
  const createdAt = new Date(timestamp);
  // signal lifetime must never exceed 30 minutes
  const expiresAt = new Date(createdAt.getTime() + 30 * 60000).toISOString();
  
  return {
    strategyVersion: config.strategy.strategy_version,
    configurationVersion: config.strategy.configuration_version,
    configurationHash: hashStrategyConfig(config),
    
    symbol,
    exchange,
    direction: plan.direction,
    setupFamily,
    
    createdAt: timestamp,
    expiresAt,
    state: "ACTIVE", // Or CANDIDATE initially, then transitions
    
    currentPrice,
    
    entryZone: plan.entryZone,
    referenceEntry: plan.entryZone.referenceEntry,
    stop: plan.stop,
    targets: plan.targets,
    trailing: plan.trailing,
    
    rawFeatures: {
      structure,
      rvol,
      trend,
    },
    
    confidence: confidence.score,
    confidenceBand: confidence.band,
    confidenceComponents: confidence.components,
    
    eligibilityResult,
    riskRewardMetrics,
  };
}
