import { Candle, HistoricalCandle } from '../market-data/types.js';

const MINUTE = 60_000;
const FIVE_MINUTES = 5 * MINUTE;

/**
 * Turns historical 1m candles into completed 1m and 5m candles for a stock that joined
 * mid session (spec 0009 AC-15). Only minutes that ended before `now` count, and a 5m
 * candle is built only from a 5 minute window that has fully elapsed. IST is a whole
 * number of 5 minute steps from UTC, so epoch aligned windows match IST windows.
 */
export function buildBackfill(symbol: string, token: string, rows: HistoricalCandle[], now: Date) {
  const currentMinute = Math.floor(now.getTime() / MINUTE) * MINUTE;
  const oneMinute: Candle[] = rows
    .filter(r => r.startTime.getTime() < currentMinute)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map(r => toCandle(symbol, token, '1m', r.startTime, MINUTE, r));

  const groups = new Map<number, Candle[]>();
  for (const c of oneMinute) {
    const bucket = Math.floor(c.startTime.getTime() / FIVE_MINUTES) * FIVE_MINUTES;
    if (bucket + FIVE_MINUTES > currentMinute) continue;
    groups.set(bucket, [...(groups.get(bucket) ?? []), c]);
  }
  const fiveMinute: Candle[] = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucket, cs]) => toCandle(symbol, token, '5m', new Date(bucket), FIVE_MINUTES, {
      open: cs[0].open,
      high: Math.max(...cs.map(c => c.high)),
      low: Math.min(...cs.map(c => c.low)),
      close: cs[cs.length - 1].close,
      volume: cs.reduce((sum, c) => sum + c.volume, 0)
    }));

  return { oneMinute, fiveMinute };
}

function toCandle(
  symbol: string,
  token: string,
  timeframe: '1m' | '5m',
  startTime: Date,
  lengthMs: number,
  v: { open: number; high: number; low: number; close: number; volume: number }
): Candle {
  return {
    symbol,
    instrumentToken: token,
    timeframe,
    open: v.open,
    high: v.high,
    low: v.low,
    close: v.close,
    volume: v.volume,
    startTime,
    endTime: new Date(startTime.getTime() + lengthMs),
    isComplete: true
  };
}
