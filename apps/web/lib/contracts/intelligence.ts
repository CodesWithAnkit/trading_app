// Canonical shared contract types for Market Intelligence and Tactical Terminal
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
  alphaVsNifty: number | null;
  leaderSymbol: string;
  leaderChangePct: number;
  advances: number;
  declines: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

/** spec 0026: where the market values came from. */
export type MarketContextSource = "LIVE" | "LAST_KNOWN" | "NONE";

/** spec 0026 AC-8: real state for the Data Provenance Registry. */
export interface ProvenanceContract {
  feed: { status: string; lastTickAt: string | null; latencyMs: number | null };
  news: { status: string; finishedAt: string | null } | null;
  institutional: { connected: false };
}

/** spec 0026: every market value is real or null; `asOf` is the time of a last known reading. */
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
  vixStatus: "LOW_NORMAL" | "ELEVATED" | "EXTREME_VOLATILE" | null;
  advanceCount: number | null;
  declineCount: number | null;
  unchangedCount: number | null;
  advanceDeclineRatio: number | null;
  pctAboveVwap: number | null;
  medianDayChange: number | null;
  sectors: SectorMetricContract[];
  snapshotTime: string;
  feedLatencyMs: number | null;
  feedHealth: "HEALTHY" | "DEGRADED" | "DISCONNECTED";
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

/** Spec 0024: one news source's result within a fetch run. */
export interface NewsSourceResultContract {
  /** Absent on runs stored before the news sources change. */
  status?: 'ok' | 'skipped' | 'error';
  fetched: number;
  kept: number;
  new: number;
  error: string | null;
  skipped?: string | null;
  feeds?: Array<{ url: string; status: 'ok' | 'skipped' | 'error'; reason: string | null }>;
}

/** Spec 0024 AC-11: whether the scheduled fetch is paused. */
export interface NewsScheduleContract {
  paused: boolean;
  pausedAt: string | null;
}

/** Spec 0024 AC-8: a news fetch run (manual or scheduled). */
export interface NewsFetchRunContract {
  id: string;
  trigger: 'manual' | 'schedule';
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'done' | 'partial' | 'failed' | 'cancelled';
  perSource: Partial<Record<'nse' | 'bse' | 'rss' | 'alphavantage', NewsSourceResultContract>>;
  geminiCalls: number;
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
  /** null until a real source writes a row (spec 0026 AC-7). */
  flows: InstitutionalFlowContract | null;
  recentDeals: BulkBlockDealContract[];
  disclaimer: string;
  /** spec 0026: false until a real institutional source is connected. */
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
