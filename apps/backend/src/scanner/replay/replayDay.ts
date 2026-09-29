import { Candle } from '../market-data/types.js';
import { evaluateAllStrategies } from '../strategy/setup/multiStrategyEngine.js';
import { findPlanExit, OutcomeStatus } from '../outcomes/reconcileOutcomes.js';

const FIVE_MINUTES = 5 * 60_000;

export type ReplayTrade = {
  symbol: string;
  setup: string;
  direction: 'LONG' | 'SHORT';
  /** Start of the 1m candle that triggered it, like a live signal's created_at. */
  firedAt: string;
  entry: number;
  stop: number;
  target: number;
  riskReward: number;
  outcome: OutcomeStatus;
  exitAt: string | null;
  exitPrice: number;
  pnlPct: number;
  /** The same setup fired again while an earlier plan for this stock was still open; live would store both. */
  repeat: boolean;
  planIssues: string[];
};

type StrategyCandle = ReturnType<typeof toStrategyCandle>;

/**
 * Replays one stock's day through the live strategy engine without look ahead:
 * candles join the history in time order, strategies run on each completed 5m candle
 * (as `ScannerService` does), and each plan is scored only on later candles.
 */
export function replaySymbol(symbol: string, oneMinute: Candle[]): ReplayTrade[] {
  const sorted = [...oneMinute].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const outcomeCandles = sorted.map(c => ({ high: c.high, low: c.low, close: c.close, start_time: c.startTime.toISOString() }));

  const buckets = new Map<number, Candle[]>();
  for (const c of sorted) {
    const bucket = Math.floor(c.startTime.getTime() / FIVE_MINUTES) * FIVE_MINUTES;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), c]);
  }

  const hist1m: StrategyCandle[] = [];
  const hist5m: StrategyCandle[] = [];
  const trades: ReplayTrade[] = [];

  for (const [bucket, candles] of [...buckets.entries()].sort(([a], [b]) => a - b)) {
    candles.forEach(c => hist1m.push(toStrategyCandle(c, '1m')));
    hist5m.push(toStrategyCandle({
      ...candles[0],
      startTime: new Date(bucket),
      high: Math.max(...candles.map(c => c.high)),
      low: Math.min(...candles.map(c => c.low)),
      close: candles[candles.length - 1].close,
      volume: candles.reduce((sum, c) => sum + c.volume, 0)
    }, '5m'));

    const current1m = hist1m[hist1m.length - 1];
    const current5m = hist5m[hist5m.length - 1];
    const candidates = evaluateAllStrategies(symbol, current1m as any, hist1m as any, current5m as any, hist5m as any);

    for (const cand of candidates) {
      if (!cand.valid || cand.dynamicEntry === undefined || cand.dynamicStop === undefined || cand.dynamicTarget === undefined) continue;
      const plan = { direction: 'LONG', entry: cand.dynamicEntry, stop: cand.dynamicStop, target: cand.dynamicTarget, firedAt: current1m.timestamp };
      const exit = findPlanExit(plan, outcomeCandles)!;
      const repeat = trades.some(t =>
        t.setup === cand.setupFamily && t.firedAt < plan.firedAt && (t.exitAt === null || t.exitAt > plan.firedAt)
      );
      const risk = plan.entry - plan.stop;
      trades.push({
        symbol,
        setup: cand.setupFamily,
        direction: 'LONG',
        firedAt: plan.firedAt,
        entry: round2(plan.entry),
        stop: round2(plan.stop),
        target: round2(plan.target),
        riskReward: risk > 0 ? round2((plan.target - plan.entry) / risk) : 0,
        outcome: exit.status,
        exitAt: exit.exitAt,
        exitPrice: round2(exit.exitPrice),
        pnlPct: exit.pnlPct,
        repeat,
        planIssues: planIssues(plan)
      });
    }
  }
  return trades;
}

/** Sanity checks on a LONG plan; any hit means the strategy produced a plan no one should trade. */
function planIssues(p: { entry: number; stop: number; target: number }): string[] {
  const issues: string[] = [];
  if (p.stop >= p.entry) issues.push('stop at or above entry');
  if (p.target <= p.entry) issues.push('target at or below entry');
  const riskPct = ((p.entry - p.stop) / p.entry) * 100;
  if (riskPct > 0 && riskPct < 0.1) issues.push(`risk only ${riskPct.toFixed(2)}% (costs eat it)`);
  if (riskPct > 3) issues.push(`risk ${riskPct.toFixed(1)}% is very wide for intraday`);
  return issues;
}

export type SetupSummary = { setup: string; trades: number; won: number; lost: number; neutral: number; winRatePct: number; avgPnlPct: number; totalPnlPct: number };

/** Per strategy results over first signals only (repeats excluded), plus an ALL row. */
export function summarize(trades: ReplayTrade[]): SetupSummary[] {
  const firsts = trades.filter(t => !t.repeat);
  const row = (setup: string, ts: ReplayTrade[]): SetupSummary => {
    const won = ts.filter(t => t.outcome === 'WON').length;
    const lost = ts.filter(t => t.outcome === 'LOST').length;
    const total = ts.reduce((sum, t) => sum + t.pnlPct, 0);
    return {
      setup, trades: ts.length, won, lost, neutral: ts.length - won - lost,
      winRatePct: ts.length ? Math.round((won / ts.length) * 100) : 0,
      avgPnlPct: ts.length ? round2(total / ts.length) : 0,
      totalPnlPct: round2(total)
    };
  };
  const setups = [...new Set(firsts.map(t => t.setup))].sort();
  return [...setups.map(s => row(s, firsts.filter(t => t.setup === s))), row('ALL', firsts)];
}

function toStrategyCandle(c: Candle, timeframe: '1m' | '5m') {
  return {
    symbol: c.symbol,
    timestamp: c.startTime.toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    exchange: 'NSE',
    timeframe,
    isComplete: true
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
