import { describe, it, expect } from 'vitest';
import { referenceEntryOf, stopOf, target1Of, toApiSignal } from './signalMapper.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'sig-1', direction: 'LONG', setup_family: 'VWAP_TREND', status: 'ACTIVE', created_at: '2026-09-30T04:00:00Z',
  entry_low: 99.95, entry_high: 100.05, target_1: 102,
  snapshot_json: { symbol: 'RELIANCE', reference_entry: 100, stop: { price: 99, level: 99 }, targets: { t1: 102, t2: null }, confidence: 85 },
  ...overrides,
});

describe('signalMapper', () => {
  it('maps a saved signal row to the web Signal shape', () => {
    expect(toApiSignal(row())).toMatchObject({
      id: 'sig-1', symbol: 'RELIANCE', direction: 'LONG', setup: 'VWAP_TREND', status: 'ACTIVE',
      referenceEntry: 100, stop: 99, targets: { t1: 102, t2: null }, confidence: 85,
    });
  });

  it('carries live exit fields, converting a NUMERIC string to a number (covers 0010 AC-8)', () => {
    const mapped = toApiSignal(row({ status: 'TARGET_HIT', exit_price: '102.1', exit_at: '2026-09-30T05:12:00Z', exit_reason: 'TARGET' }));
    expect(mapped).toMatchObject({ status: 'TARGET_HIT', exitPrice: 102.1, exitAt: '2026-09-30T05:12:00Z', exitReason: 'TARGET' });
  });

  it('leaves exit fields null while a plan is open', () => {
    expect(toApiSignal(row())).toMatchObject({ exitPrice: null, exitAt: null, exitReason: null });
  });

  it('reads plan levels the way reconciliation, replay and exit tracking do', () => {
    expect(referenceEntryOf(row())).toBe(100);
    expect(stopOf(row())).toBe(99);
    expect(target1Of(row())).toBe(102);
  });

  it('falls back sensibly when the snapshot lacks levels', () => {
    const bare = row({ snapshot_json: { symbol: 'X' }, target_1: null, entry_low: 50 });
    expect(referenceEntryOf(bare)).toBe(50);
    expect(stopOf(bare)).toBeCloseTo(49.5);
    expect(target1Of(bare)).toBeNull();
  });
});
