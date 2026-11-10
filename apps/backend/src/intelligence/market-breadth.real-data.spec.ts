import { describe, expect, it } from 'vitest';
import { MarketBreadthService } from './market-breadth.service.js';

// 11:00 IST.
const NOW = new Date('2026-11-11T05:30:00.000Z');
const ago = (s: number) => new Date(NOW.getTime() - s * 1000);
const stock = (symbol: string, change: number, at = ago(5)) => ({
  symbol, ltp: 100 + change, timestamp: at, dayOpen: 100, change1dPct: change, prevClose: 100,
});

function setup(opts: { ticks?: any[]; snapshots?: any[]; newsRun?: any; health?: any } = {}) {
  const latestTicks = new Map<string, any>((opts.ticks ?? []).map(t => [t.symbol, t]));
  const inserted: any[] = [];
  const snapshots = opts.snapshots ?? [];
  const scanner = {
    latestTicks,
    scannerMetrics: { lastTickAt: opts.ticks?.length ? ago(5) : null },
    getFeedHealth: () => opts.health ?? { status: 'CONNECTED', lastTickAt: ago(5) },
    isIndexSymbol: (s: string) => s === 'NIFTY' || s === 'INDIAVIX',
  };
  const client = {
    from(table: string) {
      const filters: Array<(r: any) => boolean> = [];
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => (filters.push(r => r[c] === v), q),
        order: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table === 'news_fetch_runs') return { data: opts.newsRun ?? null, error: null };
          const rows = snapshots.filter(r => filters.every(f => f(r))).sort((a, b) => (a.snapshot_time < b.snapshot_time ? 1 : -1));
          return { data: rows[0] ?? null, error: null };
        },
        insert: async (row: any) => (inserted.push(row), { error: null }),
      };
      return q;
    },
  };
  const service = new MarketBreadthService({ client } as any, scanner as any);
  service.now = () => NOW;
  return { service, latestTicks, inserted };
}

const snapRow = (over: any = {}) => ({
  snapshot_time: '2026-11-11T09:59:00.000Z', session_date: '2026-11-11', market_regime: 'RANGE_BOUND_CONGESTED', regime_confidence: 68,
  advance_count: 120, decline_count: 80, unchanged_count: 10, pct_above_vwap: '55', median_day_change: '0.21',
  sector_metrics: [{ name: 'NIFTY IT', ltp: 3500, changePct: 0.4, alphaVsNifty: 0.1, leaderSymbol: 'TCS', leaderChangePct: 1, advances: 3, declines: 2, bias: 'NEUTRAL' }],
  nifty_ltp: '24100.5', nifty_change_pct: '0.3', vix_ltp: '14.2', vix_change_pct: '-1.1', vix_day_low: '13.9', vix_day_high: '14.8', ...over,
});

describe('MarketBreadthService real data (spec 0026)', () => {
  // covers: 0026 AC-1, AC-6
  it('takes NIFTY and India VIX from their own ticks, with the VIX day range and status bands', () => {
    const { service } = setup({
      ticks: [
        stock('TCS', 1),
        { symbol: 'NIFTY', ltp: 24200, timestamp: ago(3), dayOpen: 24100, change1dPct: 0.5, prevClose: 24080 },
        { symbol: 'INDIAVIX', ltp: 17.2, timestamp: ago(3), dayOpen: 16, change1dPct: 4.2, prevClose: 16.5, dayLow: 15.8, dayHigh: 17.5 },
      ],
    });
    const c = service.getMarketContext();
    expect(c).toMatchObject({ source: 'LIVE', niftyLtp: 24200, niftyChangePct: 0.5, vixLtp: 17.2, vixChangePct: 4.2, vixDayLow: 15.8, vixDayHigh: 17.5, vixStatus: 'ELEVATED' });
  });

  // covers: 0026 AC-2
  it('never counts index ticks in breadth or VWAP participation', () => {
    const { service } = setup({
      ticks: [stock('TCS', 1), stock('INFY', -1), { symbol: 'NIFTY', ltp: 24200, timestamp: ago(3), dayOpen: 24100, change1dPct: 0.5, prevClose: 24080 }],
    });
    const c = service.getMarketContext();
    expect(c.advanceCount! + c.declineCount! + c.unchangedCount!).toBe(2);
    expect(c.advanceCount).toBe(1);
  });

  // covers: 0026 AC-3
  it('ticks older than a minute today are served as the last known reading with asOf', () => {
    const { service } = setup({ ticks: [stock('TCS', 1, ago(600))] });
    const c = service.getMarketContext();
    expect(c.source).toBe('LAST_KNOWN');
    expect(c.asOf).toBe(ago(600).toISOString());
    expect(c.advanceCount).toBe(1);
  });

  // covers: 0026 AC-4
  it('with no ticks and no snapshot today every market value is null and the source is NONE', () => {
    const { service } = setup();
    const c = service.getMarketContext();
    expect(c).toMatchObject({ source: 'NONE', asOf: null, niftyLtp: null, vixLtp: null, advanceCount: null, pctAboveVwap: null, regime: null, regimeLabel: null, sectors: [] });
  });

  // covers: 0026 AC-3, AC-5
  it('after a restart serves today\'s stored snapshot; a snapshot from yesterday is never served', async () => {
    const today = setup({ snapshots: [snapRow()] });
    await today.service.refreshStoredState();
    expect(today.service.getMarketContext()).toMatchObject({
      source: 'LAST_KNOWN', asOf: '2026-11-11T09:59:00.000Z', advanceCount: 120, pctAboveVwap: 55, niftyLtp: 24100.5, vixDayHigh: 14.8, regime: 'RANGE_BOUND_CONGESTED',
    });
    expect(today.service.getMarketContext().sectors[0].name).toBe('NIFTY IT');

    const old = setup({ snapshots: [snapRow({ session_date: '2026-11-10', snapshot_time: '2026-11-10T09:59:00.000Z' })] });
    await old.service.refreshStoredState();
    expect(old.service.getMarketContext()).toMatchObject({ source: 'NONE', niftyLtp: null, advanceCount: null });
  });

  // covers: 0026 AC-3, AC-5 (writes only live state)
  it('writes a snapshot with session_date only while live', async () => {
    const live = setup({ ticks: [stock('TCS', 1)] });
    await live.service.flushSnapshotToDb();
    expect(live.inserted[0]).toMatchObject({ session_date: '2026-11-11', advance_count: 1 });
    const stale = setup({ ticks: [stock('TCS', 1, ago(600))] });
    await stale.service.flushSnapshotToDb();
    expect(stale.inserted).toHaveLength(0);
  });

  // covers: 0026 AC-8
  it('provenance reports the feed state, the latest news run and institutional not connected', async () => {
    const { service } = setup({ ticks: [stock('TCS', 1)], newsRun: { status: 'failed', finished_at: '2026-11-11T05:00:00.000Z' } });
    await service.refreshStoredState();
    expect(service.getMarketContext().provenance).toEqual({
      feed: { status: 'CONNECTED', lastTickAt: ago(5).toISOString(), latencyMs: 5000 },
      news: { status: 'failed', finishedAt: '2026-11-11T05:00:00.000Z' },
      institutional: { connected: false },
    });
  });
});
