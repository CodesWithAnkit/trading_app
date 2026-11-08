import { Bar, DailyBar } from './types.js';

/** Exponential moving average over closes. Causal: value i uses closes 0..i only. */
export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function trueRange(h: number, l: number, prevClose: number | null): number {
  if (prevClose === null) return h - l;
  return Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
}

/** Wilder ATR. Values before `period` bars exist are NaN. */
export function wilderAtr(bars: { h: number; l: number; c: number }[], period = 14): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  let sum = 0;
  let atr = NaN;
  for (let i = 0; i < bars.length; i++) {
    const tr = trueRange(bars[i].h, bars[i].l, i > 0 ? bars[i - 1].c : null);
    if (i < period) {
      sum += tr;
      if (i === period - 1) {
        atr = sum / period;
        out[i] = atr;
      }
    } else {
      atr = (atr * (period - 1) + tr) / period;
      out[i] = atr;
    }
  }
  return out;
}

export function emaSet(bars: Bar[]) {
  const closes = bars.map((b) => b.c);
  return { e5: ema(closes, 5), e9: ema(closes, 9), e15: ema(closes, 15) };
}

/** ATR(14) of daily bars, keyed by date: the value for date D uses daily bars strictly before D. */
export function priorDayAtrByDate(daily: DailyBar[]): Map<string, number> {
  const atr = wilderAtr(daily, 14);
  const map = new Map<string, number>();
  for (let i = 1; i < daily.length; i++) {
    if (!Number.isNaN(atr[i - 1])) map.set(daily[i].date, atr[i - 1]);
  }
  return map;
}
