import { describe, it, expect } from 'vitest';
import { replaySymbol, summarize } from './replayDay.js';
import { Candle } from '../market-data/types.js';

// 09:15 IST = 03:45 UTC
const at = (minute: number) => new Date(Date.UTC(2026, 8, 29, 3, 45 + minute));
const candle = (minute: number, close: number, spread = 0.2): Candle => ({
  symbol: 'TEST', instrumentToken: '1', timeframe: '1m',
  open: close, high: close + spread, low: close - spread, close, volume: 1000,
  startTime: at(minute), endTime: at(minute + 1), isComplete: true
});

describe('replaySymbol', () => {
  it('fires only on 5m closes, after enough history, and scores each plan on later candles', () => {
    // 35 flat minutes, then a push above VWAP at minute 39 (the last minute of the 09:50 window), then a rally.
    const candles = Array.from({ length: 39 }, (_, m) => candle(m, 100));
    candles.push(candle(39, 101));
    for (let m = 40; m < 60; m++) candles.push(candle(m, 101 + (m - 39) * 0.3));

    const trades = replaySymbol('TEST', candles);

    expect(trades.length).toBeGreaterThan(0);
    for (const t of trades) {
      // Triggers are the last 1m candle of a 5m window, never earlier than 25 minutes in.
      const minute = (new Date(t.firedAt).getTime() - at(0).getTime()) / 60_000;
      expect(minute % 5).toBe(4);
      expect(minute).toBeGreaterThanOrEqual(24);
      if (t.exitAt) expect(t.exitAt > t.firedAt).toBe(true);
    }
    const vwap = trades.find(t => t.setup === 'VWAP_TREND');
    expect(vwap).toMatchObject({ firedAt: at(39).toISOString(), entry: 101, outcome: 'WON' });
  });

  it('flags a setup that fires again while its earlier plan is still open', () => {
    const candles = Array.from({ length: 30 }, (_, m) => candle(m, 100 + m * 0.5, 0.05)); // steady climb
    for (let m = 30; m < 60; m++) candles.push(candle(m, 115 + (m - 30) * 0.5, 0.05));
    const trades = replaySymbol('TEST', candles);

    const summary = summarize(trades);
    const all = summary.find(s => s.setup === 'ALL')!;
    expect(all.trades).toBe(trades.filter(t => !t.repeat).length);
    expect(all.won + all.lost + all.neutral).toBe(all.trades);
  });

  it('returns nothing before the engine has 25 minutes of history', () => {
    expect(replaySymbol('TEST', Array.from({ length: 20 }, (_, m) => candle(m, 100)))).toEqual([]);
  });
});
