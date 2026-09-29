import { Candle } from '../market-data/types.js';
import { evaluateAllStrategies } from '../strategy/setup/multiStrategyEngine.js';
import { findPlanExit, OutcomeStatus } from '../outcomes/reconcileOutcomes.js';
import { isAtOrAfterTimeExit } from '../universe/schedule.js';

const MINUTE = 60_000;
const FIVE_MINUTES = 5 * MINUTE;
const TOP_GAINERS = 20;

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
  /** NEUTRAL here means the plan was still open at 15:15 and closed as a time exit. */
  outcome: OutcomeStatus;
  exitAt: string | null;
  exitPrice: number;
  pnlPct: number;
  planIssues: string[];
};

export type ReplayOptions = {
  /** Whether the stock may open a plan in the 5m bucket starting at this time (the top 20 gate). */
  isAllowed?: (bucketStart: number) => boolean;
};

type StrategyCandle = ReturnType<typeof toStrategyCandle>;

/**
 * Replays one stock's day through the live strategy engine without look ahead, with the
 * live rules: strategies run on each completed 5m candle, no plan opens from a trigger
 * candle ending at or after 15:15 IST, one open plan per strategy, exits on target or stop,
 * else a time exit at 15:15 (spec 0009 AC-17, spec 0010).
 */
export function replaySymbol(symbol: string, oneMinute: Candle[], options: ReplayOptions = {}): ReplayTrade[] {
  const sorted = [...oneMinute].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  // Exits are judged only on candles before 15:15; the last of them stands in for the 15:15 price.
  const outcomeCandles = sorted
    .filter(c => !isAtOrAfterTimeExit(c.startTime))
    .map(c => ({ high: c.high, low: c.low, close: c.close, start_time: c.startTime.toISOString() }));

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
    if (isAtOrAfterTimeExit(new Date(new Date(current1m.timestamp).getTime() + MINUTE))) continue;
    if (options.isAllowed && !options.isAllowed(bucket)) continue;
    const candidates = evaluateAllStrategies(symbol, current1m as any, hist1m as any, current5m as any, hist5m as any);

    for (const cand of candidates) {
      if (!cand.valid || cand.dynamicEntry === undefined || cand.dynamicStop === undefined || cand.dynamicTarget === undefined) continue;
      const plan = { direction: 'LONG', entry: cand.dynamicEntry, stop: cand.dynamicStop, target: cand.dynamicTarget, firedAt: current1m.timestamp };
      // One open plan per stock and strategy, as live (spec 0010 AC-4).
      const stillOpen = trades.some(t => t.setup === cand.setupFamily && (t.exitAt === null || t.exitAt > plan.firedAt));
      if (stillOpen) continue;
      const exit = findPlanExit(plan, outcomeCandles);
      if (!exit) continue;
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
        planIssues: planIssues(plan)
      });
    }
  }
  return trades;
}

/**
 * Replays several stocks with an approximate top 20 gate: at each 5m bucket, stocks are
 * ranked by change from their first candle's open of the day (the previous close is not
 * stored), ties by symbol.
 */
export function replayDay(bySymbol: Map<string, Candle[]>): ReplayTrade[] {
  const firstOpen = new Map<string, number>();
  const closesByBucket = new Map<number, Map<string, number>>();
  for (const [symbol, candles] of bySymbol) {
    const sorted = [...candles].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (sorted.length === 0) continue;
    firstOpen.set(symbol, sorted[0].open);
    for (const c of sorted) {
      const bucket = Math.floor(c.startTime.getTime() / FIVE_MINUTES) * FIVE_MINUTES;
      const closes = closesByBucket.get(bucket) ?? new Map<string, number>();
      closes.set(symbol, c.close);
      closesByBucket.set(bucket, closes);
    }
  }

  const lastClose = new Map<string, number>();
  const topByBucket = new Map<number, Set<string>>();
  for (const bucket of [...closesByBucket.keys()].sort((a, b) => a - b)) {
    for (const [symbol, close] of closesByBucket.get(bucket)!) lastClose.set(symbol, close);
    const ranked = [...lastClose.entries()]
      .map(([symbol, close]) => ({ symbol, change: (close - firstOpen.get(symbol)!) / firstOpen.get(symbol)! }))
      .sort((a, b) => b.change - a.change || a.symbol.localeCompare(b.symbol))
      .slice(0, TOP_GAINERS);
    topByBucket.set(bucket, new Set(ranked.map(r => r.symbol)));
  }

  const trades: ReplayTrade[] = [];
  for (const [symbol, candles] of bySymbol) {
    trades.push(...replaySymbol(symbol, candles, { isAllowed: bucket => topByBucket.get(bucket)?.has(symbol) ?? false }));
  }
  return trades.sort((a, b) => a.firedAt.localeCompare(b.firedAt));
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

/** Per strategy results, plus an ALL row. */
export function summarize(trades: ReplayTrade[]): SetupSummary[] {
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
  const setups = [...new Set(trades.map(t => t.setup))].sort();
  return [...setups.map(s => row(s, trades.filter(t => t.setup === s))), row('ALL', trades)];
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
