import { describe, expect, it } from 'vitest';
import { Bar, DailyBar, GuruRule, UP_ORB, MR_EMA_PIN, SP_5EMA, AST_RG, GJ_PDHL, minuteOfDayOf } from '../../scanner/strategy/guru/index.js';
import { COST_MODEL_V1, costInR, roundTripCharges } from './costModel.js';
import { checkExit, simulate, stopFillPrice, WARMUP_DAYS } from './simulate.js';
import { computeMetrics, fullYearsBetween, oosStartDate, PF_NO_LOSSES } from './metrics.js';
import { gateForSymbol } from './gate.js';
import { parseIndexInstruments } from '../../scanner/universe/instrumentFile.js';
import { planChunks } from '../history/backfill.js';

/** UTC instant for an IST date and time. */
const ist = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);

/** A flat full session (75 bars, 09:15..15:25) at `px`, with optional per-minute overrides. */
function day(date: string, px: number, over: Record<string, Partial<Bar>> = {}): Bar[] {
  const out: Bar[] = [];
  for (let m = 9 * 60 + 15; m <= 15 * 60 + 25; m += 5) {
    const hhmm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    // Range bars (before 09:45) span px ± 1; later flat bars are tighter so they never touch a stop at the range edge.
    const w = m < 9 * 60 + 45 ? 1 : 0.5;
    out.push({ t: ist(date, hhmm), o: px, h: px + w, l: px - w, c: px, v: 0, ...over[hhmm] });
  }
  return out;
}

function dates(n: number, start = '2024-01-01'): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const dailyFor = (ds: string[], px: number): DailyBar[] => ds.map((date) => ({ date, o: px, h: px + 50, l: px - 50, c: px }));

const base = { symbol: 'NIFTY', exchange: 'NSE' as const, lot: 75, costModel: COST_MODEL_V1 };

describe('fills and exits (precision rules v1)', () => {
  it('stop entry gapping through the trigger fills at the open, not the trigger', () => {
    const bar: Bar = { t: new Date(), o: 105, h: 110, l: 104, c: 108, v: 0 };
    expect(stopFillPrice({ side: 'LONG', kind: 'STOP', trigger: 100, stop: { price: 95 }, targetR: 2 }, bar)).toBe(105);
    expect(stopFillPrice({ side: 'SHORT', kind: 'STOP', trigger: 100, stop: { price: 105 }, targetR: 2 }, { ...bar, o: 98, l: 96 })).toBe(98);
    expect(stopFillPrice({ side: 'LONG', kind: 'STOP', trigger: 120, stop: { price: 95 }, targetR: 2 }, bar)).toBeNull();
  });

  it('a bar touching both stop and target counts as a stop', () => {
    const exit = checkExit({ side: 'LONG', stop: 95, target: 110 }, { t: new Date(), o: 100, h: 111, l: 94, c: 100, v: 0 }, 1, false);
    expect(exit).toEqual({ price: 94, reason: 'stop' });
  });

  it('gap through the stop exits at the open', () => {
    const exit = checkExit({ side: 'LONG', stop: 95, target: 110 }, { t: new Date(), o: 90, h: 92, l: 88, c: 91, v: 0 }, 1, false);
    expect(exit).toEqual({ price: 89, reason: 'stop' });
  });
});

describe('cost model v1', () => {
  it('cost_r is charges over R points times lot', () => {
    const charges = roundTripCharges(COST_MODEL_V1, 'NSE', 24000, 24050, 75);
    expect(charges).toBeGreaterThan(40);
    expect(costInR(charges, 50, 75)).toBeCloseTo(charges / 3750, 10);
  });
});

describe('UP_ORB end to end', () => {
  const ds = dates(WARMUP_DAYS + 2);
  const bars = ds.flatMap((d, i) =>
    i < WARMUP_DAYS + 1
      ? day(d, 100)
      : day(d, 100, {
          // range 99..101 from the flat bars; 09:45 closes above it, then target is hit at 10:30
          '09:45': { o: 100, h: 103, l: 100, c: 102.5 },
          '10:30': { o: 103, h: 114, l: 103, c: 113 }, // target = 103.5 + 2 × 4.5 = 112.5
        }),
  );
  const daily = dailyFor(ds, 100);

  it('enters at the first close outside the range and hits 2R', async () => {
    const res = await simulate({ ...base, rule: UP_ORB, bars, daily });
    const lastDay = res.trades.filter((t) => t.tradeDate === ds[ds.length - 1]);
    expect(lastDay).toHaveLength(1);
    const t = lastDay[0];
    expect(t.side).toBe('LONG');
    expect(t.entry).toBe(103.5); // close 102.5 + 1 point slippage
    expect(t.stop).toBe(99);
    expect(t.exitReason).toBe('target');
    expect(t.rGross).toBeCloseTo((t.exit - t.entry) / (t.entry - t.stop), 3);
    expect(t.rNet).toBeCloseTo(t.rGross - t.costR, 4);
  });

  it('has no lookahead: changing a later bar never changes an earlier signal', async () => {
    const a = await simulate({ ...base, rule: UP_ORB, bars, daily });
    const tweaked = bars.map((b) => (minuteOfDayOf(b.t) === 15 * 60 + 20 ? { ...b, h: 500, c: 400 } : b));
    const b = await simulate({ ...base, rule: UP_ORB, bars: tweaked, daily });
    expect(b.trades.map((t) => [t.entryTime.getTime(), t.entry])).toEqual(a.trades.map((t) => [t.entryTime.getTime(), t.entry]));
  });

  it('a trade still open at 15:15 exits on time, never overnight', async () => {
    const quiet = ds.flatMap((d, i) => (i < WARMUP_DAYS + 1 ? day(d, 100) : day(d, 100, { '09:45': { o: 100, h: 103, l: 100, c: 102.5 } })));
    const res = await simulate({ ...base, rule: UP_ORB, bars: quiet, daily });
    const t = res.trades[res.trades.length - 1];
    expect(t.exitReason).toBe('time');
    expect(minuteOfDayOf(t.exitTime)).toBe(15 * 60 + 15);
  });

  it('produces no trades during warm up', async () => {
    const res = await simulate({ ...base, rule: UP_ORB, bars, daily });
    expect(res.trades.every((t) => t.tradeDate >= ds[WARMUP_DAYS])).toBe(true);
  });

  it('counts short days as gap days and skips them', async () => {
    const short = [...bars, ...day('2024-03-01', 100).slice(0, 20)];
    const res = await simulate({ ...base, rule: UP_ORB, bars: short, daily });
    expect(res.gapDays).toContain('2024-03-01');
  });
});

describe('rule definitions v1', () => {
  const ctxBase = (bars: Bar[], i: number, extra: object = {}) => ({
    bars,
    i,
    dayStart: 0,
    minuteOfDay: minuteOfDayOf(bars[i].t),
    prevDay: null,
    dailyAtr: null,
    ema: { e5: bars.map(() => 0), e9: bars.map(() => 0), e15: bars.map(() => 0) },
    atr5: bars.map(() => 1),
    tradesToday: 0,
    random: () => 0.1,
    ...extra,
  });

  it('MR_EMA_PIN fires on a pin bar touching a rising EMA', () => {
    const bars = day('2024-02-01', 100).slice(0, 6);
    bars[5] = { ...bars[5], o: 100, c: 100.5, h: 101, l: 96 }; // lower wick 4, body 0.5, range 5
    const ema = { e5: [0, 0, 0, 0, 0, 0], e9: [90, 91, 92, 97, 98, 99], e15: [89, 90, 91, 95, 96, 97] };
    const orders = MR_EMA_PIN.onBarClose(ctxBase(bars, 5, { ema }) as any);
    expect(orders).toEqual([{ side: 'LONG', kind: 'STOP', trigger: 101, validity: 'NEXT_BAR', stop: { price: 96 }, targetR: 2 }]);
  });

  it('SP_5EMA only alerts when the whole bar is above EMA5', () => {
    const bars = day('2024-02-01', 100).slice(0, 2);
    expect(SP_5EMA.onBarClose(ctxBase(bars, 1, { ema: { e5: [0, 98], e9: [], e15: [] } }) as any)).toHaveLength(1);
    expect(SP_5EMA.onBarClose(ctxBase(bars, 1, { ema: { e5: [0, 99.5], e9: [], e15: [] } }) as any)).toHaveLength(0);
  });

  it('AST_RG needs a green body under half the red body', () => {
    const bars = day('2024-02-01', 100).slice(0, 3);
    bars[0] = { ...bars[0], o: 104, c: 100, h: 104.5, l: 99.5 };
    bars[1] = { ...bars[1], o: 100, c: 101, h: 101.5, l: 99.8 };
    bars[2] = { ...bars[2], o: 101, c: 102, h: 102.2, l: 100.9 };
    expect(AST_RG.onBarClose(ctxBase(bars, 2) as any)).toEqual([{ side: 'LONG', kind: 'CLOSE', stop: { price: 99.8 }, targetR: 1 }]);
    bars[1] = { ...bars[1], c: 103 }; // body 3, not under 2
    expect(AST_RG.onBarClose(ctxBase(bars, 2) as any)).toHaveLength(0);
  });

  it('GJ_PDHL places an OCO pair on the first bar with a 0.5 ATR stop', () => {
    const bars = day('2024-02-01', 100).slice(0, 1);
    const orders = GJ_PDHL.onBarClose(ctxBase(bars, 0, { prevDay: { date: 'x', o: 0, h: 110, l: 90, c: 0 }, dailyAtr: 40 }) as any);
    expect(orders.map((o) => [o.side, o.trigger, o.stop, o.targetR])).toEqual([
      ['LONG', 110, { distance: 20 }, 10],
      ['SHORT', 90, { distance: 20 }, 10],
    ]);
  });
});

describe('metrics and gate v1', () => {
  const mk = (date: string, r: number) =>
    ({ tradeDate: date, exitTime: new Date(`${date}T10:00:00Z`), rNet: r }) as any;

  it('PF is 99 with no losses, and drawdown is peak to trough on net R', () => {
    expect(computeMetrics([mk('2024-01-02', 1), mk('2024-01-03', 2)], new Set()).profitFactor).toBe(PF_NO_LOSSES);
    const m = computeMetrics([mk('2024-01-02', 3), mk('2024-01-03', -2), mk('2024-01-04', -1), mk('2024-01-05', 1)], new Set());
    expect(m.maxDrawdownR).toBe(3);
    expect(m.netR).toBe(1);
  });

  it('70/30 split and full years', () => {
    expect(oosStartDate(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).toBe('h');
    expect([...fullYearsBetween('2023-01-02', '2025-06-30')]).toEqual(['2023', '2024']);
  });

  const good = () => ({
    trades: 150,
    winRate: 0.4,
    netR: 30,
    profitFactor: 1.2,
    maxDrawdownR: 10,
    perYear: { '2024': { trades: 75, netR: 15, full: true }, '2025': { trades: 75, netR: 15, full: true } },
  });

  it('passes a clean result and fails each threshold', () => {
    expect(gateForSymbol(good(), -40).ok).toBe(true);
    expect(gateForSymbol({ ...good(), profitFactor: 1.09 }, -40).ok).toBe(false);
    expect(gateForSymbol({ ...good(), trades: 99 }, -40).ok).toBe(false);
    expect(gateForSymbol({ ...good(), perYear: { '2025': { trades: 150, netR: 30, full: true } } }, -40).ok).toBe(false);
    expect(gateForSymbol({ ...good(), perYear: { '2024': { trades: 75, netR: -1, full: true }, '2025': { trades: 75, netR: 31, full: true } } }, -40).ok).toBe(false);
    expect(gateForSymbol(good(), 31).ok).toBe(false);
  });
});

describe('history helpers', () => {
  it('reads index tokens and the nearest future lot size', () => {
    const rows = [
      { exch_seg: 'NSE', instrumenttype: 'AMXIDX', symbol: 'Nifty 50', token: '99926000' },
      { exch_seg: 'BSE', instrumenttype: 'AMXIDX', symbol: 'SENSEX', token: '99919000' },
      { exch_seg: 'NFO', instrumenttype: 'FUTIDX', name: 'NIFTY', lotsize: '75', expiry: '25DEC2026' },
      { exch_seg: 'NFO', instrumenttype: 'FUTIDX', name: 'NIFTY', lotsize: '65', expiry: '27NOV2026' },
      { exch_seg: 'BFO', instrumenttype: 'FUTIDX', name: 'SENSEX', lotsize: '20', expiry: '27NOV2026' },
    ];
    expect(parseIndexInstruments(rows)).toEqual([
      { symbol: 'NIFTY', exchange: 'NSE', token: '99926000', lot: 65 },
      { symbol: 'SENSEX', exchange: 'BSE', token: '99919000', lot: 20 },
    ]);
    expect(() => parseIndexInstruments(rows.slice(1))).toThrow(/NIFTY/);
  });

  it('plans contiguous chunks', () => {
    expect(planChunks('2024-01-01', '2024-01-10', 4)).toEqual([
      { from: '2024-01-01', to: '2024-01-04' },
      { from: '2024-01-05', to: '2024-01-08' },
      { from: '2024-01-09', to: '2024-01-10' },
    ]);
  });
});

// Keep the rule type import used for readers.
export type _R = GuruRule;
