import { describe, it, expect } from 'vitest';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';

/** A tiny query builder stub recording filters, resolving to the given rows. */
function clientWith(rows: any[]) {
  const calls: Array<[string, ...any[]]> = [];
  const q: any = {
    select: (...a: any[]) => (calls.push(['select', ...a]), q),
    eq: (...a: any[]) => (calls.push(['eq', ...a]), q),
    not: (...a: any[]) => (calls.push(['not', ...a]), q),
    in: (...a: any[]) => (calls.push(['in', ...a]), q),
    order: (...a: any[]) => (calls.push(['order', ...a]), q),
    limit: (...a: any[]) => (calls.push(['limit', ...a]), q),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { client: { from: () => q }, calls };
}

const row = (over: Partial<Record<string, any>> = {}) => ({
  id: 'a1', symbol: 'TCS', headline: 'TCS wins order', excerpt: 'x', source: 'NSE', source_url: 'https://nse/x.pdf',
  published_at: '2026-11-10T05:00:00.000Z', ingested_at: '2026-11-10T05:01:00.000Z', event_type: 'OFFICIAL_FILING',
  impact_level: 'HIGH', direction: 'BULLISH', confidence: 0.9, is_official_filing: true, classified_by: 'rules', ...over,
});

describe('OfficialFilingsAndNewsService (spec 0024)', () => {
  // covers: 0024 AC-7
  it('returns an empty list, never seed items, when nothing is stored', async () => {
    const service = new OfficialFilingsAndNewsService({ client: clientWith([]).client } as any);
    const res = await service.getNews();
    expect(res.events).toEqual([]);
    expect(res.totalCount).toBe(0);
  });

  // covers: 0024 AC-7
  it('returns an empty list without a database', async () => {
    const service = new OfficialFilingsAndNewsService({ client: null } as any);
    expect((await service.getNews('TCS')).events).toEqual([]);
  });

  // covers: 0024 AC-6, AC-7, AC-9
  it('maps stored rows with classifiedBy and isMacro, excluding seed rows', async () => {
    const stub = clientWith([row(), row({ id: 'm1', symbol: 'MARKET', classified_by: 'gemini', is_official_filing: false })]);
    const service = new OfficialFilingsAndNewsService({ client: stub.client } as any);
    const res = await service.getNews('tcs');
    expect(stub.calls).toContainEqual(['eq', 'is_seed', false]);
    expect(stub.calls).toContainEqual(['in', 'symbol', ['TCS', 'MARKET']]);
    expect(res.events.map(e => [e.classifiedBy, e.isMacro])).toEqual([['rules', false], ['gemini', true]]);
    expect(res.officialCount).toBe(1);
    expect(res.events[0].clockSkewMs).toBe(60_000);
  });
});
