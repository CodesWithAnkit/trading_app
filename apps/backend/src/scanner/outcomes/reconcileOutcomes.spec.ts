import { describe, it, expect, vi } from 'vitest';
import { evaluateOutcome, reconcileOutcomes, OutcomeCandle } from './reconcileOutcomes.js';
import { istDayRange, istDateString } from '../time/ist.js';

const signal = (direction: 'LONG' | 'SHORT', overrides: Record<string, unknown> = {}) => ({
  id: 'sig-1',
  direction,
  created_at: '2026-09-29T04:00:00.000Z',
  target_1: direction === 'LONG' ? 102 : 98,
  snapshot_json: { symbol: 'RELIANCE', reference_entry: 100, stop: { level: direction === 'LONG' ? 99 : 101 } },
  ...overrides,
});

const candle = (minute: number, high: number, low: number, close: number): OutcomeCandle => ({
  high, low, close,
  start_time: new Date(Date.parse('2026-09-29T04:00:00.000Z') + minute * 60_000).toISOString(),
});

describe('evaluateOutcome (0009 AC-6)', () => {
  it('marks a LONG WON when target prints before stop', () => {
    const result = evaluateOutcome(signal('LONG'), [candle(-5, 95, 94, 94.5), candle(1, 101, 99.5, 100.5), candle(2, 102.5, 100, 102), candle(3, 101, 98, 98.5)]);
    expect(result).toEqual({ actual_high: 102.5, actual_low: 94, actual_close: 98.5, outcome_status: 'WON', outcome_pnl_pct: 2 });
  });

  it('ignores candles at or before the trigger candle', () => {
    const result = evaluateOutcome(signal('LONG'), [candle(0, 105, 100, 104), candle(1, 101, 100, 100.5)]);
    expect(result?.outcome_status).toBe('NEUTRAL');
    expect(result?.outcome_pnl_pct).toBe(0.5);
  });

  it('treats a candle spanning both levels as LOST', () => {
    expect(evaluateOutcome(signal('LONG'), [candle(1, 103, 98, 100)])?.outcome_status).toBe('LOST');
  });

  it('signs SHORT pnl in the trade direction', () => {
    const won = evaluateOutcome(signal('SHORT'), [candle(1, 100, 97.5, 98)]);
    expect(won?.outcome_status).toBe('WON');
    expect(won?.outcome_pnl_pct).toBe(2);
    const lost = evaluateOutcome(signal('SHORT'), [candle(1, 101.5, 100, 101)]);
    expect(lost?.outcome_status).toBe('LOST');
    expect(lost?.outcome_pnl_pct).toBe(-1);
  });

  it('returns null without candles or a target', () => {
    expect(evaluateOutcome(signal('LONG'), [])).toBeNull();
    expect(evaluateOutcome(signal('LONG', { target_1: null, snapshot_json: { symbol: 'X', reference_entry: 100 } }), [candle(1, 1, 1, 1)])).toBeNull();
  });
});

describe('reconcileOutcomes (0009 AC-7, AC-8)', () => {
  function clientWith(signals: any[], candles: OutcomeCandle[]) {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const from = vi.fn((table: string) => {
      const q: any = {};
      for (const m of ['select', 'gte', 'lt', 'eq']) q[m] = vi.fn(() => q);
      if (table === 'signals') {
        q.lt = vi.fn().mockResolvedValue({ data: signals, error: null });
        q.update = update;
      } else {
        q.order = vi.fn().mockResolvedValue({ data: candles, error: null });
      }
      return q;
    });
    return { client: { from } as any, update };
  }

  it('writes the same outcome on every run (idempotent)', async () => {
    const { client, update } = clientWith([signal('LONG')], [candle(1, 102.5, 100, 102)]);

    const first = await reconcileOutcomes(client, '2026-09-29');
    const second = await reconcileOutcomes(client, '2026-09-29');

    expect(first).toEqual({ reconciled: 1, skipped: 0 });
    expect(second).toEqual(first);
    expect(update.mock.calls[0]).toEqual(update.mock.calls[1]);
    expect(update.mock.calls[0][0]).toMatchObject({ outcome_status: 'WON', actual_close: 102, reconciled_at: '2026-09-29T10:00:00.000Z' });
  });

  it('skips signals without a symbol or candles', async () => {
    const { client, update } = clientWith([signal('LONG', { snapshot_json: {} }), signal('LONG')], []);
    expect(await reconcileOutcomes(client, '2026-09-29')).toEqual({ reconciled: 0, skipped: 2 });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('IST day helpers', () => {
  it('bounds the IST day and cash session in UTC', () => {
    const r = istDayRange('2026-09-29');
    expect(r.dayStart.toISOString()).toBe('2026-09-28T18:30:00.000Z');
    expect(r.sessionStart.toISOString()).toBe('2026-09-29T03:45:00.000Z');
    expect(r.sessionEnd.toISOString()).toBe('2026-09-29T10:00:00.000Z');
    expect(r.dayEnd.toISOString()).toBe('2026-09-29T18:30:00.000Z');
  });

  it('rolls to the next IST date after 18:30 UTC', () => {
    expect(istDateString(new Date('2026-09-29T18:29:00Z'))).toBe('2026-09-29');
    expect(istDateString(new Date('2026-09-29T18:30:00Z'))).toBe('2026-09-30');
  });
});
