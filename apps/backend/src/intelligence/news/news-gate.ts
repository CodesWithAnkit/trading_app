// Spec 0025 cross child contract: the news gate rule `news-gate-v1`. One pure function used
// by the live signal path and the backtest comparison. No I/O and no clock reads: `at` and
// `lastGoodFetchAt` are always passed in. A rule change is `news-gate-v2`, never an edit here.
import { BOARD_MEETING_PATTERN } from './news.rules.js';
import { istDate, istMinutes } from './news.text.js';
import { MARKET_SYMBOL } from './news.types.js';

export const NEWS_GATE_VERSION = 'news-gate-v1';
export const GATE_WINDOW_MS = 60 * 60_000;
export const STALE_AFTER_MS = 15 * 60_000;
export const INDEX_SYMBOLS = new Set(['NIFTY', 'SENSEX']);
const MARKET_OPEN_MIN = 9 * 60 + 15;
const MARKET_CLOSE_MIN = 15 * 60 + 30;

export type GateSide = 'LONG' | 'SHORT' | null;
export type GateResult = 'pass' | 'warn' | 'block';

/** One stored news item, as the gate needs it (from `news_and_events`). */
export type GateItem = {
  id: string;
  symbol: string;
  headline: string;
  sourceUrl: string | null;
  publishedAt: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  direction: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
  classifiedBy: 'rules' | 'gemini' | 'default';
  eventType: string;
};

export type GateInput = {
  symbol: string;
  side: GateSide;
  at: Date;
  /** Latest `finished_at` of a `done` or `partial` fetch run at or before `at`. */
  lastGoodFetchAt: Date | null;
  /** After entry check only: count items published strictly after this instant. */
  after?: Date;
  /** Skip the staleness rule (the backtest judges entries without it, child spec step 6). */
  ignoreStaleness?: boolean;
};

/** Embedded on the signal; `symbol` lets the badge say "Market wide news" (spec 0025 AC-5). */
export type GateItemRef = { id: string; symbol: string; headline: string; sourceUrl: string | null; publishedAt: string };

export type GateVerdict = {
  result: GateResult;
  reason: string;
  itemIds: string[];
  items: GateItemRef[];
  /** True when every deciding item is a `MARKET` item (the badge reads "Market wide news"). */
  marketWideOnly: boolean;
  ruleVersion: typeof NEWS_GATE_VERSION;
};

export const isIndexSymbol = (symbol: string) => INDEX_SYMBOLS.has(symbol.toUpperCase());

/** Whether `at` falls in market hours, 09:15 to 15:30 IST. */
export function inMarketHours(at: Date): boolean {
  const m = istMinutes(at);
  return m >= MARKET_OPEN_MIN && m < MARKET_CLOSE_MIN;
}

const opposes = (direction: GateItem['direction'], side: GateSide) =>
  (direction === 'BEARISH' && side === 'LONG') || (direction === 'BULLISH' && side === 'SHORT');
const classified = (i: GateItem) => i.classifiedBy === 'rules' || i.classifiedBy === 'gemini';
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const BY_LABEL: Record<GateItem['classifiedBy'], string> = { rules: 'Rule', gemini: 'AI', default: 'Unclassified' };

const clock = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

/** For example "HIGH Bearish (Rule): SEBI order on X, 14:05". */
export function describeItem(i: GateItem): string {
  return `${i.impactLevel} ${title(i.direction)} (${BY_LABEL[i.classifiedBy]}): ${i.headline}, ${clock(i.publishedAt)}`;
}

/**
 * `news-gate-v1`. `items` is the candidate list: the caller may pass more than the window
 * (for example the whole IST day, which the same day earnings check needs); the function
 * applies every window and symbol rule itself.
 */
export function evaluateNewsGate(input: GateInput, items: GateItem[]): GateVerdict {
  const symbol = input.symbol.toUpperCase();
  const index = isIndexSymbol(symbol);
  const at = input.at.getTime();
  const after = input.after?.getTime() ?? -Infinity;
  const published = (i: GateItem) => new Date(i.publishedAt).getTime();
  const notFuture = (i: GateItem) => published(i) <= at && published(i) > after;
  const relevantSymbol = (i: GateItem) => (index ? i.symbol === MARKET_SYMBOL : i.symbol === symbol || i.symbol === MARKET_SYMBOL);

  const relevant = items.filter(i => relevantSymbol(i) && notFuture(i) && published(i) >= at - GATE_WINDOW_MS);
  const high = relevant.filter(i => i.impactLevel === 'HIGH');

  const block = high.filter(i => classified(i) && opposes(i.direction, input.side));
  if (block.length) return verdict('block', block.map(describeItem), block);

  const warnItems: GateItem[] = [];
  for (const i of high) {
    if (input.side === null || i.direction === 'NEUTRAL' || i.direction === 'MIXED' || i.classifiedBy === 'default') warnItems.push(i);
  }
  for (const i of relevant) {
    if (i.impactLevel === 'MEDIUM' && classified(i) && opposes(i.direction, input.side)) warnItems.push(i);
  }
  // A stock's own earnings or board meeting filing, any time the same IST day before `at`.
  if (!index) {
    const day = istDate(input.at);
    for (const i of items) {
      if (i.symbol !== symbol || !notFuture(i) || istDate(new Date(i.publishedAt)) !== day) continue;
      if ((i.eventType === 'EARNINGS' || BOARD_MEETING_PATTERN.test(i.headline)) && !warnItems.includes(i)) warnItems.push(i);
    }
  }
  const reasons = warnItems.map(describeItem);

  const stale =
    !input.ignoreStaleness &&
    inMarketHours(input.at) &&
    (input.lastGoodFetchAt === null || input.lastGoodFetchAt.getTime() < at - STALE_AFTER_MS || input.lastGoodFetchAt.getTime() > at);
  if (stale) reasons.push('News stale');

  if (reasons.length) return verdict('warn', reasons, warnItems);
  return verdict('pass', [], []);
}

function verdict(result: GateResult, reasons: string[], deciding: GateItem[]): GateVerdict {
  return {
    result,
    reason: result === 'pass' ? 'No relevant news' : reasons.join('; '),
    itemIds: deciding.map(i => i.id),
    items: deciding.map(i => ({ id: i.id, symbol: i.symbol, headline: i.headline, sourceUrl: i.sourceUrl, publishedAt: i.publishedAt })),
    marketWideOnly: deciding.length > 0 && deciding.every(i => i.symbol === MARKET_SYMBOL),
    ruleVersion: NEWS_GATE_VERSION,
  };
}

/** `news_and_events` row to `GateItem`. */
export function rowToGateItem(r: any): GateItem {
  return {
    id: r.id,
    symbol: r.symbol,
    headline: r.headline,
    sourceUrl: r.source_url ?? null,
    publishedAt: new Date(r.published_at).toISOString(),
    impactLevel: r.impact_level,
    direction: r.direction,
    classifiedBy: r.classified_by ?? 'default',
    eventType: r.event_type,
  };
}

/** Columns `rowToGateItem` reads. */
export const GATE_ITEM_COLUMNS = 'id, symbol, headline, source_url, published_at, impact_level, direction, classified_by, event_type';
