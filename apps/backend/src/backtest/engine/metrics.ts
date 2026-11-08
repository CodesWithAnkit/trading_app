import { SimTrade } from './simulate.js';

export type YearStat = { trades: number; netR: number; full: boolean };

export type Metrics = {
  trades: number;
  winRate: number; // 0..1
  netR: number;
  profitFactor: number;
  maxDrawdownR: number; // positive number, the largest peak to trough fall
  perYear: Record<string, YearStat>;
};

/** PF for a run with wins and no losses (spec 0020 precision rules). */
export const PF_NO_LOSSES = 99;

/** Metrics over trades ordered by exit time. `fullYears` are calendar years fully inside the window. */
export function computeMetrics(trades: SimTrade[], fullYears: Set<string>): Metrics {
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  let wins = 0;
  let gross = 0;
  let loss = 0;
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  const perYear: Record<string, YearStat> = {};
  for (const t of sorted) {
    if (t.rNet > 0) {
      wins++;
      gross += t.rNet;
    } else {
      loss += -t.rNet;
    }
    equity += t.rNet;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
    const y = t.tradeDate.slice(0, 4);
    const ys = (perYear[y] ??= { trades: 0, netR: 0, full: fullYears.has(y) });
    ys.trades++;
    ys.netR = r2(ys.netR + t.rNet);
  }
  const pf = loss === 0 ? (gross > 0 ? PF_NO_LOSSES : 0) : gross / loss;
  return {
    trades: sorted.length,
    winRate: sorted.length ? r4(wins / sorted.length) : 0,
    netR: r2(equity),
    profitFactor: r2(pf),
    maxDrawdownR: r2(maxDd),
    perYear,
  };
}

/**
 * Calendar years fully covered by [from, to] trading dates (YYYY-MM-DD).
 * A year is full when the range starts by its first week and ends in its last week.
 */
export function fullYearsBetween(from: string, to: string): Set<string> {
  const out = new Set<string>();
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  for (let y = y0; y <= y1; y++) {
    if (from <= `${y}-01-07` && to >= `${y}-12-24`) out.add(String(y));
  }
  return out;
}

/** The trading date at the 70% index: in sample is before it, out of sample from it. */
export function oosStartDate(tradingDays: string[], ratio = 0.7): string {
  if (tradingDays.length === 0) return '';
  return tradingDays[Math.min(tradingDays.length - 1, Math.floor(tradingDays.length * ratio))];
}

export type BuyHold = { returnPct: number; maxDrawdownPct: number; perYear: Record<string, { returnPct: number; full: boolean }> };

/** Buy and hold on closes: % return and % max drawdown only (never in R, never gated). */
export function buyAndHold(closes: { date: string; c: number }[], fullYears: Set<string>): BuyHold {
  if (closes.length < 2) return { returnPct: 0, maxDrawdownPct: 0, perYear: {} };
  const first = closes[0].c;
  let peak = first;
  let maxDd = 0;
  const yearFirst: Record<string, number> = {};
  const yearLast: Record<string, number> = {};
  let prevClose = first;
  for (const p of closes) {
    peak = Math.max(peak, p.c);
    maxDd = Math.max(maxDd, (peak - p.c) / peak);
    const y = p.date.slice(0, 4);
    if (!(y in yearFirst)) yearFirst[y] = prevClose;
    yearLast[y] = p.c;
    prevClose = p.c;
  }
  const perYear: BuyHold['perYear'] = {};
  for (const y of Object.keys(yearLast)) {
    perYear[y] = { returnPct: r2(((yearLast[y] - yearFirst[y]) / yearFirst[y]) * 100), full: fullYears.has(y) };
  }
  return {
    returnPct: r2(((closes[closes.length - 1].c - first) / first) * 100),
    maxDrawdownPct: r2(maxDd * 100),
    perYear,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
