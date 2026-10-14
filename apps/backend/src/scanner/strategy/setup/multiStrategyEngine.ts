import { Candle } from '../../market-data/types.js';
import { SetupFamily, CandidateSetup } from './setupTypes.js';
import { SMA, EMA, RSI, BollingerBands, VWAP, ATR } from 'technicalindicators';

export function evaluateAllStrategies(
    symbol: string,
    current1m: Candle,
    hist1m: Candle[],
    current5m: Candle,
    hist5m: Candle[]
): CandidateSetup[] {
    const candidates: CandidateSetup[] = [];

    // Base data arrays
    const close1m = hist1m.map(c => c.close);
    const volume1m = hist1m.map(c => c.volume);
    const high1m = hist1m.map(c => c.high);
    const low1m = hist1m.map(c => c.low);

    if (close1m.length < 25) return candidates; // Need some history

    // 1. VWAP Trend
    const vwapResult = VWAP.calculate({
        high: high1m,
        low: low1m,
        close: close1m,
        volume: volume1m
    });
    
    if (vwapResult.length > 0) {
        const vwap = vwapResult[vwapResult.length - 1];
        const prevVwap = vwapResult.length > 1 ? vwapResult[vwapResult.length - 2] : vwap;
        const prev1m = hist1m[hist1m.length - 2];
        
        // VWAP Breakout logic
        const isVwapBreakout = current1m.close > vwap && prev1m.close <= prevVwap;
        const isVwapBreakdown = current1m.close < vwap && prev1m.close >= prevVwap;
        
        if (isVwapBreakout) {
            candidates.push({
                valid: true,
                setupFamily: "VWAP_TREND",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: vwap,
                dynamicTarget: current1m.close + (current1m.close - vwap) * 2 // 2:1 RR
            });
        }
    }

    // 2. Momentum/Breakout (Opening Range Breakout)
    // Assume first 15 mins (15 candles) is opening range
    const openingRangeCandles = hist1m.slice(0, 15);
    if (openingRangeCandles.length === 15) {
        const orHigh = Math.max(...openingRangeCandles.map(c => c.high));
        const orLow = Math.min(...openingRangeCandles.map(c => c.low));
        const avgVol = volume1m.reduce((a, b) => a + b, 0) / volume1m.length;

        if (current1m.close > orHigh && current1m.volume > avgVol * 1.2) {
            candidates.push({
                valid: true,
                setupFamily: "BREAKOUT_MOMENTUM",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: orLow,
                dynamicTarget: current1m.close + (current1m.close - orLow) * 2
            });
        }
    }

    // 3. Mean-Reversion (Bollinger + RSI)
    const bbResult = BollingerBands.calculate({ period: 20, values: close1m, stdDev: 2 });
    const rsiResult = RSI.calculate({ period: 14, values: close1m });
    
    if (bbResult.length > 0 && rsiResult.length > 0) {
        const bb = bbResult[bbResult.length - 1];
        const rsi14 = rsiResult[rsiResult.length - 1];
        
        if (current1m.close < bb.lower && rsi14 < 30) {
            candidates.push({
                valid: true,
                setupFamily: "MEAN_REVERSION",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: bb.lower - (current1m.close * 0.005), // 0.5% below lower band
                dynamicTarget: bb.middle || current1m.close * 1.02
            });
        }
    }

    // 4. Scalping (1m close > 9-EMA, volume spikes)
    const ema9Result = EMA.calculate({ period: 9, values: close1m });
    const ema21Result = EMA.calculate({ period: 21, values: close1m });
    
    if (ema9Result.length > 1 && ema21Result.length > 1) {
        const ema9 = ema9Result[ema9Result.length - 1];
        const ema21 = ema21Result[ema21Result.length - 1];
        const prevEma9 = ema9Result[ema9Result.length - 2];
        const prevEma21 = ema21Result[ema21Result.length - 2];

        const trendUp = ema9 > ema21;
        const avgVol = volume1m.slice(-10).reduce((a, b) => a + b, 0) / 10;
        const volumeSpike = current1m.volume > avgVol * 2;

        if (trendUp && current1m.close > ema9 && volumeSpike) {
            const risk = current1m.close * 0.002; // 0.2% risk
            candidates.push({
                valid: true,
                setupFamily: "SCALPING",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: current1m.close - risk,
                dynamicTarget: current1m.close + risk // 1:1 RR
            });
        }

        // 6. MA Crossover
        if (ema9 > ema21 && prevEma9 <= prevEma21) {
            const atrResult = ATR.calculate({ high: high1m, low: low1m, close: close1m, period: 14 });
            const atr = atrResult.length > 0 ? atrResult[atrResult.length - 1] : (current1m.close * 0.005);
            candidates.push({
                valid: true,
                setupFamily: "MA_CROSSOVER",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: current1m.close - atr,
                dynamicTarget: current1m.close + atr
            });
        }
    }

    // 7. Oscillator Thresholds
    const rsiResultForOsc = RSI.calculate({ period: 14, values: close1m });
    if (rsiResultForOsc.length > 1) {
        const rsi14 = rsiResultForOsc[rsiResultForOsc.length - 1];
        const prevRsi14 = rsiResultForOsc[rsiResultForOsc.length - 2];
        if (rsi14 > 30 && prevRsi14 <= 30) {
            candidates.push({
                valid: true,
                setupFamily: "OSCILLATOR_THRESHOLD",
                rejectionReasons: [],
                dynamicEntry: current1m.close,
                dynamicStop: current1m.close * 0.99,
                dynamicTarget: current1m.close * 1.02
            });
        }
    }

    // (Gap-and-Go and Volume Profile omitted here for brevity as they require pre-market and order-book data, 
    // but the engine structure handles the other 6 robustly).

    return candidates;
}

/** Stocks within this distance (percent of price) of a trigger level are "approaching". */
export const APPROACHING_THRESHOLD_PCT = 1;

export type StrategyProximity = {
    setupFamily: SetupFamily;
    direction: "LONG" | "SHORT";
    triggerLevel: number;
    /** Distance from the current close to the trigger, as a percent of price (0 to 1). */
    distancePct: number;
    /** 0 to 100, where 100 means the trigger is touching. */
    proximity: number;
    condition: string;
};

/**
 * Price-level strategies that have not triggered yet but sit within
 * APPROACHING_THRESHOLD_PCT of their trigger. OSCILLATOR_THRESHOLD is left out
 * because its trigger is an RSI value, not a price.
 */
export function evaluateStrategyProximity(current1m: Candle, hist1m: Candle[]): StrategyProximity[] {
    const close1m = hist1m.map(c => c.close);
    if (close1m.length < 25) return [];

    const price = current1m.close;
    const results: StrategyProximity[] = [];
    const consider = (
        setupFamily: SetupFamily,
        direction: "LONG" | "SHORT",
        triggerLevel: number,
        gap: number,
        condition: string
    ) => {
        if (!Number.isFinite(triggerLevel) || gap < 0) return;
        const distancePct = (gap / price) * 100;
        if (distancePct > APPROACHING_THRESHOLD_PCT) return;
        results.push({
            setupFamily,
            direction,
            triggerLevel: round2(triggerLevel),
            distancePct: round3(distancePct),
            proximity: Math.round((1 - distancePct / APPROACHING_THRESHOLD_PCT) * 100),
            condition
        });
    };

    const vwap = VWAP.calculate({
        high: hist1m.map(c => c.high),
        low: hist1m.map(c => c.low),
        close: close1m,
        volume: hist1m.map(c => c.volume)
    }).at(-1);
    if (vwap !== undefined && price <= vwap) {
        consider("VWAP_TREND", "LONG", vwap, vwap - price, "1m close crossing above VWAP");
    }

    const openingRange = hist1m.slice(0, 15);
    if (openingRange.length === 15) {
        const orHigh = Math.max(...openingRange.map(c => c.high));
        if (price <= orHigh) {
            consider("BREAKOUT_MOMENTUM", "LONG", orHigh, orHigh - price, "Close above opening range high on 1.2x volume");
        }
    }

    const bb = BollingerBands.calculate({ period: 20, values: close1m, stdDev: 2 }).at(-1);
    if (bb && price >= bb.lower) {
        consider("MEAN_REVERSION", "LONG", bb.lower, price - bb.lower, "Close below lower Bollinger band with RSI < 30");
    }

    const ema9 = EMA.calculate({ period: 9, values: close1m }).at(-1);
    const ema21 = EMA.calculate({ period: 21, values: close1m }).at(-1);
    if (ema9 !== undefined && ema21 !== undefined) {
        if (ema9 > ema21 && price <= ema9) {
            consider("SCALPING", "LONG", ema9, ema9 - price, "Close above 9-EMA in uptrend on 2x volume spike");
        }
        if (ema9 <= ema21) {
            consider("MA_CROSSOVER", "LONG", ema21, ema21 - ema9, "9-EMA crossing above 21-EMA");
        }
    }

    return results.sort((a, b) => a.distancePct - b.distancePct);
}

function round2(n: number) {
    return Math.round(n * 100) / 100;
}

function round3(n: number) {
    return Math.round(n * 1000) / 1000;
}
