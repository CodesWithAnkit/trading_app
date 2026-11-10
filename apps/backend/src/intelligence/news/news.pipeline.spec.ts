import { describe, it, expect } from 'vitest';
import { cleanLink, feedList, parseAlphaVantage, parseExchangeRss, parseRss, parseRssEntries, rssFeeds, DEFAULT_RSS_FEEDS } from './news.adapters.js';
import { applyRules } from './news.rules.js';
import { classify, parseVerdict } from './news.classifier.js';
import { buildDirectory, buildUniverse, loadCompanyNames, mapSymbol } from './news.symbols.js';
import { parseIstTimestamp, stripHtml } from './news.text.js';

// Synthetic RSS 2.0 samples (spec 0024: real feed samples can replace them once the URLs are confirmed).
const NSE_RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>TCS: Outcome of Board Meeting</title><link>https://nsearchives.nseindia.com/corporate/TCS_1.pdf?utm_source=rss#top</link><guid>nse-104512</guid><pubDate>Tue, 10 Nov 2026 14:32:11 +0530</pubDate><description><![CDATA[Board approved <b>dividend</b> of Rs 10]]></description></item>
<item><title>INFY: Press Release</title><link>https://nsearchives.nseindia.com/corporate/INFY_2.pdf?utm_medium=x&amp;id=2</link><pubDate>Tue, 10 Nov 2026 09:00:00 +0530</pubDate></item>
<item><title>No id</title><pubDate>Tue, 10 Nov 2026 09:00:00 +0530</pubDate></item>
</channel></rss>`;
const BSE_RSS = `<rss version="2.0"><channel>
<item><title>Reliance Industries Ltd (500325): Order received from ONGC</title><link>https://www.bseindia.com/x.pdf</link><guid>bse-1</guid><pubDate>Tue, 10 Nov 2026 11:15:00 +0530</pubDate><description>Company Update</description></item>
<item><title>Tiny Co (999999): Change in address</title><guid>bse-2</guid><pubDate>Tue, 10 Nov 2026 11:16:00 +0530</pubDate></item>
</channel></rss>`;
const RSS_SAMPLE = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[RBI keeps repo rate unchanged at 6.5%]]></title><link>https://et.com/a</link><guid>et-a</guid><pubDate>Tue, 10 Nov 2026 08:30:00 +0530</pubDate><description>&lt;p&gt;Policy&lt;/p&gt;</description></item>
<item><title>HDFCBANK shares rally on strong loan growth</title><link>https://et.com/b</link><pubDate>Tue, 10 Nov 2026 09:00:00 +0530</pubDate></item>
<item><title>Gold prices steady</title><link>https://et.com/c</link><pubDate>Tue, 10 Nov 2026 09:10:00 +0530</pubDate></item>
</channel></rss>`;

describe('adapters (spec 0024 AC-3, AC-9)', () => {
  // covers: 0024 AC-3, AC-9
  it('parses NSE feed items as official filings: guid, else the cleaned link, as the id; no id items dropped', () => {
    const items = parseExchangeRss(NSE_RSS, 'nse');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ source: 'NSE', sourceItemId: 'nse-104512', isOfficialFiling: true, publishedAt: '2026-11-10T09:02:11.000Z', text: 'Board approved dividend of Rs 10' });
    expect(items[0].tickerHints).toContain('TCS');
    expect(items[1].sourceItemId).toBe('https://nsearchives.nseindia.com/corporate/INFY_2.pdf?id=2');
    expect(parseRssEntries(NSE_RSS).dropped).toBe(1);
  });

  // covers: 0024 AC-3, AC-9
  it('parses BSE feed items, reading a 6 digit scrip code from the title', () => {
    const items = parseExchangeRss(BSE_RSS, 'bse');
    expect(items[0]).toMatchObject({ source: 'BSE', sourceItemId: 'bse-1', symbolHint: '500325', isOfficialFiling: true, url: 'https://www.bseindia.com/x.pdf', publishedAt: '2026-11-10T05:45:00.000Z' });
  });

  // covers: 0024 AC-3, AC-9
  it('parses RSS items as general news with guid, else link, as the id', () => {
    const items = parseRss(RSS_SAMPLE, 'ET Markets');
    expect(items.map(i => i.sourceItemId)).toEqual(['et-a', 'https://et.com/b', 'https://et.com/c']);
    expect(items[0]).toMatchObject({ source: 'ET Markets', isOfficialFiling: false, text: 'Policy', publishedAt: '2026-11-10T03:00:00.000Z' });
  });

  // covers: 0024 AC-3, AC-9
  it('parses Alpha Vantage articles in UTC with ticker hints', () => {
    const items = parseAlphaVantage({ feed: [{ title: 'Reliance beats', url: 'https://r.com/1', time_published: '20261110T053000', source: 'Reuters', ticker_sentiment: [{ ticker: 'RELIANCE.BSE' }] }] });
    expect(items[0]).toMatchObject({ source: 'Alpha Vantage · Reuters', sourceItemId: 'https://r.com/1', tickerHints: ['RELIANCE'], publishedAt: '2026-11-10T05:30:00.000Z' });
  });

  it('uses the default feeds unless NEWS_RSS_FEEDS lists some', () => {
    expect(rssFeeds(undefined)).toEqual(DEFAULT_RSS_FEEDS);
    expect(rssFeeds(' https://a.com/x , https://b.com/y ')).toEqual(['https://a.com/x', 'https://b.com/y']);
    expect(feedList(' , https://a.com/x,, ')).toEqual(['https://a.com/x']);
    expect(feedList(undefined)).toEqual([]);
    expect(cleanLink('https://a.com/p?utm_source=x&k=1#f')).toBe('https://a.com/p?k=1');
  });

  it('parses IST strings and strips HTML', () => {
    expect(parseIstTimestamp('01/02/2026 10:00:00')).toBe('2026-02-01T04:30:00.000Z');
    expect(stripHtml('<p>A &amp; B&#39;s</p>')).toBe("A & B's");
  });
});

const DIR = buildDirectory([
  { exch_seg: 'NSE', symbol: 'RELIANCE-EQ', token: '2885', name: 'RELIANCE' },
  { exch_seg: 'BSE', symbol: 'RELIANCE', token: '500325', name: 'RELIANCE' },
  { exch_seg: 'BSE', symbol: 'TINY', token: '999999', name: 'TINY' },
  { exch_seg: 'NFO', instrumenttype: 'FUTSTK', name: 'RELIANCE' },
]);
const UNIVERSE = buildUniverse(['RELIANCE', 'TCS', 'HDFCBANK'], { TCS: ['Tata Consultancy Services Ltd', 'TCS'], RELIANCE: 'Reliance Industries Limited', WIPRO: 'Wipro Limited', HDFCBANK: 'HDF' });

describe('symbol mapping (spec 0024 AC-4)', () => {
  // covers: 0024 AC-4
  it('maps BSE scrip codes to NSE symbols and drops unwatched companies', () => {
    const [rel, tiny] = parseExchangeRss(BSE_RSS, 'bse');
    expect(DIR.bseToNse['500325']).toBe('RELIANCE');
    expect(DIR.fno).toEqual(['RELIANCE']);
    expect(mapSymbol(rel, UNIVERSE, DIR)).toBe('RELIANCE');
    expect(mapSymbol(tiny, UNIVERSE, DIR)).toBeNull();
  });

  // covers: 0024 AC-4
  it('keeps NSE items only for watched symbols', () => {
    const [tcs, infy] = parseExchangeRss(NSE_RSS, 'nse');
    expect(mapSymbol(tcs, UNIVERSE, DIR)).toBe('TCS');
    expect(mapSymbol(infy, UNIVERSE, DIR)).toBeNull();
  });

  // covers: 0024 AC-4
  it('names file: aliases work, unwatched symbols, short names and names equal to the symbol are ignored', () => {
    expect([...UNIVERSE.names.entries()].sort()).toEqual([['RELIANCE INDUSTRIES', 'RELIANCE'], ['TATA CONSULTANCY SERVICES', 'TCS']]);
    const nseNoHint = { ...parseExchangeRss(NSE_RSS, 'nse')[1], headline: 'Reliance Industries Limited: Press release', tickerHints: [] };
    expect(mapSymbol(nseNoHint, UNIVERSE, DIR)).toBe('RELIANCE');
  });

  // covers: 0024 AC-4
  it('a missing or invalid names file warns and gives an empty map', () => {
    const warnings: string[] = [];
    expect(loadCompanyNames(m => warnings.push(m), '/nope/company-names.json')).toEqual({});
    expect(warnings[0]).toContain('Name matching is off');
    expect(typeof loadCompanyNames(m => warnings.push(m))).toBe('object');
  });

  // covers: 0024 AC-4
  it('matches RSS headlines to a symbol or company name, macro to MARKET, the rest dropped', () => {
    const [rbi, hdfc, gold] = parseRss(RSS_SAMPLE, 'ET Markets');
    expect(mapSymbol(rbi, UNIVERSE, DIR)).toBe('MARKET');
    expect(mapSymbol(hdfc, UNIVERSE, DIR)).toBe('HDFCBANK');
    expect(mapSymbol(gold, UNIVERSE, DIR)).toBeNull();
    expect(mapSymbol({ ...gold, headline: 'Tata Consultancy Services signs deal' }, UNIVERSE, DIR)).toBe('TCS');
  });
});

describe('classification (spec 0024 AC-6)', () => {
  const base = { excerpt: '', symbol: 'TCS', isOfficialFiling: true };
  const budget = (n: number) => { let left = n; return async () => left-- > 0; };

  // covers: 0024 AC-6
  it('rules decide known categories without Gemini', async () => {
    let called = 0;
    const r = await classify({ ...base, headline: 'Order received from ONGC' }, async () => (called++, null), budget(5));
    expect(r).toMatchObject({ classifiedBy: 'rules', impactLevel: 'HIGH', direction: 'BULLISH', confidence: 0.9, rulesVersion: 'rules-v1' });
    expect(called).toBe(0);
    expect(applyRules(undefined, 'Credit rating downgraded by CRISIL')).toMatchObject({ direction: 'BEARISH' });
  });

  // covers: 0024 AC-6
  it('sends undecided items to Gemini, keeping the rule impact when only direction was open', async () => {
    const gemini = async () => ({ impact: 'MEDIUM' as const, direction: 'BEARISH' as const, eventType: 'GENERAL_NEWS' as const, confidence: 0.7 });
    const results = await classify({ ...base, headline: 'Quarterly results for Q2' }, gemini, budget(5));
    expect(results).toMatchObject({ classifiedBy: 'gemini', eventType: 'EARNINGS', impactLevel: 'HIGH', direction: 'BEARISH' });
    const free = await classify({ ...base, headline: 'Company opens new office' }, gemini, budget(5));
    expect(free).toMatchObject({ classifiedBy: 'gemini', impactLevel: 'MEDIUM', direction: 'BEARISH', confidence: 0.7 });
  });

  // covers: 0024 AC-6
  it('falls back to Low / Neutral at the cap or on Gemini failure', async () => {
    let called = 0;
    const atCap = await classify({ ...base, headline: 'Company opens new office' }, async () => (called++, null), budget(0));
    expect(atCap).toMatchObject({ classifiedBy: 'default', impactLevel: 'LOW', direction: 'NEUTRAL', confidence: 0.3, eventType: 'OFFICIAL_FILING' });
    expect(called).toBe(0);
    const failed = await classify({ ...base, isOfficialFiling: false, headline: 'Company opens new office' }, async () => null, budget(5));
    expect(failed).toMatchObject({ classifiedBy: 'default', eventType: 'GENERAL_NEWS', usedGemini: true });
    const noAi = await classify({ ...base, headline: 'Company opens new office' }, null, budget(5));
    expect(noAi.classifiedBy).toBe('default');
  });

  it('rejects invalid Gemini JSON', () => {
    expect(parseVerdict('not json')).toBeNull();
    expect(parseVerdict('{"impact":"Huge","direction":"Bullish","eventType":"MACRO","confidence":1}')).toBeNull();
    expect(parseVerdict('{"impact":"High","direction":"Bullish","eventType":"MACRO","confidence":0.8}')).toEqual({ impact: 'HIGH', direction: 'BULLISH', eventType: 'MACRO', confidence: 0.8 });
  });
});
