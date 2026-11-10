import { describe, it, expect } from 'vitest';
import { parseAlphaVantage, parseBse, parseNse, parseRss, rssFeeds, DEFAULT_RSS_FEEDS } from './news.adapters.js';
import { applyRules } from './news.rules.js';
import { classify, parseVerdict } from './news.classifier.js';
import { buildDirectory, buildUniverse, mapSymbol } from './news.symbols.js';
import { parseIstTimestamp, stripHtml } from './news.text.js';

const NSE_SAMPLE = [
  { seq_id: '104512', symbol: 'TCS', sm_name: 'Tata Consultancy Services Limited', desc: 'Outcome of Board Meeting', attchmntText: 'Board approved <b>dividend</b> of Rs 10', attchmntFile: 'https://nsearchives.nseindia.com/corporate/TCS_1.pdf', an_dt: '10-Nov-2026 14:32:11' },
  { seq_id: '', symbol: 'INFY', desc: 'Press Release', attchmntFile: 'https://nsearchives.nseindia.com/corporate/INFY_2.pdf', an_dt: '10-Nov-2026 09:00:00' },
  { seq_id: '9', symbol: 'X', an_dt: 'garbage' },
];
const BSE_SAMPLE = {
  Table: [
    { NEWSID: 'abc-1', SCRIP_CD: 500325, SLONGNAME: 'Reliance Industries Ltd', NEWSSUB: 'Reliance Industries Ltd - Order received from ONGC', HEADLINE: 'Order details', CATEGORYNAME: 'Company Update', ATTACHMENTNAME: 'x.pdf', NEWS_DT: '2026-11-10T11:15:00.27' },
    { NEWSID: 'abc-2', SCRIP_CD: 999999, SLONGNAME: 'Tiny Co', NEWSSUB: 'Tiny Co - Change in address', NEWS_DT: '2026-11-10T11:16:00' },
  ],
};
const RSS_SAMPLE = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[RBI keeps repo rate unchanged at 6.5%]]></title><link>https://et.com/a</link><guid>et-a</guid><pubDate>Tue, 10 Nov 2026 08:30:00 +0530</pubDate><description>&lt;p&gt;Policy&lt;/p&gt;</description></item>
<item><title>HDFCBANK shares rally on strong loan growth</title><link>https://et.com/b</link><pubDate>Tue, 10 Nov 2026 09:00:00 +0530</pubDate></item>
<item><title>Gold prices steady</title><link>https://et.com/c</link><pubDate>Tue, 10 Nov 2026 09:10:00 +0530</pubDate></item>
</channel></rss>`;

describe('adapters (spec 0024 AC-3, AC-9)', () => {
  // covers: 0024 AC-3, AC-9
  it('parses NSE announcements, falling back to the attachment name as the id', () => {
    const items = parseNse(NSE_SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ source: 'NSE', sourceItemId: '104512', symbolHint: 'TCS', isOfficialFiling: true, url: NSE_SAMPLE[0].attchmntFile, publishedAt: '2026-11-10T09:02:11.000Z' });
    expect(items[0].text).toBe('Board approved dividend of Rs 10');
    expect(items[1].sourceItemId).toBe('INFY_2.pdf');
  });

  // covers: 0024 AC-3, AC-9
  it('parses BSE announcements with an exchange document link', () => {
    const items = parseBse(BSE_SAMPLE.Table);
    expect(items[0]).toMatchObject({ source: 'BSE', sourceItemId: 'abc-1', symbolHint: '500325', isOfficialFiling: true, publishedAt: '2026-11-10T05:45:00.000Z' });
    expect(items[0].url).toBe('https://www.bseindia.com/xml-data/corpfiling/AttachLive/x.pdf');
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
const UNIVERSE = buildUniverse(['RELIANCE', 'TCS', 'HDFCBANK'], { TCS: 'Tata Consultancy Services Ltd' });

describe('symbol mapping (spec 0024 AC-4)', () => {
  // covers: 0024 AC-4
  it('maps BSE scrip codes to NSE symbols and drops unwatched companies', () => {
    const [rel, tiny] = parseBse(BSE_SAMPLE.Table);
    expect(DIR.bseToNse['500325']).toBe('RELIANCE');
    expect(DIR.fno).toEqual(['RELIANCE']);
    expect(mapSymbol(rel, UNIVERSE, DIR)).toBe('RELIANCE');
    expect(mapSymbol(tiny, UNIVERSE, DIR)).toBeNull();
  });

  // covers: 0024 AC-4
  it('keeps NSE items only for watched symbols', () => {
    const [tcs, infy] = parseNse(NSE_SAMPLE);
    expect(mapSymbol(tcs, UNIVERSE, DIR)).toBe('TCS');
    expect(mapSymbol(infy, UNIVERSE, DIR)).toBeNull();
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
