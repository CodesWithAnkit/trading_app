import { describe, expect, it } from 'vitest';
import { compareWithNews, TradeRow } from './newsComparison.js';
import type { GateItem } from '../intelligence/news/news-gate.js';

// 11:00 IST entries, one per day.
const day = (d: number) => `2026-11-${String(10 + d).padStart(2, '0')}`;
const entryAt = (d: number) => new Date(`${day(d)}T05:30:00.000Z`);
const trade = (d: number, rNet: number, side: 'LONG' | 'SHORT' = 'LONG'): TradeRow => ({
  trade_date: day(d), side, entry_time: entryAt(d).toISOString(), exit_time: new Date(entryAt(d).getTime() + 3600_000).toISOString(),
  entry: 100, stop: 99, target: 102, exit: 101, exit_reason: rNet > 0 ? 'target' : 'stop', r_gross: rNet, cost_r: 0, r_net: rNet,
} as TradeRow);
const goodFetchBefore = (d: number, minutes = 5) => entryAt(d).getTime() - minutes * 60_000;
const marketItem = (d: number, minutesFromEntry: number, over: Partial<GateItem> = {}): GateItem => ({
  id: `m${d}${minutesFromEntry}`, symbol: 'MARKET', headline: 'RBI hikes repo rate', sourceUrl: null,
  publishedAt: new Date(entryAt(d).getTime() + minutesFromEntry * 60_000).toISOString(),
  impactLevel: 'HIGH', direction: 'BEARISH', classifiedBy: 'rules', eventType: 'MACRO', ...over,
});

describe('backtest news comparison (spec 0025)', () => {
  // covers: 0025 backtest AC-3
  it('blocks a LONG with a HIGH Bearish MARKET item 30 min before entry; the same item 10 min after entry is ignored', () => {
    const r = compareWithNews({
      runId: 'r', symbol: 'NIFTY', totalTrades: 2,
      trades: [trade(0, -1), trade(1, 2)],
      goodRunFinishes: [goodFetchBefore(0), goodFetchBefore(1)],
      items: [marketItem(0, -30), marketItem(1, 10)],
    });
    expect(r.blocked).toEqual([{ tradeDate: day(0), side: 'LONG', rNet: -1, itemIds: ['m0-30'], reason: expect.stringContaining('RBI hikes repo rate') }]);
    expect(r.with.trades).toBe(1);
    expect(r.without.trades).toBe(2);
  });

  // covers: 0025 backtest AC-2
  it('a trade with no good fetch in the 15 minutes before entry is excluded, even on a day with earlier fetches', () => {
    const r = compareWithNews({
      runId: 'r', symbol: 'NIFTY', totalTrades: 2,
      trades: [trade(0, 1), trade(1, 1)],
      goodRunFinishes: [goodFetchBefore(0), goodFetchBefore(1, 40)],
      items: [],
    });
    expect(r).toMatchObject({ coveredTrades: 1, coveredDays: 1, totalTrades: 2 });
  });

  // covers: 0025 backtest AC-4
  it('with filter metrics drop exactly the blocked trades; warned trades stay and are counted', () => {
    const r = compareWithNews({
      runId: 'r', symbol: 'NIFTY', totalTrades: 3,
      trades: [trade(0, -1), trade(1, 2), trade(2, 1)],
      goodRunFinishes: [0, 1, 2].map(d => goodFetchBefore(d)),
      items: [marketItem(0, -20), marketItem(1, -20, { direction: 'NEUTRAL' })],
    });
    expect(r.blocked.map(b => b.tradeDate)).toEqual([day(0)]);
    expect(r.warnedTrades).toBe(1);
    expect(r.without).toMatchObject({ trades: 3, netR: 2 });
    expect(r.with).toMatchObject({ trades: 2, netR: 3, winRate: 1 });
  });

  // covers: 0025 backtest AC-5
  it('flags a sample under 30 covered trades, and returns zeros with no coverage', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => trade(i, 1));
    expect(compareWithNews({ runId: 'r', symbol: 'NIFTY', totalTrades: 12, trades: twelve, goodRunFinishes: twelve.map((_, i) => goodFetchBefore(i)), items: [] }).sampleTooSmall).toBe(true);
    const none = compareWithNews({ runId: 'r', symbol: 'NIFTY', totalTrades: 500, trades: [], goodRunFinishes: [], items: [] });
    expect(none).toMatchObject({ coveredDays: 0, coveredTrades: 0, totalTrades: 500, sampleTooSmall: true, gateVersion: 'news-gate-v1' });
    expect(none.without.trades).toBe(0);
  });
});
