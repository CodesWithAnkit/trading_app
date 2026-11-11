import { describe, expect, it } from 'vitest';
import { buildContext, DEFAULT_LIMITS, realizedPnl, RiskContext, sizeSignal } from './sizing.js';

const sig = (entry: number, stop: number | null, direction = 'LONG') => ({
  direction,
  entry_low: entry,
  snapshot_json: { reference_entry: entry, stop: stop === null ? undefined : { level: stop } },
});
const ctx = (over: Partial<RiskContext> = {}): RiskContext => ({
  limits: DEFAULT_LIMITS,
  realizedLossToday: 0,
  openRisk: 0,
  openCount: 0,
  dailyRoom: 6000,
  ...over,
});

describe('sizeSignal (spec 0028)', () => {
  it('sizes from risk per trade (AC-2)', () => {
    // risk ₹1,500, ₹5 a share → 300; notional 300 × 100 = ₹30,000 (under the cap).
    expect(sizeSignal(sig(100, 95), ctx())).toMatchObject({ verdict: 'TAKE', qty: 300, riskInr: 1500, notionalInr: 30000, notes: [] });
  });

  it('caps by capital (AC-3)', () => {
    // 500/495: base 300, notional ₹1,50,000 > ₹50,000 → qty 100.
    expect(sizeSignal(sig(500, 495), ctx())).toMatchObject({ verdict: 'TAKE', qty: 100, notes: ['CAPPED_BY_CAPITAL'] });
  });

  it('reduces to fit the remaining room (AC-4)', () => {
    expect(sizeSignal(sig(100, 95), ctx({ dailyRoom: 500 }))).toMatchObject({ verdict: 'TAKE', qty: 100, riskInr: 500, notes: ['REDUCED_TO_ROOM'] });
  });

  it('skips in the spec order (AC-5)', () => {
    expect(sizeSignal(sig(100, null), ctx()).skipReason).toBe('STOP_INVALID');
    expect(sizeSignal(sig(100, 100), ctx()).skipReason).toBe('STOP_INVALID');
    expect(sizeSignal(sig(100, 102), ctx()).skipReason).toBe('STOP_INVALID'); // long with stop above
    expect(sizeSignal(sig(100, 98, 'SHORT'), ctx()).skipReason).toBe('STOP_INVALID'); // short with stop below
    expect(sizeSignal(sig(0, 0), ctx()).skipReason).toBe('STOP_INVALID');
    // stop checked before room: no divide by zero even at zero room
    expect(sizeSignal(sig(100, 100), ctx({ dailyRoom: 0 })).skipReason).toBe('STOP_INVALID');
    expect(sizeSignal(sig(100, 95), ctx({ openCount: 3, dailyRoom: 0 })).skipReason).toBe('MAX_OPEN_TRADES');
    expect(sizeSignal(sig(100, 95), ctx({ dailyRoom: 0 })).skipReason).toBe('DAILY_LOSS_LIMIT');
    expect(sizeSignal(sig(5000, 3000), ctx()).skipReason).toBe('STOP_TOO_WIDE');
    expect(sizeSignal(sig(128450, 128310), ctx()).skipReason).toBe('CAPITAL_TOO_SMALL');
    expect(sizeSignal(sig(100, 95), ctx({ dailyRoom: 3 })).skipReason).toBe('STOP_TOO_WIDE_FOR_ROOM');
  });

  it('sizes a short with the stop above entry', () => {
    expect(sizeSignal(sig(200, 205, 'SHORT'), ctx())).toMatchObject({ verdict: 'TAKE', qty: 250, riskInr: 1250 });
  });
});

describe('buildContext', () => {
  const row = (o: Record<string, unknown>) => ({ status: 'PENDING', direction: 'LONG', quantity: 10, entry_price: 100, stop_price: 95, realized_pnl: null, exit_at: null, ...o });

  it('counts net realized loss and open risk; null quantity is ₹0 (AC-4, AC-11)', () => {
    const c = buildContext(DEFAULT_LIMITS, [row({}), row({ quantity: null })], [row({ realized_pnl: -4000 }), row({ realized_pnl: 500 })]);
    expect(c).toMatchObject({ realizedLossToday: 3500, openRisk: 50, openCount: 2, dailyRoom: 2450 });
  });

  it('a net winning day gives zero loss', () => {
    expect(buildContext(DEFAULT_LIMITS, [], [row({ realized_pnl: 5000 }), row({ realized_pnl: -4000 })]).realizedLossToday).toBe(0);
  });
});

describe('realizedPnl (AC-9)', () => {
  it('signs by direction', () => {
    expect(realizedPnl('LONG', 1876, 2004, 23)).toBe(2944);
    expect(realizedPnl('SHORT', 200, 190, 10)).toBe(100);
  });
});
