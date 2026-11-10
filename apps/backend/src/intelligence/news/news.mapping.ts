// Spec 0024: one place that turns a stored `news_and_events` row into the API contract.
import type { NewsFilingItemContract } from '../contracts/intelligence.contract.js';
import { MARKET_SYMBOL } from './news.types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToNewsItem(row: any): NewsFilingItemContract {
  const published = new Date(row.published_at).getTime();
  const ingested = new Date(row.ingested_at).getTime();
  return {
    id: row.id,
    symbol: row.symbol,
    headline: row.headline,
    excerpt: row.excerpt || '',
    source: row.source,
    sourceUrl: row.source_url ?? undefined,
    publishedAt: row.published_at,
    ingestedAt: row.ingested_at,
    clockSkewMs: Number.isFinite(ingested - published) ? Math.max(0, ingested - published) : 0,
    eventType: row.event_type,
    impactLevel: row.impact_level,
    direction: row.direction,
    confidence: Number(row.confidence) || 0,
    isOfficialFiling: row.is_official_filing,
    classifiedBy: row.classified_by ?? 'default',
    isMacro: row.symbol === MARKET_SYMBOL,
  };
}
