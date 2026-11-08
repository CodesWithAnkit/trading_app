// Pure types for the guru rules (spec 0020). No backtest or Nest imports here:
// phase 2 calls these same rule functions from the live engine.

export type Bar = {
  /** Bar open time (UTC instant). A bar is closed at t + 5 minutes. */
  t: Date;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type DailyBar = { date: string; o: number; h: number; l: number; c: number };

export type Side = 'LONG' | 'SHORT';

/** Context a rule sees at the close of bar i. Everything here is causal (uses data up to i only). */
export type RuleContext = {
  /** All bars of the series, but a rule may only read indexes <= i. */
  bars: Bar[];
  i: number;
  /** Index of the first bar of bar i's trading day. */
  dayStart: number;
  /** IST minutes since midnight of bar i's open. */
  minuteOfDay: number;
  /** Previous trading day's daily bar, and Wilder ATR(14) of daily bars up to the previous day. */
  prevDay: DailyBar | null;
  dailyAtr: number | null;
  ema: { e5: number[]; e9: number[]; e15: number[] };
  /** Wilder ATR(14) on 5m bars, indexed like bars. */
  atr5: number[];
  /** Trades already opened today by this rule. */
  tradesToday: number;
  /** Seeded random source in [0, 1). Only BASE_COIN uses it. */
  random: () => number;
};

/**
 * An order a rule places at the close of bar i.
 * STOP: a stop entry at `trigger`, valid on the next bar only (or the rest of the day for `validity: 'DAY'`).
 * CLOSE: enter at the close of bar i.
 * The stop is either an absolute price or a distance from the actual fill.
 */
export type Order = {
  side: Side;
  kind: 'STOP' | 'CLOSE';
  trigger?: number;
  validity?: 'NEXT_BAR' | 'DAY';
  stop: { price: number } | { distance: number };
  targetR: number;
  /** Orders sharing an OCO group cancel each other once one fills. */
  oco?: string;
};

export type GuruRuleId = 'GJ_PDHL' | 'MR_EMA_PIN' | 'UP_ORB' | 'SP_5EMA' | 'AST_RG' | 'BASE_COIN';

export type GuruRule = {
  id: GuruRuleId;
  name: string;
  maxTradesPerDay: number;
  onBarClose(ctx: RuleContext): Order[];
};
