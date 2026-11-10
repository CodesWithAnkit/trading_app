// Spec 0024: shared types for real news ingestion.

export type NewsSourceKey = 'nse' | 'bse' | 'rss' | 'alphavantage';

/** What every source adapter returns, before symbol mapping and classification. */
export type RawNewsItem = {
  sourceKey: NewsSourceKey;
  /** Stored `source` column: `NSE`, `BSE`, the feed publisher, or `Alpha Vantage · <publisher>`. */
  source: string;
  sourceItemId: string;
  /** Exchange symbol (NSE), scrip code (BSE), or ticker hints (Alpha Vantage). */
  symbolHint?: string;
  tickerHints?: string[];
  companyName?: string;
  headline: string;
  /** HTML stripped body text, not yet truncated. */
  text: string;
  category?: string;
  url?: string;
  publishedAt: string;
  isOfficialFiling: boolean;
};

export type Impact = 'HIGH' | 'MEDIUM' | 'LOW';
export type Direction = 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
export type EventType = 'OFFICIAL_FILING' | 'EARNINGS' | 'GENERAL_NEWS' | 'MACRO';
export type ClassifiedBy = 'rules' | 'gemini' | 'default';

export type Classification = {
  eventType: EventType;
  impactLevel: Impact;
  direction: Direction;
  confidence: number;
  classifiedBy: ClassifiedBy;
  rulesVersion: string | null;
};

export type SourceResult = { fetched: number; kept: number; new: number; error: string | null; skipped?: string };

export type RunStatus = 'running' | 'done' | 'partial' | 'failed' | 'cancelled';

export type FetchRunContract = {
  id: string;
  trigger: 'manual' | 'schedule';
  startedAt: string;
  finishedAt: string | null;
  status: RunStatus;
  perSource: Partial<Record<NewsSourceKey, SourceResult>>;
  geminiCalls: number;
};

export const MARKET_SYMBOL = 'MARKET';
export const EXCERPT_LIMIT = 400;
export const RAW_EXCERPT_LIMIT = 2000;
