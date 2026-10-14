import { describe, it, expect } from 'vitest';
import { calculateMomentumScore, rankByMomentum, relativeVolumeFrom5m, trendFrom5m, MomentumStock } from './momentumScore.js';

const candles = (closes: number[], volume = 100) => closes.map(close => ({ close, volume }));

describe('momentumScore (0009 AC-1)', () => {
  it('multiplies % change, relative volume and trend alignment', () => {
    expect(calculateMomentumScore(2, 1.5, 'UP')).toBe(3);
    expect(calculateMomentumScore(2, 1.5, 'UNKNOWN')).toBe(1.5);
    expect(calculateMomentumScore(2, 1.5, 'DOWN')).toBe(0.75);
    expect(calculateMomentumScore(-1, 2, 'UP')).toBe(-2);
  });

  it('reads the 5m EMA cross, UNKNOWN below 21 candles', () => {
    expect(trendFrom5m(candles(Array.from({ length: 20 }, (_, i) => 100 + i)))).toBe('UNKNOWN');
    expect(trendFrom5m(candles(Array.from({ length: 30 }, (_, i) => 100 + i)))).toBe('UP');
    expect(trendFrom5m(candles(Array.from({ length: 30 }, (_, i) => 200 - i)))).toBe('DOWN');
  });

  it('compares the latest 5m volume with the prior average', () => {
    expect(relativeVolumeFrom5m([])).toBe(1);
    expect(relativeVolumeFrom5m([{ close: 1, volume: 100 }, { close: 1, volume: 100 }, { close: 1, volume: 250 }])).toBe(2.5);
    expect(relativeVolumeFrom5m([{ close: 1, volume: 0 }, { close: 1, volume: 50 }])).toBe(1);
  });

  it('ranks highest score first', () => {
    const stock = (symbol: string, momentumScore: number) => ({ symbol, momentumScore }) as MomentumStock;
    expect(rankByMomentum([stock('A', 1), stock('B', 5), stock('C', -2)]).map(s => s.symbol)).toEqual(['B', 'A', 'C']);
  });
});
