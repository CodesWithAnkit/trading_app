import { describe, expect, it } from 'vitest';
import { evaluateNewsGate, GateItem, inMarketHours } from './news-gate.js';

// 11:00 IST on a weekday.
const AT = new Date('2026-11-10T05:30:00.000Z');
const min = (m: number) => new Date(AT.getTime() + m * 60_000).toISOString();
const FRESH = new Date(AT.getTime() - 5 * 60_000);

let n = 0;
const item = (over: Partial<GateItem>): GateItem => ({
  id: `i${++n}`,
  symbol: 'TCS',
  headline: 'Something happened',
  sourceUrl: 'https://x/1',
  publishedAt: min(-20),
  impactLevel: 'HIGH',
  direction: 'BEARISH',
  classifiedBy: 'rules',
  eventType: 'OFFICIAL_FILING',
  ...over,
});
const gate = (items: GateItem[], over: Partial<Parameters<typeof evaluateNewsGate>[0]> = {}) =>
  evaluateNewsGate({ symbol: 'TCS', side: 'LONG', at: AT, lastGoodFetchAt: FRESH, ...over }, items);

describe('news-gate-v1 (spec 0025)', () => {
  // covers: 0025 umbrella AC-1, AC-2; live child AC-1
  it('blocks a LONG on a HIGH Bearish rules item 20 minutes before; 70 minutes before passes; 5 minutes after is ignored', () => {
    const v = gate([item({ headline: 'SEBI order on TCS' })]);
    expect(v.result).toBe('block');
    expect(v.reason).toBe('HIGH Bearish (Rule): SEBI order on TCS, 10:40');
    expect(v.items[0]).toMatchObject({ headline: 'SEBI order on TCS', sourceUrl: 'https://x/1' });
    expect(v.ruleVersion).toBe('news-gate-v1');
    expect(gate([item({ publishedAt: min(-70) })]).result).toBe('pass');
    expect(gate([item({ publishedAt: min(5) })]).result).toBe('pass');
  });

  // covers: 0025 live child AC-1
  it('a HIGH default classified item warns and never blocks; MIXED never blocks; side null warns on any HIGH', () => {
    expect(gate([item({ classifiedBy: 'default' })]).result).toBe('warn');
    expect(gate([item({ direction: 'MIXED' })]).result).toBe('warn');
    expect(gate([item({ direction: 'BULLISH' })], { side: null }).result).toBe('warn');
    expect(gate([item({ direction: 'BULLISH' })]).result).toBe('pass');
    expect(gate([item({ direction: 'BULLISH' })], { side: 'SHORT' }).result).toBe('block');
  });

  // covers: 0025 live child AC-1
  it('a classified MEDIUM item against the side warns; a MEDIUM default item does not', () => {
    expect(gate([item({ impactLevel: 'MEDIUM' })]).result).toBe('warn');
    expect(gate([item({ impactLevel: 'MEDIUM', classifiedBy: 'default' })]).result).toBe('pass');
  });

  // covers: 0025 live child AC-1, AC-5
  it('an index ignores a stock item but blocks on a HIGH Bearish MARKET item, marked market wide', () => {
    expect(gate([item({})], { symbol: 'NIFTY' }).result).toBe('pass');
    const v = gate([item({ symbol: 'MARKET', headline: 'RBI hikes repo rate' })], { symbol: 'NIFTY' });
    expect(v).toMatchObject({ result: 'block', marketWideOnly: true });
    expect(gate([item({ symbol: 'MARKET' })]).result).toBe('block');
    expect(gate([item({})]).marketWideOnly).toBe(false);
  });

  // covers: 0025 umbrella gate rule (same IST day earnings and board meeting)
  it('warns on a stock\'s own earnings or board meeting filing earlier the same IST day, outside the 60 minutes', () => {
    const early = min(-180);
    expect(gate([item({ impactLevel: 'LOW', eventType: 'EARNINGS', direction: 'NEUTRAL', publishedAt: early })]).result).toBe('warn');
    expect(gate([item({ impactLevel: 'LOW', direction: 'NEUTRAL', headline: 'Board Meeting Intimation', publishedAt: early })]).result).toBe('warn');
    expect(gate([item({ impactLevel: 'LOW', direction: 'NEUTRAL', headline: 'Board Meeting Intimation', publishedAt: early })], { symbol: 'NIFTY' }).result).toBe('pass');
    // Yesterday's earnings do not count.
    expect(gate([item({ impactLevel: 'LOW', eventType: 'EARNINGS', direction: 'NEUTRAL', publishedAt: min(-24 * 60) })]).result).toBe('pass');
  });

  // covers: 0025 umbrella AC-4
  it('no good fetch in the 15 minutes before an 11:00 IST check warns "News stale"; a 07:00 check is not judged stale', () => {
    const v = gate([], { lastGoodFetchAt: new Date(AT.getTime() - 20 * 60_000) });
    expect(v).toMatchObject({ result: 'warn', reason: 'News stale' });
    expect(gate([], { lastGoodFetchAt: null }).result).toBe('warn');
    const seven = new Date('2026-11-10T01:30:00.000Z');
    expect(inMarketHours(seven)).toBe(false);
    expect(gate([], { at: seven, lastGoodFetchAt: null }).result).toBe('pass');
    expect(gate([], { lastGoodFetchAt: null, ignoreStaleness: true }).result).toBe('pass');
  });

  // covers: 0025 live child AC-3 (after entry window)
  it('the after entry check counts only items published after the signal', () => {
    const created = new Date(AT.getTime() - 30 * 60_000);
    expect(gate([item({ publishedAt: min(-40) })], { after: created }).result).toBe('pass');
    expect(gate([item({ publishedAt: min(-10) })], { after: created }).result).toBe('block');
  });
});
