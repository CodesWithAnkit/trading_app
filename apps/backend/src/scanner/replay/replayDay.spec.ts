import { describe, it, expect } from 'vitest';
import { replayDay, replaySymbol, summarize } from './replayDay.js';
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

  it('never opens a second plan for a strategy while its first is still open (covers 0010 AC-4)', () => {
    const candles = Array.from({ length: 30 }, (_, m) => candle(m, 100 + m * 0.5, 0.05)); // steady climb
    for (let m = 30; m < 60; m++) candles.push(candle(m, 115 + (m - 30) * 0.5, 0.05));
    const trades = replaySymbol('TEST', candles);

    for (const t of trades) {
      const overlapping = trades.filter(o => o !== t && o.setup === t.setup && o.firedAt > t.firedAt && (t.exitAt === null || o.firedAt < t.exitAt));
      expect(overlapping).toEqual([]);
    }
    const all = summarize(trades).find(s => s.setup === 'ALL')!;
    expect(all.won + all.lost + all.neutral).toBe(all.trades);
  });

  it('opens nothing from 15:15 and time exits open plans at the last candle before 15:15 (covers 0010 AC-3)', () => {
    // 09:15 IST + 355 minutes = 15:10: a flat day with the same VWAP push at 15:09 and at 14:44.
    const day = Array.from({ length: 375 }, (_, m) => candle(m, 100));
    day[329] = candle(329, 101); // 14:44 trigger
    day[354] = candle(354, 101); // 15:09 trigger (its candle ends 15:10, still allowed)
    day[364] = candle(364, 101); // 15:19 trigger: must not open
    const trades = replaySymbol('TEST', day);

    expect(trades.every(t => new Date(t.firedAt).getTime() < at(360).getTime())).toBe(true);
    const timeExits = trades.filter(t => t.outcome === 'NEUTRAL');
    for (const t of timeExits) expect(t.exitPrice).toBe(100); // the 15:14 close
  });

  it('only lets the day\'s top 20 by change open plans (covers 0009 AC-16, AC-17)', () => {
    const bySymbol = new Map<string, Candle[]>();
    const trigger = () => {
      const c = Array.from({ length: 39 }, (_, m) => candle(m, 100));
      c.push(candle(39, 101));
      for (let m = 40; m < 60; m++) c.push(candle(m, 101 + (m - 39) * 0.3));
      return c;
    };
    // 20 stocks rallying hard from the open, plus TEST with a weaker day but the same trigger.
    for (let i = 0; i < 20; i++) {
      bySymbol.set(`UP${String(i).padStart(2, '0')}`, Array.from({ length: 60 }, (_, m) => candle(m, 100 + m)));
    }
    bySymbol.set('TEST', trigger());

    const trades = replayDay(bySymbol);
    expect(trades.filter(t => t.symbol === 'TEST')).toEqual([]);

    bySymbol.delete('UP00');
    expect(replayDay(bySymbol).some(t => t.symbol === 'TEST')).toBe(true);
  });

  it('returns nothing before the engine has 25 minutes of history', () => {
    expect(replaySymbol('TEST', Array.from({ length: 20 }, (_, m) => candle(m, 100)))).toEqual([]);
  });
});
