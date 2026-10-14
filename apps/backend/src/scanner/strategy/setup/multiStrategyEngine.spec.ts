import { describe, it, expect } from 'vitest';
import { evaluateAllStrategies, evaluateStrategyProximity, APPROACHING_THRESHOLD_PCT } from './multiStrategyEngine.js';
import { Candle } from '../../market-data/types.js';

describe('multiStrategyEngine', () => {
  const createMockCandles = (count: number, basePrice: number = 100): Candle[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: 'TEST',
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      open: basePrice,
      high: basePrice + 2,
      low: basePrice - 2,
      close: basePrice + (Math.random() - 0.5),
      volume: 1000,
      instrumentToken: '12345',
      timeframe: '1m',
      startTime: new Date(Date.now() - (count - i) * 60000).toISOString(),
      endTime: new Date(Date.now() - (count - i - 1) * 60000).toISOString(),
      isComplete: true
    }));
  };

  it('returns empty array if not enough history', () => {
    const hist1m = createMockCandles(10); // Less than 25
    const current1m = hist1m[9];
    
    const results = evaluateAllStrategies('TEST', current1m, hist1m, current1m, hist1m);
    expect(results).toHaveLength(0);
  });

  it('identifies VWAP Breakout when price crosses above VWAP', () => {
    const hist1m = createMockCandles(30, 100);
    // Make previous candle close below VWAP (which is ~100)
    hist1m[28].close = 99;
    
    // Current candle crosses above
    const current1m = { ...hist1m[29], close: 102 };
    hist1m[29] = current1m;

    const results = evaluateAllStrategies('TEST', current1m, hist1m, current1m, hist1m);
    
    const vwapSetup = results.find(r => r.setupFamily === 'VWAP_TREND');
    expect(vwapSetup).toBeDefined();
    expect(vwapSetup?.valid).toBe(true);
    expect(vwapSetup?.dynamicEntry).toBe(102);
  });

  it('identifies Mean Reversion when price is below lower BB and RSI < 30', () => {
    const hist1m = createMockCandles(30, 100);
    // Flat price to stabilize moving averages and RSI
    for (let i = 0; i < 29; i++) {
      hist1m[i].close = 100; 
    }
    // Huge drop at the end
    hist1m[29].close = 80;
    
    const current1m = hist1m[29];

    const results = evaluateAllStrategies('TEST', current1m, hist1m, current1m, hist1m);
    
    const mrSetup = results.find(r => r.setupFamily === 'MEAN_REVERSION');
    expect(mrSetup).toBeDefined();
    expect(mrSetup?.valid).toBe(true);
  });

  it('identifies Scalping when 9-EMA > 21-EMA, price > 9-EMA, and volume spikes', () => {
    const hist1m = createMockCandles(30, 100);
    // Steady uptrend
    for (let i = 0; i < 30; i++) {
      hist1m[i].close = 100 + i;
    }
    
    // Volume spike on current
    const current1m = { ...hist1m[29], volume: 5000 };
    hist1m[29] = current1m;

    const results = evaluateAllStrategies('TEST', current1m, hist1m, current1m, hist1m);
    
    const scalpingSetup = results.find(r => r.setupFamily === 'SCALPING');
    expect(scalpingSetup).toBeDefined();
  });

  describe('evaluateStrategyProximity (0009 AC-2)', () => {
    const flatHistory = (currentClose: number) => {
      const hist1m = createMockCandles(30, 100).map(c => ({ ...c, close: 100 }));
      hist1m[29] = { ...hist1m[29], close: currentClose };
      return hist1m;
    };

    it('flags VWAP_TREND as approaching when price sits just under VWAP', () => {
      const hist1m = flatHistory(99.5);
      const results = evaluateStrategyProximity(hist1m[29], hist1m);

      const vwap = results.find(r => r.setupFamily === 'VWAP_TREND');
      expect(vwap).toBeDefined();
      expect(vwap!.direction).toBe('LONG');
      expect(vwap!.distancePct).toBeGreaterThan(0);
      expect(vwap!.distancePct).toBeLessThanOrEqual(APPROACHING_THRESHOLD_PCT);
      expect(vwap!.proximity).toBeGreaterThan(0);
      expect(vwap!.proximity).toBeLessThanOrEqual(100);
      // Opening range high (102) is 2.5% away, outside the 1% window.
      expect(results.find(r => r.setupFamily === 'BREAKOUT_MOMENTUM')).toBeUndefined();
    });

    it('ignores triggers further than 1% away and returns closest first', () => {
      const hist1m = flatHistory(95);
      const results = evaluateStrategyProximity(hist1m[29], hist1m);

      expect(results.find(r => r.setupFamily === 'VWAP_TREND')).toBeUndefined();
      const distances = results.map(r => r.distancePct);
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
      expect(distances.every(d => d <= APPROACHING_THRESHOLD_PCT)).toBe(true);
    });

    it('returns nothing without 25 candles of history', () => {
      const hist1m = createMockCandles(10);
      expect(evaluateStrategyProximity(hist1m[9], hist1m)).toEqual([]);
    });
  });
});
