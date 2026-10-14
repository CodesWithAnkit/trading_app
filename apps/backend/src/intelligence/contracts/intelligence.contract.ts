// Canonical backend contract types for Market Intelligence and Tactical Terminal
// Spec 0017 and Spec 0018

export type MarketRegimeType =
  | 'BULLISH_TREND_DAY'
  | 'BEARISH_TREND_DAY'
  | 'RANGE_BOUND_CONGESTED'
  | 'VOLATILE_DISLOCATED'
  | 'UNCLEAR';

export interface SectorMetricContract {
  name: string;
  ltp: number;
  changePct: number;
  alphaVsNifty: number;
  leaderSymbol: string;
  leaderChangePct: number;
  advances: number;
  declines: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export interface MarketContextContract {
  regime: MarketRegimeType;
  regimeLabel: string;
  regimeDescription: string;
  regimeConfidence: number;
  niftyLtp: number;
  niftyChangePct: number;
  vixLtp: number;
  vixChangePct: number;
  vixStatus: 'LOW_NORMAL' | 'ELEVATED' | 'EXTREME_VOLATILE';
  advanceCount: number;
  declineCount: number;
  unchangedCount: number;
  advanceDeclineRatio: number;
  pctAboveVwap: number;
  medianDayChange: number;
  sectors: SectorMetricContract[];
  snapshotTime: string;
  feedLatencyMs: number;
  feedHealth: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
}

export interface NewsFilingItemContract {
  id: string;
  symbol: string;
  headline: string;
  excerpt: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  ingestedAt: string;
  clockSkewMs: number;
  eventType: 'OFFICIAL_FILING' | 'EARNINGS' | 'GENERAL_NEWS' | 'MACRO';
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  direction: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
  confidence: number;
  isOfficialFiling: boolean;
  extractedKeyTerms?: string[];
  sentimentInterpretation?: string;
}

export interface NewsFilingsResponseContract {
  events: NewsFilingItemContract[];
  totalCount: number;
  officialCount: number;
  highImpactCount: number;
  lastIngestionAt: string;
}

export interface InstitutionalFlowContract {
  reportDate: string;
  fiiGrossBuyCr: number;
  fiiGrossSellCr: number;
  fiiNetCr: number;
  diiGrossBuyCr: number;
  diiGrossSellCr: number;
  diiNetCr: number;
  reportingPeriod: 'PREVIOUS_DAY_EOD' | 'MONTHLY_CUMULATIVE';
  disclaimer: string;
}

export interface BulkBlockDealContract {
  id: string;
  dealDate: string;
  dealTime?: string;
  symbol: string;
  clientName: string;
  dealType: 'BULK' | 'BLOCK';
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  valueInCrores: number;
  source: string;
}

export interface InstitutionalContextContract {
  flows: InstitutionalFlowContract;
  recentDeals: BulkBlockDealContract[];
  disclaimer: string;
}

export interface RiskGateEvaluationContract {
  id: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  description: string;
  measuredValue?: string;
  thresholdValue?: string;
}

export interface EvidenceFactorContract {
  id: string;
  title: string;
  detail: string;
  timeframe: string;
  status: 'ACTIVE' | 'FORMING' | 'WATCH';
}

export interface ContradictoryFactorContract {
  id: string;
  title: string;
  friction: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TradePlanBlueprintContract {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2?: number;
  grossRewardRisk: number;
  netRewardRisk: number;
  estimatedCharges: number;
  suggestedQuantity: number;
  invalidationDescription: string;
}

export interface ExplainableAnalysisContract {
  symbol: string;
  setupName: string;
  timeframe: string;
  timestamp: string;
  marketRegime: MarketRegimeType;
  sectorRelativeStrength: number;
  qualificationStatus: 'QUALIFIED' | 'REJECTED' | 'OBSERVATION_ONLY';
  rejectionReason?: string;
  riskGates: RiskGateEvaluationContract[];
  positiveEvidence: {
    categoryA: EvidenceFactorContract[];
    categoryB: EvidenceFactorContract[];
    categoryC: EvidenceFactorContract[];
    categoryD: EvidenceFactorContract[];
  };
  contradictoryFactors: ContradictoryFactorContract[];
  tradePlan: TradePlanBlueprintContract;
  historicalContext: {
    sampleSize: number;
    winRate: number;
    profitFactor: number;
    isSampleSufficient: boolean;
    validationNote: string;
  };
  recentNews: NewsFilingItemContract[];
  ruleVersion: string;
  auditVerificationHash: string;
}
