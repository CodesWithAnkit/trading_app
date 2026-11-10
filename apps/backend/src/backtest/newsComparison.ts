// Spec 0025 backtest news comparison: a run's covered trades scored with and without the
// live news gate (`news-gate-v1`), computed on request. Pure: the controller loads the rows.
import { evaluateNewsGate, GateItem, NEWS_GATE_VERSION, STALE_AFTER_MS } from '../intelligence/news/news-gate.js';
import { computeMetrics } from './engine/metrics.js';
import type { SimTrade } from './engine/simulate.js';

export const MIN_SAMPLE = 30;

export type TradeRow = {
  trade_date: string;
  side: 'LONG' | 'SHORT';
  entry_time: string;
  exit_time: string;
  entry: number | string;
  stop: number | string;
  target: number | string;
  exit: number | string;
  exit_reason: SimTrade['exitReason'];
  r_gross: number | string;
  cost_r: number | string;
  r_net: number | string;
};

export type ComparisonMetrics = { trades: number; winRate: number; netR: number; profitFactor: number; maxDrawdownR: number };

export type NewsComparison = {
  runId: string;
  symbol: string;
  gateVersion: typeof NEWS_GATE_VERSION;
  coveredDays: number;
  coveredTrades: number;
  totalTrades: number;
  sampleTooSmall: boolean;
  without: ComparisonMetrics;
  with: ComparisonMetrics;
  blocked: Array<{ tradeDate: string; side: 'LONG' | 'SHORT'; rNet: number; itemIds: string[]; reason: string }>;
  warnedTrades: number;
};

/** A field by field rename to the engine's trade shape (no recomputation). */
const toSim = (t: TradeRow): SimTrade => ({
  tradeDate: t.trade_date,
  side: t.side,
  entryTime: new Date(t.entry_time),
  entry: Number(t.entry),
  stop: Number(t.stop),
  target: Number(t.target),
  exitTime: new Date(t.exit_time),
  exit: Number(t.exit),
  exitReason: t.exit_reason,
  rGross: Number(t.r_gross),
  costR: Number(t.cost_r),
  rNet: Number(t.r_net),
});

function metrics(trades: TradeRow[]): ComparisonMetrics {
  const { trades: n, winRate, netR, profitFactor, maxDrawdownR } = computeMetrics(trades.map(toSim), new Set());
  return { trades: n, winRate, netR, profitFactor, maxDrawdownR };
}

/** AC-2: covered when a `done` or `partial` fetch run finished in the 15 minutes before entry. */
export function isCovered(entryTime: string, goodRunFinishes: number[]): boolean {
  const at = new Date(entryTime).getTime();
  return goodRunFinishes.some(f => f <= at && f >= at - STALE_AFTER_MS);
}

/**
 * AC-2 to AC-5. `trades` may be only the run's trades that could be covered (entered after
 * news collection began); `totalTrades` is the run's full count. `items` are `MARKET` items.
 */
export function compareWithNews(input: {
  runId: string;
  symbol: string;
  totalTrades: number;
  trades: TradeRow[];
  goodRunFinishes: number[];
  items: GateItem[];
}): NewsComparison {
  const covered = input.trades.filter(t => isCovered(t.entry_time, input.goodRunFinishes));
  const blocked: NewsComparison['blocked'] = [];
  const kept: TradeRow[] = [];
  let warnedTrades = 0;
  for (const t of covered) {
    // Backtest entries are judged without the staleness rule (child spec step 6): coverage
    // already requires a good fetch in the 15 minutes before entry.
    const v = evaluateNewsGate({ symbol: input.symbol, side: t.side, at: new Date(t.entry_time), lastGoodFetchAt: null, ignoreStaleness: true }, input.items);
    if (v.result === 'block') {
      blocked.push({ tradeDate: t.trade_date, side: t.side, rNet: Number(t.r_net), itemIds: v.itemIds, reason: v.reason });
      continue;
    }
    if (v.result === 'warn') warnedTrades++;
    kept.push(t);
  }
  const coveredDays = new Set(covered.map(t => t.trade_date)).size;
  return {
    runId: input.runId,
    symbol: input.symbol,
    gateVersion: NEWS_GATE_VERSION,
    coveredDays,
    coveredTrades: covered.length,
    totalTrades: input.totalTrades,
    sampleTooSmall: covered.length < MIN_SAMPLE,
    without: metrics(covered),
    with: metrics(kept),
    blocked,
    warnedTrades,
  };
}
