import { GuruRule, Order, RuleContext } from './types.js';

// Rule definitions v1, pre-registered in spec 0020. Do not tune: a change is a new version.
export const DEFINITIONS_VERSION = 'v1';

const ORB_START = 9 * 60 + 15;
const ORB_END = 9 * 60 + 45; // range = bars opening 09:15..09:40 (6 bars)
const COIN_BAR_OPEN = 9 * 60 + 25; // the bar that closes at 09:30

function body(o: number, c: number) {
  return Math.abs(c - o);
}

/** Gautam Jha: previous day high / low breakout. Stop 0.5 x daily ATR, target 10R, one trade a day. */
export const GJ_PDHL: GuruRule = {
  id: 'GJ_PDHL',
  name: 'Gautam Jha · previous day high/low break',
  maxTradesPerDay: 1,
  onBarClose(ctx) {
    // Place the OCO pair once, at the close of the day's first bar; it stays valid all day.
    if (ctx.i !== ctx.dayStart || !ctx.prevDay || !ctx.dailyAtr) return [];
    const dist = 0.5 * ctx.dailyAtr;
    return [
      { side: 'LONG', kind: 'STOP', trigger: ctx.prevDay.h, validity: 'DAY', stop: { distance: dist }, targetR: 10, oco: 'pdhl' },
      { side: 'SHORT', kind: 'STOP', trigger: ctx.prevDay.l, validity: 'DAY', stop: { distance: dist }, targetR: 10, oco: 'pdhl' },
    ];
  },
};

/** Mayank Raj: EMA 9/15 rising, pin bar touching an EMA, buy stop at the pin high. Long only, 2R. */
export const MR_EMA_PIN: GuruRule = {
  id: 'MR_EMA_PIN',
  name: 'Mayank Raj · EMA 9/15 pin bar',
  maxTradesPerDay: Infinity,
  onBarClose(ctx) {
    const { bars, i, ema } = ctx;
    if (i < 3) return [];
    const b = bars[i];
    const e9 = ema.e9[i];
    const e15 = ema.e15[i];
    const rising = e9 > e15 && e9 > ema.e9[i - 3] && e15 > ema.e15[i - 3];
    if (!rising) return [];
    const range = b.h - b.l;
    if (range <= 0) return [];
    const lowerWick = Math.min(b.o, b.c) - b.l;
    const isPin = lowerWick >= 2 * body(b.o, b.c) && lowerWick >= 0.6 * range;
    const touches = b.l <= Math.max(e9, e15);
    if (!isPin || !touches) return [];
    return [{ side: 'LONG', kind: 'STOP', trigger: b.h, validity: 'NEXT_BAR', stop: { price: b.l }, targetR: 2 }];
  },
};

/** Umar Punjabi: 09:15 to 09:45 opening range, first 5m close outside it enters at the close. 2R. */
export const UP_ORB: GuruRule = {
  id: 'UP_ORB',
  name: 'Umar Punjabi · 30 min opening range breakout',
  maxTradesPerDay: 1,
  onBarClose(ctx) {
    const { bars, i, dayStart, minuteOfDay } = ctx;
    if (minuteOfDay < ORB_END) return [];
    // Collect the range bars (opening 09:15 .. 09:40).
    let hi = -Infinity;
    let lo = Infinity;
    let n = 0;
    for (let k = dayStart; k < i; k++) {
      const m = minuteOfDayOf(bars[k].t);
      if (m >= ORB_START && m < ORB_END) {
        hi = Math.max(hi, bars[k].h);
        lo = Math.min(lo, bars[k].l);
        n++;
      }
    }
    if (n < 6) return [];
    if (ctx.dailyAtr && hi - lo > 1.5 * ctx.dailyAtr) return [];
    // Only the FIRST close outside the range counts.
    for (let k = dayStart; k < i; k++) {
      const m = minuteOfDayOf(bars[k].t);
      if (m >= ORB_END && (bars[k].c > hi || bars[k].c < lo)) return [];
    }
    const c = bars[i].c;
    if (c > hi) return [{ side: 'LONG', kind: 'CLOSE', stop: { price: lo }, targetR: 2 }];
    if (c < lo) return [{ side: 'SHORT', kind: 'CLOSE', stop: { price: hi }, targetR: 2 }];
    return [];
  },
};

/** Subhash Pani: alert candle wholly above EMA5, sell stop at its low on the next bar. Short only, 3R. */
export const SP_5EMA: GuruRule = {
  id: 'SP_5EMA',
  name: 'Subhash Pani · 5 EMA alert candle',
  maxTradesPerDay: Infinity,
  onBarClose(ctx) {
    const b = ctx.bars[ctx.i];
    if (!(b.l > ctx.ema.e5[ctx.i])) return [];
    // Each new qualifying bar replaces the alert: a fresh one-bar order every time.
    return [{ side: 'SHORT', kind: 'STOP', trigger: b.l, validity: 'NEXT_BAR', stop: { price: b.h }, targetR: 3 }];
  },
};

/** Anish Singh Thakur: red bar, small green bar, then a close above the green high. 1:1, one trade a day. */
export const AST_RG: GuruRule = {
  id: 'AST_RG',
  name: 'Anish Singh Thakur · red then small green',
  maxTradesPerDay: 1,
  onBarClose(ctx) {
    const { bars, i, dayStart } = ctx;
    if (i - 2 < dayStart) return [];
    const red = bars[i - 2];
    const green = bars[i - 1];
    const cur = bars[i];
    const isRed = red.c < red.o;
    const isGreen = green.c > green.o;
    if (!isRed || !isGreen) return [];
    if (!(body(green.o, green.c) < 0.5 * body(red.o, red.c))) return [];
    if (!(cur.c > green.h)) return [];
    return [{ side: 'LONG', kind: 'CLOSE', stop: { price: green.l }, targetR: 1 }];
  },
};

/** Baseline: random side at the 09:30 close, stop 1 x ATR(14, 5m), target 2R. */
export const BASE_COIN: GuruRule = {
  id: 'BASE_COIN',
  name: 'Coin toss 1:2',
  maxTradesPerDay: 1,
  onBarClose(ctx) {
    if (ctx.minuteOfDay !== COIN_BAR_OPEN) return [];
    const atr = ctx.atr5[ctx.i];
    if (!atr || Number.isNaN(atr)) return [];
    const side = ctx.random() < 0.5 ? 'LONG' : 'SHORT';
    return [{ side, kind: 'CLOSE', stop: { distance: atr }, targetR: 2 } as Order];
  },
};

export const GURU_RULES: GuruRule[] = [GJ_PDHL, MR_EMA_PIN, UP_ORB, SP_5EMA, AST_RG];
export const ALL_RULES: GuruRule[] = [...GURU_RULES, BASE_COIN];

export function ruleById(id: string): GuruRule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}

const IST_OFFSET_MIN = 330;

/** IST minutes since midnight for a UTC instant. */
export function minuteOfDayOf(t: Date): number {
  const m = t.getUTCHours() * 60 + t.getUTCMinutes() + IST_OFFSET_MIN;
  return ((m % 1440) + 1440) % 1440;
}

/** IST calendar date (YYYY-MM-DD) for a UTC instant. */
export function istDate(t: Date): string {
  return new Date(t.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

export type { RuleContext };
