import { EMA } from 'technicalindicators';

export type TrendState = 'UP' | 'DOWN' | 'UNKNOWN';

export type MomentumStock = {
  symbol: string;
  ltp: number;
  dayChangePct: number;
  volume: number;
  relativeVolume: number;
  trend: TrendState;
  /** False until the previous close is known; the score is 0 meanwhile (spec 0009 AC-14). */
  ranked: boolean;
  momentumScore: number;
  lastTickAt: string;
};

type CandleLike = { close: number; volume: number };

// Aligned trends amplify the move, counter trends damp it, unknown stays neutral.
const TREND_ALIGNMENT: Record<TrendState, number> = { UP: 1, UNKNOWN: 0.5, DOWN: 0.25 };

/** Daily momentum score: % change * relative volume * trend alignment. */
export function calculateMomentumScore(dayChangePct: number, relativeVolume: number, trend: TrendState): number {
  const score = dayChangePct * relativeVolume * TREND_ALIGNMENT[trend];
  return Math.round(score * 100) / 100;
}

/** Trend from the 5m EMA(9) vs EMA(21) cross; UNKNOWN until 21 candles exist. */
export function trendFrom5m(hist5m: CandleLike[]): TrendState {
  if (hist5m.length < 21) return 'UNKNOWN';
  const closes = hist5m.map(c => c.close);
  const ema9 = EMA.calculate({ period: 9, values: closes }).at(-1);
  const ema21 = EMA.calculate({ period: 21, values: closes }).at(-1);
  if (ema9 === undefined || ema21 === undefined) return 'UNKNOWN';
  return ema9 >= ema21 ? 'UP' : 'DOWN';
}

/** Latest completed 5m volume against the average of the ones before it; 1 when there is no baseline. */
export function relativeVolumeFrom5m(hist5m: CandleLike[]): number {
  if (hist5m.length < 2) return 1;
  const latest = hist5m[hist5m.length - 1].volume;
  const prior = hist5m.slice(0, -1);
  const avg = prior.reduce((sum, c) => sum + c.volume, 0) / prior.length;
  if (avg <= 0) return 1;
  return Math.round((latest / avg) * 100) / 100;
}

export function rankByMomentum(stocks: MomentumStock[]): MomentumStock[] {
  return [...stocks].sort((a, b) => b.momentumScore - a.momentumScore);
}
