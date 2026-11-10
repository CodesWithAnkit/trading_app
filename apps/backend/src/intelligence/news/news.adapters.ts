// Spec 0024 AC-3, AC-12: one adapter per source. NSE and BSE are read only from the
// exchanges' own RSS feeds set in config; every request is a plain GET with an honest
// User-Agent and no browser imitation, cookies, or website JSON APIs. A feed that refuses
// a plain request is recorded as skipped and never worked around.
import type { NewsSourceKey, RawNewsItem } from './news.types.js';
import { parseAlphaVantageTime, parseRfc822, stripHtml } from './news.text.js';

type FetchImpl = typeof fetch;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
export const BLOCK_MEMORY_MS = 6 * 60 * 60_000;
export const DEFAULT_USER_AGENT = 'TradingTerminal-NewsReader/1.0';
const FEED_ACCEPT = 'application/rss+xml, application/xml, text/xml';

/** The exact skipped reasons the run log may carry (spec 0024, News sources detail). */
export const SKIP = {
  noFeed: 'no official feed configured',
  disabled: 'disabled until premium',
  noKey: 'no key',
  premium: 'premium required',
  blocked: 'blocked by exchange',
  rateLimited: 'rate limited',
  invalidUrl: 'invalid feed URL',
} as const;

export const userAgent = () => process.env.NEWS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

// ---------- feed config ----------

/** Comma separated, trimmed, empties dropped. */
export function feedList(env: string | undefined): string[] {
  return (env ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

export const DEFAULT_RSS_FEEDS = [
  'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
  'https://www.moneycontrol.com/rss/marketreports.xml',
];

export function rssFeeds(env: string | undefined): string[] {
  const list = feedList(env);
  return list.length ? list : DEFAULT_RSS_FEEDS;
}

const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

// ---------- the feed reader ----------

export type FeedStatus = 'ok' | 'skipped' | 'error';
/** `commit` saves this response's ETag / Last-Modified; call it only once its items are stored. */
export type FeedOutcome = { url: string; status: FeedStatus; reason: string | null; body: string | null; commit?: () => void };

const istClock = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

/**
 * Reads feeds with the request rules from the spec. Remembers `ETag` / `Last-Modified`
 * per feed and feeds that blocked or rate limited us (6 hours, in memory).
 */
export class FeedReader {
  private readonly validators = new Map<string, { etag?: string; lastModified?: string }>();
  private readonly blockedUntil = new Map<string, number>();

  constructor(
    private readonly fetchImpl: () => FetchImpl,
    private readonly now: () => Date,
  ) {}

  /** A manual Fetch may try a remembered blocked feed again once. */
  async read(url: string, opts: { manual: boolean }): Promise<FeedOutcome> {
    if (!isHttps(url)) return { url, status: 'skipped', reason: SKIP.invalidUrl, body: null };
    const until = this.blockedUntil.get(url);
    if (until && this.now().getTime() < until) {
      if (opts.manual) this.blockedUntil.delete(url);
      else return { url, status: 'skipped', reason: `${SKIP.blocked}, retry after ${istClock(new Date(until))} IST`, body: null };
    }

    let res: Response;
    try {
      res = await this.get(url);
    } catch (err) {
      return { url, status: 'error', reason: (err as Error).message || 'network error', body: null };
    }

    if (res.status === 304) return { url, status: 'ok', reason: null, body: null };
    if (res.status === 401 || res.status === 403) return this.remember(url, SKIP.blocked);
    if (res.status === 429 || res.headers.get('retry-after')) return this.remember(url, SKIP.rateLimited);
    if (!res.ok) return { url, status: 'error', reason: `HTTP ${res.status}`, body: null };

    const body = await res.text();
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('text/html') || !/^\s*<(\?xml|rss|feed)\b/i.test(body)) return this.remember(url, SKIP.blocked);

    const etag = res.headers.get('etag') ?? undefined;
    const lastModified = res.headers.get('last-modified') ?? undefined;
    const commit = etag || lastModified ? () => void this.validators.set(url, { etag, lastModified }) : undefined;
    return { url, status: 'ok', reason: null, body, commit };
  }

  private remember(url: string, reason: string): FeedOutcome {
    this.blockedUntil.set(url, this.now().getTime() + BLOCK_MEMORY_MS);
    return { url, status: 'skipped', reason, body: null };
  }

  /** Plain GET, only `User-Agent` and `Accept`, at most 3 redirects on the same host. */
  private async get(url: string): Promise<Response> {
    const host = new URL(url).host;
    const v = this.validators.get(url);
    const headers: Record<string, string> = { 'User-Agent': userAgent(), Accept: FEED_ACCEPT };
    if (v?.etag) headers['If-None-Match'] = v.etag;
    if (v?.lastModified) headers['If-Modified-Since'] = v.lastModified;
    let target = url;
    for (let hop = 0; ; hop++) {
      const res = await this.fetchImpl()(target, { headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status < 300 || res.status >= 400 || res.status === 304) return res;
      const location = res.headers.get('location');
      if (!location) return res;
      if (hop >= MAX_REDIRECTS) throw new Error('too many redirects');
      const next = new URL(location, target);
      if (next.host !== host) throw new Error(`redirect to another host (${next.host})`);
      target = next.toString();
    }
  }
}

// ---------- RSS 2.0 parsing ----------

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : undefined;
}

/** `link` with `utm_*` parameters and the fragment removed. */
export function cleanLink(link: string): string {
  try {
    const u = new URL(link);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return link;
  }
}

type RssEntry = { id: string; title: string; text: string; link?: string; publishedAt: string };

/** RSS 2.0 items; `dropped` counts items with no guid and no link. */
export function parseRssEntries(xml: string): { entries: RssEntry[]; dropped: number } {
  const entries: RssEntry[] = [];
  let dropped = 0;
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const title = stripHtml(tag(item, 'title'));
    const link = stripHtml(tag(item, 'link'));
    const guid = stripHtml(tag(item, 'guid'));
    const publishedAt = parseRfc822(tag(item, 'pubDate'));
    const id = guid || (link ? cleanLink(link) : '');
    if (!id) {
      dropped++;
      continue;
    }
    if (!title || !publishedAt) continue;
    entries.push({ id, title, text: stripHtml(tag(item, 'description')), link: link || undefined, publishedAt });
  }
  return { entries, dropped };
}

/** Publisher name from the feed URL host. */
export function rssPublisher(feedUrl: string): string {
  const host = (() => {
    try {
      return new URL(feedUrl).hostname;
    } catch {
      return feedUrl;
    }
  })();
  if (host.includes('economictimes')) return 'ET Markets';
  if (host.includes('moneycontrol')) return 'Moneycontrol';
  return host.replace(/^www\./, '');
}

/** Market RSS (ET Markets, Moneycontrol): general news. */
export function parseRss(xml: string, publisher: string): RawNewsItem[] {
  return parseRssEntries(xml).entries.map(e => ({
    sourceKey: 'rss',
    source: publisher,
    sourceItemId: e.id,
    headline: e.title,
    text: e.text,
    url: e.link,
    publishedAt: e.publishedAt,
    isOfficialFiling: false,
  }));
}

const SCRIP_CODE = /\b([5-9]\d{5})\b/;
const UPPER_TOKEN = /\b[A-Z][A-Z0-9&]{1,19}\b/g;

/**
 * Exchange announcement RSS (NSE, BSE): official filings. A symbol or scrip code is not
 * guaranteed, so uppercase tokens (NSE) or a 6 digit scrip code (BSE) are read from the
 * title or description as hints; the mapper checks them against the watched universe.
 */
export function parseExchangeRss(xml: string, sourceKey: 'nse' | 'bse'): RawNewsItem[] {
  return parseRssEntries(xml).entries.map(e => {
    const both = `${e.title} ${e.text}`;
    return {
      sourceKey,
      source: sourceKey === 'nse' ? 'NSE' : 'BSE',
      sourceItemId: e.id,
      symbolHint: sourceKey === 'bse' ? both.match(SCRIP_CODE)?.[1] : undefined,
      tickerHints: sourceKey === 'nse' ? [...new Set(both.match(UPPER_TOKEN) ?? [])] : undefined,
      headline: e.title,
      text: e.text,
      url: e.link,
      publishedAt: e.publishedAt,
      isOfficialFiling: true,
    };
  });
}

// ---------- per source outcome ----------

export type SourceOutcome = {
  status: FeedStatus;
  items: RawNewsItem[];
  error: string | null;
  skipped: string | null;
  feeds: Array<{ url: string; status: FeedStatus; reason: string | null }>;
  /** Saves the feeds' validators; the caller runs it after the items are stored. */
  commit?: () => void;
};

/** Reads every feed of a source; skipped only when every feed is skipped, error when any errored. */
export async function readFeedSource(
  reader: FeedReader,
  urls: string[],
  parse: (xml: string, url: string) => RawNewsItem[],
  opts: { manual: boolean },
): Promise<SourceOutcome> {
  if (!urls.length) return { status: 'skipped', items: [], error: null, skipped: SKIP.noFeed, feeds: [] };
  const items: RawNewsItem[] = [];
  const feeds: SourceOutcome['feeds'] = [];
  const commits: Array<() => void> = [];
  await Promise.all(
    urls.map(async url => {
      const out = await reader.read(url, opts);
      let status = out.status;
      let reason = out.reason;
      if (out.body) {
        try {
          items.push(...parse(out.body, url));
          if (out.commit) commits.push(out.commit);
        } catch (err) {
          status = 'error';
          reason = `unparseable XML: ${(err as Error).message}`;
        }
      }
      feeds.push({ url, status, reason });
    }),
  );
  const commit = () => commits.forEach(c => c());
  const errors = feeds.filter(f => f.status === 'error');
  if (errors.length) {
    return { status: 'error', items, skipped: null, feeds, commit, error: errors.map(f => `${rssPublisher(f.url)}: ${f.reason}`).join('; ') };
  }
  if (feeds.every(f => f.status === 'skipped')) {
    const reasons = [...new Set(feeds.map(f => f.reason ?? SKIP.blocked))];
    return { status: 'skipped', items, error: null, skipped: reasons.join('; '), feeds, commit };
  }
  return { status: 'ok', items, error: null, skipped: null, feeds, commit };
}

export type ExchangeKey = Extract<NewsSourceKey, 'nse' | 'bse'>;

// ---------- Alpha Vantage ----------

export type AlphaVantageFeed = {
  feed?: Array<{
    title?: string;
    url?: string;
    time_published?: string;
    summary?: string;
    source?: string;
    ticker_sentiment?: Array<{ ticker?: string }>;
  }>;
  Information?: string;
  Note?: string;
};

export function parseAlphaVantage(body: AlphaVantageFeed): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const a of body.feed ?? []) {
    const publishedAt = parseAlphaVantageTime(a.time_published);
    if (!a.url || !a.title || !publishedAt) continue;
    out.push({
      sourceKey: 'alphavantage',
      source: `Alpha Vantage · ${a.source ?? 'Unknown'}`,
      sourceItemId: a.url,
      tickerHints: (a.ticker_sentiment ?? []).map(t => (t.ticker ?? '').replace(/\.(BSE|NSE|BO|NS)$/i, '').toUpperCase()).filter(Boolean),
      headline: stripHtml(a.title),
      text: stripHtml(a.summary),
      url: a.url,
      publishedAt,
      isOfficialFiling: false,
    });
  }
  return out;
}

/** Items, or `{ skipped: 'premium required' }` when the answer says the endpoint needs premium. */
export async function fetchAlphaVantage(
  apiKey: string,
  symbols: string[],
  timeFrom: Date | null,
  fetchImpl: FetchImpl = fetch,
): Promise<{ items: RawNewsItem[]; skipped?: string }> {
  const tickers = symbols.slice(0, 25).map(s => `${s}.BSE`).join(',');
  const params = new URLSearchParams({ function: 'NEWS_SENTIMENT', tickers, limit: '200', apikey: apiKey });
  if (timeFrom) params.set('time_from', timeFrom.toISOString().replace(/[-:]/g, '').slice(0, 13));
  const res = await fetchImpl(`https://www.alphavantage.co/query?${params}`, {
    headers: { 'User-Agent': userAgent() },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const body = (await res.json()) as AlphaVantageFeed;
  if (!body.feed && (body.Information || body.Note)) {
    const msg = body.Information ?? body.Note ?? '';
    if (/premium/i.test(msg)) return { items: [], skipped: SKIP.premium };
    throw new Error(`Alpha Vantage: ${msg}`);
  }
  return { items: parseAlphaVantage(body) };
}
