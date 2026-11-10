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
  /** null when the real NIFTY change is unknown (spec 0026). */
  alphaVsNifty: number | null;
  leaderSymbol: string;
  leaderChangePct: number;
  advances: number;
  declines: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

/** spec 0026: where the market values came from. */
export type MarketContextSource = 'LIVE' | 'LAST_KNOWN' | 'NONE';

/** spec 0026 AC-8: real state for the Data Provenance Registry. */
export interface ProvenanceContract {
  feed: { status: string; lastTickAt: string | null; latencyMs: number | null };
  news: { status: string; finishedAt: string | null } | null;
  institutional: { connected: false };
}

/**
 * spec 0026: every market value is real or null. `source` says whether it is live, the last
 * real reading of today (`asOf` is its time), or missing (`NONE`, all values null).
 */
export interface MarketContextContract {
  source: MarketContextSource;
  asOf: string | null;
  regime: MarketRegimeType | null;
  regimeLabel: string | null;
  regimeDescription: string | null;
  regimeConfidence: number | null;
  niftyLtp: number | null;
  niftyChangePct: number | null;
  vixLtp: number | null;
  vixChangePct: number | null;
  vixDayLow: number | null;
  vixDayHigh: number | null;
  vixStatus: 'LOW_NORMAL' | 'ELEVATED' | 'EXTREME_VOLATILE' | null;
  advanceCount: number | null;
  declineCount: number | null;
  unchangedCount: number | null;
  advanceDeclineRatio: number | null;
  pctAboveVwap: number | null;
  medianDayChange: number | null;
  sectors: SectorMetricContract[];
  snapshotTime: string;
  feedLatencyMs: number | null;
  feedHealth: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  provenance: ProvenanceContract;
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
  /** Spec 0024 AC-6: how impact and direction were decided. */
  classifiedBy: 'rules' | 'gemini' | 'default';
  /** Spec 0024 AC-4: market wide macro item (symbol `MARKET`). */
  isMacro: boolean;
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
  /** null when no institutional source has written a row (spec 0026 AC-7). */
  flows: InstitutionalFlowContract | null;
  recentDeals: BulkBlockDealContract[];
  disclaimer: string;
  /** spec 0026: false until a real source writes flows or deals. */
  connected: boolean;
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
  marketRegime: MarketRegimeType | null;
  /** null when the symbol has no sector with live ticks (spec 0026 AC-10). */
  sectorRelativeStrength: number | null;
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
