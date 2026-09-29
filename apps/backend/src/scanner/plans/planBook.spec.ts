import { describe, it, expect } from 'vitest';
import { checkExit, pnlPct, Plan, PlanBook } from './planBook.js';

const plan = (overrides: Partial<Plan> = {}): Plan => ({
  signalId: 'sig-1', symbol: 'RELIANCE', setup: 'VWAP_TREND', direction: 'LONG',
  entry: 100, stop: 99, target: 102, firedAt: '2026-09-29T04:00:00.000Z', ...overrides
});

describe('checkExit (0010 AC-2)', () => {
  it('hits the target at or above it and the stop at or below it', () => {
    expect(checkExit(plan(), 100.5)).toBeNull();
    expect(checkExit(plan(), 102)).toBe('TARGET');
    expect(checkExit(plan(), 102.1)).toBe('TARGET');
    expect(checkExit(plan(), 99)).toBe('STOP');
    expect(checkExit(plan(), 98.9)).toBe('STOP');
  });

  it('ignores bad prices', () => {
    expect(checkExit(plan(), 0)).toBeNull();
    expect(checkExit(plan(), -5)).toBeNull();
    expect(checkExit(plan(), NaN)).toBeNull();
  });

  it('mirrors the levels for SHORT plans', () => {
    const short = plan({ direction: 'SHORT', stop: 101, target: 98 });
    expect(checkExit(short, 97.9)).toBe('TARGET');
    expect(checkExit(short, 101.2)).toBe('STOP');
    expect(pnlPct(short, 98)).toBe(2);
  });

  it('measures P&L from the entry', () => {
    expect(pnlPct(plan(), 102.1)).toBe(2.1);
    expect(pnlPct(plan(), 98.9)).toBe(-1.1);
  });
});

describe('PlanBook (0010 AC-4, AC-5)', () => {
  it('allows one open plan per stock and strategy', () => {
    const book = new PlanBook();
    expect(book.reserve(plan({ signalId: null }))).toBe(true);
    expect(book.reserve(plan({ signalId: null }))).toBe(false);
    expect(book.reserve(plan({ setup: 'BREAKOUT_MOMENTUM' }))).toBe(true);
    expect(book.openFor('RELIANCE')).toHaveLength(2);
  });

  it('attaches the signal id after the insert, and releases the slot if the insert fails', () => {
    const book = new PlanBook();
    book.reserve(plan({ signalId: null }));
    book.attach('RELIANCE', 'VWAP_TREND', 'sig-9');
    expect(book.openFor('RELIANCE')[0].signalId).toBe('sig-9');

    book.release('RELIANCE', 'VWAP_TREND');
    expect(book.has('RELIANCE', 'VWAP_TREND')).toBe(false);
  });

  it('hands a plan out only once', () => {
    const book = new PlanBook();
    book.reserve(plan());
    expect(book.take('RELIANCE', 'VWAP_TREND')).toBeDefined();
    expect(book.take('RELIANCE', 'VWAP_TREND')).toBeUndefined();
  });
});
