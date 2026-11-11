import { describe, expect, it } from 'vitest';
import { buildScorecard, ScorecardSignal, timeBucketOf, toTrade } from './aggregate.js';

let seq = 0;
function sig(over: Partial<ScorecardSignal> & { entry?: number; stop?: number | null } = {}): ScorecardSignal {
  const { entry = 100, stop = 98, ...rest } = over;
  return {
    id: `s${++seq}`,
    created_at: '2026-11-10T04:30:00.000Z', // 10:00 IST
    direction: 'LONG',
    setup_family: 'BREAKOUT_MOMENTUM',
    strategy_id: 'breakout_momentum',
    strategy_version: '1.0',
    market_regime: 'BULLISH_TREND_DAY',
    news_gate: 'pass',
    outcome_status: 'WON',
    outcome_pnl_pct: 4,
    entry_low: entry,
    snapshot_json: { reference_entry: entry, stop: stop === null ? undefined : { level: stop } },
    ...rest,
  };
}

const settings = { minSample: 30, riskBudget: 1000 };

describe('toTrade', () => {
  it('computes gross R from the signed pnl percent (AC-3)', () => {
    // entry 100, stop 98: risk 2 per share. +4% = +4 per share = +2R.
    expect(toTrade(sig(), null, 1000)!.grossR).toBeCloseTo(2);
  });

  it('keeps the sign for a short (pnl pct is already direction signed)', () => {
    const t = toTrade(sig({ direction: 'SHORT', entry: 100, stop: 102, outcome_status: 'LOST', outcome_pnl_pct: -2 }), null, 1000)!;
    expect(t.grossR).toBeCloseTo(-1);
  });

  it('charges cost in R from risk budget sizing (AC-6)', () => {
    // qty = floor(1000 / 2) = 500; cost R = 40 / (500 * 2) = 0.04.
    const t = toTrade(sig(), 40, 1000)!;
    expect(t.costR).toBeCloseTo(0.04);
    expect(t.netR).toBeCloseTo(1.96);
    expect(t.estimatedCost).toBe(false);
  });

  it('falls back to the ₹20 default and flags it', () => {
    const t = toTrade(sig(), null, 1000)!;
    expect(t.costR).toBeCloseTo(0.02);
    expect(t.estimatedCost).toBe(true);
  });

  it('never sizes below one share', () => {
    // risk 50 per share, budget 10: qty 1, cost R = 20 / 50.
    expect(toTrade(sig({ entry: 100, stop: 50 }), null, 10)!.costR).toBeCloseTo(0.4);
  });

  it('rejects a missing stop or zero risk as invalid (AC-3)', () => {
    expect(toTrade(sig({ stop: null }), null, 1000)).toBeNull();
    expect(toTrade(sig({ entry: 100, stop: 100 }), null, 1000)).toBeNull();
  });

  it('groups guru setups by rule id (AC-7)', () => {
    const t = toTrade(sig({ setup_family: 'GURU', strategy_id: 'guru:orb', snapshot_json: { reference_entry: 100, stop: { level: 98 }, setup: 'orb' } }), null, 1000)!;
    expect(t.setup).toBe('orb');
    expect(t.strategyId).toBe('guru:orb');
  });
});

describe('timeBucketOf', () => {
  it('maps IST times to session phases, edges start inclusive', () => {
    expect(timeBucketOf('2026-11-10T03:45:00.000Z')).toBe('opening'); // 09:15
    expect(timeBucketOf('2026-11-10T04:30:00.000Z')).toBe('morning'); // 10:00
    expect(timeBucketOf('2026-11-10T06:00:00.000Z')).toBe('midday'); // 11:30
    expect(timeBucketOf('2026-11-10T09:15:00.000Z')).toBe('late'); // 14:45
    expect(timeBucketOf('2026-11-10T10:00:00.000Z')).toBe('other'); // 15:30
    expect(timeBucketOf('2026-11-10T03:00:00.000Z')).toBe('other'); // 08:30
  });
});

describe('buildScorecard', () => {
  const rows = [
    sig({ outcome_status: 'WON', outcome_pnl_pct: 4 }), // +2R
    sig({ outcome_status: 'LOST', outcome_pnl_pct: -2 }), // -1R
    sig({ outcome_status: 'NEUTRAL', outcome_pnl_pct: 1 }), // +0.5R
    sig({ outcome_status: 'LOST', outcome_pnl_pct: -2, strategy_id: 'guru:orb', setup_family: 'GURU', news_gate: null, market_regime: null, created_at: '2026-11-10T10:30:00.000Z' }),
    sig({ stop: null }), // invalid risk
    sig({ outcome_status: null }), // unreconciled, ignored here
  ];
  const card = buildScorecard(rows, new Map(), settings);

  it('counts wins over all trades, neutrals included (AC-4, AC-5)', () => {
    expect(card.overall.trades).toBe(4);
    expect(card.overall.wins).toBe(1);
    expect(card.overall.losses).toBe(2);
    expect(card.overall.neutrals).toBe(1);
    expect(card.overall.winRate).toBe(0.25);
    expect(card.overall.avgWinR).toBeCloseTo(2);
    expect(card.overall.avgLossR).toBeCloseTo(-1);
    expect(card.overall.avgRGross).toBeCloseTo(0.125);
    expect(card.invalidRisk).toBe(1);
  });

  it('every cut adds up to the overall total (AC-7, AC-13)', () => {
    for (const rowsOfCut of Object.values(card.cuts)) {
      expect(rowsOfCut.reduce((a, r) => a + r.trades, 0)).toBe(card.overall.trades);
    }
  });

  it('labels missing regime and news verdict, and the Other time bucket', () => {
    expect(card.cuts.regime.map(r => r.key)).toContain('Unknown');
    expect(card.cuts.newsVerdict.map(r => r.key)).toContain('Not checked');
    expect(card.cuts.timeBucket.map(r => r.key)).toEqual(['morning', 'other']);
  });

  it('flags rows below the minimum sample (AC-8)', () => {
    expect(card.overall.tooFew).toBe(true);
    expect(buildScorecard(rows, new Map(), { ...settings, minSample: 4 }).overall.tooFew).toBe(false);
  });

  it('builds a cumulative net R line per strategy (AC-10)', () => {
    const line = card.curve.find(l => l.strategyId === 'breakout_momentum')!;
    expect(line.points).toHaveLength(3);
    expect(line.points.at(-1)!.cumNetR).toBeCloseTo(1.5 - 3 * 0.02);
  });

  it('is deterministic (AC-13)', () => {
    expect(buildScorecard(rows, new Map(), settings)).toEqual(card);
  });
});
