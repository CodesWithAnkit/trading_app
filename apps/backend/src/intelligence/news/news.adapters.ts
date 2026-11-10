// Spec 0024 AC-3: one adapter per source. Each has a pure parser (tested with fixtures)
// and a fetch function. Adapters never share failure: the service runs each one on its own.
import type { RawNewsItem } from './news.types.js';
import { parseAlphaVantageTime, parseIstTimestamp, parseRfc822, stripHtml } from './news.text.js';

type FetchImpl = typeof fetch;
const TIMEOUT_MS = 15_000;
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** `YYYY-MM-DD` to the exchange formats. */
const ddmmyyyy = (d: string) => `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}`;
const yyyymmdd = (d: string) => d.replaceAll('-', '');

// ---------- NSE ----------

export type NseAnnouncement = {
  seq_id?: string | number;
  symbol?: string;
  sm_name?: string;
  desc?: string;
  attchmntText?: string;
  attchmntFile?: string;
  an_dt?: string;
};

export function parseNse(rows: NseAnnouncement[]): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const r of rows ?? []) {
    const publishedAt = parseIstTimestamp(r.an_dt);
    const id = r.seq_id != null && String(r.seq_id) ? String(r.seq_id) : r.attchmntFile?.split('/').pop();
    if (!publishedAt || !id || !r.symbol) continue;
    const text = stripHtml(r.attchmntText);
    out.push({
      sourceKey: 'nse',
      source: 'NSE',
      sourceItemId: id,
      symbolHint: r.symbol.toUpperCase(),
      companyName: r.sm_name,
      headline: stripHtml(r.desc) || text.slice(0, 160),
      text,
      category: r.desc,
      url: r.attchmntFile || undefined,
      publishedAt,
      isOfficialFiling: true,
    });
  }
  return out;
}

export async function fetchNse(fromDate: string, toDate: string, fetchImpl: FetchImpl = fetch): Promise<RawNewsItem[]> {
  // NSE rejects API calls without the cookies its home page sets.
  const home = await fetchImpl('https://www.nseindia.com', {
    headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const cookie = (home.headers.getSetCookie?.() ?? [home.headers.get('set-cookie') ?? ''])
    .map(c => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
  if (!cookie) throw new Error(`NSE session cookie missing (HTTP ${home.status})`);
  const url = `https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=${ddmmyyyy(fromDate)}&to_date=${ddmmyyyy(toDate)}`;
  const res = await fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://www.nseindia.com/companies-listing/corporate-filings-announcements' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`NSE announcements HTTP ${res.status}`);
  const body = (await res.json()) as NseAnnouncement[] | { data?: NseAnnouncement[] };
  return parseNse(Array.isArray(body) ? body : (body.data ?? []));
}

// ---------- BSE ----------

export type BseAnnouncement = {
  NEWSID?: string;
  SCRIP_CD?: string | number;
  SLONGNAME?: string;
  HEADLINE?: string;
  NEWSSUB?: string;
  CATEGORYNAME?: string;
  ATTACHMENTNAME?: string;
  NEWS_DT?: string;
};

export function parseBse(rows: BseAnnouncement[]): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const r of rows ?? []) {
    const publishedAt = parseIstTimestamp(r.NEWS_DT);
    if (!publishedAt || !r.NEWSID || r.SCRIP_CD == null) continue;
    const headline = stripHtml(r.NEWSSUB) || stripHtml(r.HEADLINE);
    out.push({
      sourceKey: 'bse',
      source: 'BSE',
      sourceItemId: r.NEWSID,
      symbolHint: String(r.SCRIP_CD),
      companyName: r.SLONGNAME,
      headline,
      text: stripHtml(r.HEADLINE),
      category: r.CATEGORYNAME,
      url: r.ATTACHMENTNAME
        ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${r.ATTACHMENTNAME}`
        : `https://www.bseindia.com/stock-share-price/x/x/${r.SCRIP_CD}/corp-announcements/`,
      publishedAt,
      isOfficialFiling: true,
    });
  }
  return out;
}

export async function fetchBse(fromDate: string, toDate: string, fetchImpl: FetchImpl = fetch): Promise<RawNewsItem[]> {
  const url =
    `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=1&strCat=-1` +
    `&strPrevDate=${yyyymmdd(fromDate)}&strScrip=&strSearch=P&strToDate=${yyyymmdd(toDate)}&strType=C&subcategory=-1`;
  const res = await fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Referer: 'https://www.bseindia.com/', Origin: 'https://www.bseindia.com' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`BSE announcements HTTP ${res.status}`);
  const raw = await res.text();
  let body: { Table?: BseAnnouncement[] };
  try {
    body = JSON.parse(raw) as { Table?: BseAnnouncement[] };
  } catch {
    // BSE's edge answers blocked clients with an HTML "Access Denied" page.
    throw new Error(/access denied/i.test(raw) ? 'BSE blocked the request (Access Denied)' : 'BSE returned a non JSON response');
  }
  if (!Array.isArray(body.Table)) throw new Error('BSE response has no announcements table');
  return parseBse(body.Table);
}

// ---------- RSS ----------

export const DEFAULT_RSS_FEEDS = [
  'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
  'https://www.moneycontrol.com/rss/marketreports.xml',
];

export function rssFeeds(env: string | undefined): string[] {
  const list = (env ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_RSS_FEEDS;
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : undefined;
}

/** Publisher name from the feed URL host. */
export function rssPublisher(feedUrl: string): string {
  const host = (() => { try { return new URL(feedUrl).hostname; } catch { return feedUrl; } })();
  if (host.includes('economictimes')) return 'ET Markets';
  if (host.includes('moneycontrol')) return 'Moneycontrol';
  return host.replace(/^www\./, '');
}

export function parseRss(xml: string, publisher: string): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const title = stripHtml(tag(item, 'title'));
    const link = stripHtml(tag(item, 'link'));
    const guid = stripHtml(tag(item, 'guid'));
    const publishedAt = parseRfc822(tag(item, 'pubDate'));
    const id = guid || link;
    if (!title || !id || !publishedAt) continue;
    out.push({
      sourceKey: 'rss',
      source: publisher,
      sourceItemId: id,
      headline: title,
      text: stripHtml(tag(item, 'description')),
      url: link || undefined,
      publishedAt,
      isOfficialFiling: false,
    });
  }
  return out;
}

export async function fetchRss(feeds: string[], fetchImpl: FetchImpl = fetch): Promise<{ items: RawNewsItem[]; errors: string[] }> {
  const items: RawNewsItem[] = [];
  const errors: string[] = [];
  await Promise.all(
    feeds.map(async feed => {
      try {
        const res = await fetchImpl(feed, { headers: { ...BROWSER_HEADERS, Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        items.push(...parseRss(await res.text(), rssPublisher(feed)));
      } catch (err) {
        errors.push(`${rssPublisher(feed)}: ${(err as Error).message}`);
      }
    }),
  );
  if (!items.length && errors.length) throw new Error(errors.join('; '));
  return { items, errors };
}

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

export async function fetchAlphaVantage(
  apiKey: string,
  symbols: string[],
  timeFrom: Date | null,
  fetchImpl: FetchImpl = fetch,
): Promise<RawNewsItem[]> {
  const tickers = symbols.slice(0, 25).map(s => `${s}.BSE`).join(',');
  const params = new URLSearchParams({ function: 'NEWS_SENTIMENT', tickers, limit: '200', apikey: apiKey });
  if (timeFrom) params.set('time_from', timeFrom.toISOString().replace(/[-:]/g, '').slice(0, 13));
  const res = await fetchImpl(`https://www.alphavantage.co/query?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const body = (await res.json()) as AlphaVantageFeed;
  if (!body.feed && (body.Information || body.Note)) throw new Error(`Alpha Vantage: ${body.Information ?? body.Note}`);
  return parseAlphaVantage(body);
}
