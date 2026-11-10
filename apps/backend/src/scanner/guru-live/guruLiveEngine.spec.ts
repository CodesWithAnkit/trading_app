import { describe, expect, it } from 'vitest';
import { Bar, DailyBar, Order } from '../strategy/guru/index.js';
import { simulate } from '../../backtest/engine/simulate.js';
import { COST_MODEL_V1 } from '../../backtest/engine/costModel.js';
import { Fill, GuruLiveEngine, mergeDaily, warmingReason } from './guruLiveEngine.js';

const ist = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);

function day(date: string, px: number, over: Record<string, Partial<Bar>> = {}): Bar[] {
  const out: Bar[] = [];
  for (let m = 9 * 60 + 15; m <= 15 * 60 + 25; m += 5) {
    const hhmm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const w = m < 9 * 60 + 45 ? 1 : 0.5;
    out.push({ t: ist(date, hhmm), o: px, h: px + w, l: px - w, c: px, v: 0, ...over[hhmm] });
  }
  return out;
}

function weekdays(n: number, start = '2024-01-01'): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    if (d.getUTCDay() % 6 !== 0) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function engine(rules: string[], open = new Set<string>()) {
  const fills: Fill[] = [];
  const warming: [string, string | null][] = [];
  const e = new GuruLiveEngine({
    liveRules: () => rules,
    hasOpenPlan: (s, r) => open.has(`${s}|${r}`),
    onFill: (f) => fills.push(f),
    onWarming: (r, _s, reason) => warming.push([r, reason]),
  });
  return { e, fills, warming };
}

describe('live engine matches the backtest (spec 0023 AC-2, AC-4)', () => {
  it('UP_ORB fires on the same bar at the same entry, stop and target as simulate() (minus slippage)', async () => {
    const ds = weekdays(22);
    const history = ds.slice(0, -1).flatMap((d) => day(d, 100));
    const today = day(ds[ds.length - 1], 100, { '09:45': { o: 100, h: 103, l: 100, c: 102.5 } });
    const daily: DailyBar[] = ds.map((date) => ({ date, o: 100, h: 150, l: 50, c: 100 }));

    const zeroSlip = { ...COST_MODEL_V1, slippagePoints: { NIFTY: 0 } };
    const sim = await simulate({ rule: (await import('../strategy/guru/index.js')).UP_ORB, symbol: 'NIFTY', exchange: 'NSE', lot: 65, bars: [...history, ...today], daily, costModel: zeroSlip as any });
    const simTrade = sim.trades.find((t) => t.tradeDate === ds[ds.length - 1])!;

    const { e, fills } = engine(['UP_ORB']);
    e.seed('NIFTY', history, daily);
    for (const b of today.slice(0, 8)) e.onBarClose('NIFTY', b);

    expect(fills).toHaveLength(1);
    expect(fills[0].position).toMatchObject({ side: 'LONG', entry: simTrade.entry, stop: simTrade.stop, target: simTrade.target });
    expect(fills[0].at.getTime()).toBe(ist(ds[ds.length - 1], '09:50').getTime());
  });
});

describe('stop entries (AC-4)', () => {
  const ds = weekdays(3);
  const seedBars = ds.slice(0, 2).flatMap((d) => day(d, 100));

  /** A rule double that places one order on the first bar it sees. */
  function withOrder(order: Order) {
    const { e, fills } = engine(['SP_5EMA']);
    e.seed('NIFTY', seedBars, []);
    // Inject the pending order directly through the public path: a bar the SP_5EMA rule qualifies on.
    (e as any).pending.set('NIFTY', [{ ruleId: 'SP_5EMA', order, validUntil: ist(ds[2], '09:25').getTime(), day: ds[2] }]);
    return { e, fills };
  }

  it('fires only when price crosses the trigger, at max(tick, trigger) for longs', () => {
    const { e, fills } = withOrder({ side: 'LONG', kind: 'STOP', trigger: 101, validity: 'NEXT_BAR', stop: { price: 99 }, targetR: 2 });
    e.onTick('NIFTY', 100.9, ist(ds[2], '09:21'));
    expect(fills).toHaveLength(0);
    e.onTick('NIFTY', 101.4, ist(ds[2], '09:22'));
    expect(fills).toHaveLength(1);
    expect(fills[0].position).toMatchObject({ entry: 101.4, stop: 99 });
    expect(fills[0].position.target).toBeCloseTo(101.4 + 2 * 2.4, 6);
  });

  it('shorts fire at min(tick, trigger)', () => {
    const { e, fills } = withOrder({ side: 'SHORT', kind: 'STOP', trigger: 99, validity: 'NEXT_BAR', stop: { price: 101 }, targetR: 3 });
    e.onTick('NIFTY', 98.6, ist(ds[2], '09:21'));
    expect(fills[0].position).toMatchObject({ side: 'SHORT', entry: 98.6, stop: 101 });
  });

  it('an untriggered one bar order expires at the next bar close and never fires', () => {
    const { e, fills } = withOrder({ side: 'LONG', kind: 'STOP', trigger: 150, validity: 'NEXT_BAR', stop: { price: 99 }, targetR: 2 });
    e.onBarClose('NIFTY', day(ds[2], 100)[2]); // bar 09:25, closes 09:30, past validUntil
    expect(e.pendingFor('NIFTY').filter((p) => p.order.trigger === 150)).toHaveLength(0);
    e.onTick('NIFTY', 151, ist(ds[2], '09:31'));
    expect(fills).toHaveLength(0);
  });

  it('an OCO fill cancels the other leg (GJ_PDHL)', () => {
    const { e, fills } = engine(['GJ_PDHL']);
    e.seed('NIFTY', seedBars, []);
    (e as any).pending.set('NIFTY', [
      { ruleId: 'GJ_PDHL', order: { side: 'LONG', kind: 'STOP', trigger: 110, validity: 'DAY', stop: { distance: 5 }, targetR: 10, oco: 'pdhl' }, validUntil: 'DAY', day: ds[2] },
      { ruleId: 'GJ_PDHL', order: { side: 'SHORT', kind: 'STOP', trigger: 90, validity: 'DAY', stop: { distance: 5 }, targetR: 10, oco: 'pdhl' }, validUntil: 'DAY', day: ds[2] },
    ]);
    e.onTick('NIFTY', 110.5, ist(ds[2], '10:00'));
    expect(fills).toHaveLength(1);
    expect(e.pendingFor('NIFTY')).toHaveLength(0);
  });

  it('never fires while that rule already has an open plan', () => {
    const { e, fills } = engine(['SP_5EMA'], new Set(['NIFTY|SP_5EMA']));
    e.seed('NIFTY', seedBars, []);
    (e as any).pending.set('NIFTY', [{ ruleId: 'SP_5EMA', order: { side: 'LONG', kind: 'STOP', trigger: 101, stop: { price: 99 }, targetR: 2 }, validUntil: 'DAY', day: ds[2] }]);
    e.onTick('NIFTY', 102, ist(ds[2], '10:00'));
    expect(fills).toHaveLength(0);
  });
});

describe('warm up and daily context (AC-3)', () => {
  it('reports warming up until bars and prior days are enough', () => {
    expect(warmingReason('SP_5EMA', 12, 0)).toMatch(/30 stored 5m bars, has 12/);
    expect(warmingReason('UP_ORB', 400, 3)).toMatch(/15 prior trading days/);
    expect(warmingReason('SP_5EMA', 400, 0)).toBeNull();
  });

  it('a seeded engine with too little history fires nothing and says why', () => {
    const { e, fills, warming } = engine(['UP_ORB']);
    e.seed('NIFTY', [], []);
    for (const b of day('2024-03-01', 100, { '09:45': { c: 102.5, h: 103 } }).slice(0, 8)) e.onBarClose('NIFTY', b);
    expect(fills).toHaveLength(0);
    expect(warming.at(-1)?.[1]).toMatch(/Needs/);
  });

  it('builds daily bars from 5m for days missing a 1d row', () => {
    const merged = mergeDaily([{ date: '2024-01-01', o: 1, h: 2, l: 0, c: 1 }], day('2024-01-02', 100));
    expect(merged.map((d) => d.date)).toEqual(['2024-01-01', '2024-01-02']);
    expect(merged[1]).toMatchObject({ o: 100, h: 101, l: 99, c: 100 });
  });
});

describe('guru plans on the shared plan book (AC-6)', () => {
  it('two guru rules on one index never collide, and short exits and P&L have the right sign', async () => {
    const { PlanBook, checkExit, pnlPct } = await import('../plans/planBook.js');
    const book = new PlanBook();
    const base = { signalId: null, symbol: 'NIFTY', entry: 100, firedAt: new Date().toISOString() };
    expect(book.reserve({ ...base, setup: 'UP_ORB', direction: 'LONG', stop: 98, target: 104 })).toBe(true);
    expect(book.reserve({ ...base, setup: 'SP_5EMA', direction: 'SHORT', stop: 102, target: 94 })).toBe(true);
    expect(book.reserve({ ...base, setup: 'UP_ORB', direction: 'LONG', stop: 98, target: 104 })).toBe(false);
    const short = { ...base, setup: 'SP_5EMA', direction: 'SHORT' as const, stop: 102, target: 94 };
    expect(checkExit(short, 94)).toBe('TARGET');
    expect(checkExit(short, 102)).toBe('STOP');
    expect(pnlPct(short, 94)).toBeGreaterThan(0);
  });
});
