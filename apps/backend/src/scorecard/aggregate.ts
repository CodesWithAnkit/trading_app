/**
 * Spec 0027: the Signal Scorecard math. Pure: the same rows and settings always give
 * the same output (AC-13). Nothing here reads or writes the database.
 */
import { referenceEntryOf } from '../scanner/signalMapper.js';
import { IST_TIMEZONE } from '../scanner/time/ist.js';

export const DEFAULT_CHARGES_INR = 20;
export const DEFAULT_RISK_BUDGET_INR = 1000;
export const DEFAULT_MIN_SAMPLE = 30;
export const CURVE_MAX_STRATEGIES = 8;

export type OutcomeStatus = 'WON' | 'LOST' | 'NEUTRAL';

/** The `signals` columns the scorecard reads. */
export type ScorecardSignal = {
  id: string;
  created_at: string;
  direction: string;
  setup_family: string;
  strategy_id: string | null;
  strategy_version: string | null;
  market_regime: string | null;
  news_gate: string | null;
  outcome_status: OutcomeStatus | null;
  outcome_pnl_pct: number | string | null;
  entry_low: number | string | null;
  snapshot_json: any;
};

export type ScorecardSettings = { minSample: number; riskBudget: number };

/** One counted trade, with everything the cuts group and average on. */
export type Trade = {
  id: string;
  createdAt: string;
  status: OutcomeStatus;
  grossR: number;
  costR: number;
  netR: number;
  estimatedCost: boolean;
  strategyId: string;
  setup: string;
  timeBucket: string;
  regime: string;
  newsVerdict: string;
};

export type Row = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number | null;
  avgWinR: number | null;
  avgLossR: number | null;
  avgRGross: number | null;
  expectancyNet: number | null;
  estimatedCostShare: number | null;
  tooFew: boolean;
};

export type CurveLine = { strategyId: string; points: { at: string; cumNetR: number }[] };

export type Scorecard = {
  overall: Row;
  cuts: { strategy: Row[]; setup: Row[]; timeBucket: Row[]; regime: Row[]; newsVerdict: Row[] };
  curve: CurveLine[];
  curveOmitted: string[];
  invalidRisk: number;
};

/** AC-7: IST session phases by the signal's fire time, start inclusive, end exclusive. */
export const TIME_BUCKETS: { key: string; label: string; from: number; to: number }[] = [
  { key: 'opening', label: 'Opening 09:15 to 10:00', from: 9 * 60 + 15, to: 10 * 60 },
  { key: 'morning', label: 'Morning 10:00 to 11:30', from: 10 * 60, to: 11 * 60 + 30 },
  { key: 'midday', label: 'Midday 11:30 to 13:30', from: 11 * 60 + 30, to: 13 * 60 + 30 },
  { key: 'afternoon', label: 'Afternoon 13:30 to 14:45', from: 13 * 60 + 30, to: 14 * 60 + 45 },
  { key: 'late', label: 'Late 14:45 to 15:30', from: 14 * 60 + 45, to: 15 * 60 + 30 },
];
const OTHER_BUCKET = { key: 'other', label: 'Other' };

const istClock = new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function timeBucketOf(createdAt: string): string {
  const parts = istClock.formatToParts(new Date(createdAt));
  const h = Number(parts.find(p => p.type === 'hour')?.value);
  const m = Number(parts.find(p => p.type === 'minute')?.value);
  const minute = h * 60 + m;
  return TIME_BUCKETS.find(b => minute >= b.from && minute < b.to)?.key ?? OTHER_BUCKET.key;
}

function bucketLabel(key: string): string {
  return TIME_BUCKETS.find(b => b.key === key)?.label ?? OTHER_BUCKET.label;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * AC-3 and AC-6: turns one reconciled signal into a trade, or null when its risk is
 * invalid (no stored `stop.level`, or entry equals stop). `stopOf` is not used on
 * purpose: its entry × 0.99 fallback would invent a stop.
 */
export function toTrade(signal: ScorecardSignal, chargesInr: number | null, riskBudget: number): Trade | null {
  if (!signal.outcome_status) return null;
  const pnlPct = num(signal.outcome_pnl_pct);
  const entry = referenceEntryOf(signal);
  const stop = num(signal.snapshot_json?.stop?.level);
  if (pnlPct === null || !entry || stop === null) return null;
  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare === 0) return null;

  // outcome_pnl_pct is already signed for direction (reconcileOutcomes), so no flip here.
  const grossR = (pnlPct / 100) * entry / riskPerShare;
  const charges = chargesInr ?? DEFAULT_CHARGES_INR;
  const qty = Math.max(1, Math.floor(riskBudget / riskPerShare));
  const costR = charges / (qty * riskPerShare);
  const isGuru = signal.setup_family === 'GURU';

  return {
    id: signal.id,
    createdAt: signal.created_at,
    status: signal.outcome_status,
    grossR,
    costR,
    netR: grossR - costR,
    estimatedCost: chargesInr === null,
    strategyId: signal.strategy_id ?? signal.setup_family.toLowerCase(),
    setup: isGuru ? String(signal.snapshot_json?.setup ?? 'GURU') : signal.setup_family,
    timeBucket: timeBucketOf(signal.created_at),
    regime: signal.market_regime ?? 'Unknown',
    newsVerdict: signal.news_gate ?? 'Not checked',
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (v: number | null, dp = 4) => (v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp);

/** AC-4, AC-5, AC-8: one row of the scorecard. */
export function summarize(key: string, label: string, trades: Trade[], minSample: number): Row {
  const wins = trades.filter(t => t.status === 'WON');
  const losses = trades.filter(t => t.status === 'LOST');
  const n = trades.length;
  return {
    key,
    label,
    trades: n,
    wins: wins.length,
    losses: losses.length,
    neutrals: n - wins.length - losses.length,
    winRate: n ? round(wins.length / n) : null,
    avgWinR: round(mean(wins.map(t => t.grossR))),
    avgLossR: round(mean(losses.map(t => t.grossR))),
    avgRGross: round(mean(trades.map(t => t.grossR))),
    expectancyNet: round(mean(trades.map(t => t.netR))),
    estimatedCostShare: n ? round(trades.filter(t => t.estimatedCost).length / n) : null,
    tooFew: n < minSample,
  };
}

function cut(trades: Trade[], keyOf: (t: Trade) => string, minSample: number, labelOf: (k: string) => string = k => k): Row[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = keyOf(t);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([k, ts]) => summarize(k, labelOf(k), ts, minSample))
    .sort((a, b) => b.trades - a.trades || a.key.localeCompare(b.key));
}

/** AC-10: cumulative net R per strategy, the top N by trade count. */
function curveOf(trades: Trade[], strategyRows: Row[]): { curve: CurveLine[]; curveOmitted: string[] } {
  const charted = strategyRows.slice(0, CURVE_MAX_STRATEGIES).map(r => r.key);
  const ordered = [...trades].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const curve = charted.map(strategyId => {
    let cum = 0;
    const points = ordered
      .filter(t => t.strategyId === strategyId)
      .map(t => ({ at: t.createdAt, cumNetR: round((cum += t.netR))! }));
    return { strategyId, points };
  });
  return { curve, curveOmitted: strategyRows.slice(CURVE_MAX_STRATEGIES).map(r => r.key) };
}

/**
 * Builds the whole scorecard from reconciled signals already filtered by the caller.
 * `chargesBySignal` holds the latest evidence `estimated_charges` per signal id.
 */
export function buildScorecard(
  signals: ScorecardSignal[],
  chargesBySignal: Map<string, number>,
  settings: ScorecardSettings
): Scorecard {
  const trades: Trade[] = [];
  let invalidRisk = 0;
  for (const s of signals) {
    if (!s.outcome_status) continue;
    const t = toTrade(s, chargesBySignal.get(s.id) ?? null, settings.riskBudget);
    if (t) trades.push(t);
    else invalidRisk++;
  }

  const min = settings.minSample;
  const bucketOrder = new Map([...TIME_BUCKETS.map(b => b.key), OTHER_BUCKET.key].map((k, i) => [k, i]));
  const strategy = cut(trades, t => t.strategyId, min);
  const timeBucket = cut(trades, t => t.timeBucket, min, bucketLabel)
    .sort((a, b) => bucketOrder.get(a.key)! - bucketOrder.get(b.key)!);

  return {
    overall: summarize('overall', 'All trades', trades, min),
    cuts: {
      strategy,
      setup: cut(trades, t => t.setup, min),
      timeBucket,
      regime: cut(trades, t => t.regime, min),
      newsVerdict: cut(trades, t => t.newsVerdict, min),
    },
    ...curveOf(trades, strategy),
    invalidRisk,
  };
}
