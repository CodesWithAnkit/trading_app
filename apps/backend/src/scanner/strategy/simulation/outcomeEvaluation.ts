import { SignalSnapshot } from '../signal/signalSnapshot.js';
import { Candle } from '../market/candleTypes.js';

export type OutcomeResult = "T1_REACHED" | "T2_REACHED" | "STOP_REACHED" | "NEITHER" | "AMBIGUOUS" | "INSUFFICIENT_DATA";

export type EvaluationReport = {
  outcome: OutcomeResult;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
};

export function evaluateOutcome(
  signal: SignalSnapshot,
  subsequentCandles: Candle[]
): EvaluationReport {
  if (subsequentCandles.length === 0) {
    return { outcome: "INSUFFICIENT_DATA", maxFavorableExcursion: null, maxAdverseExcursion: null };
  }

  const { direction, entryZone, stop, targets } = signal;
  const entryPrice = entryZone.referenceEntry;
  const stopPrice = stop.price;
  const target1 = targets.t1;
  const target2 = targets.t2;

  let outcome: OutcomeResult = "NEITHER";
  let mfe = 0; // Max Favorable Excursion (absolute price difference)
  let mae = 0; // Max Adverse Excursion

  for (const candle of subsequentCandles) {
    const high = candle.high;
    const low = candle.low;

    let targetHit = false;
    let stopHit = false;
    
    // Update MFE / MAE
    if (direction === "LONG") {
      const currentMfe = high - entryPrice;
      const currentMae = entryPrice - low;
      if (currentMfe > mfe) mfe = currentMfe;
      if (currentMae > mae) mae = currentMae;

      if (target1 !== null && high >= target1) targetHit = true;
      if (low <= stopPrice) stopHit = true;
    } else {
      const currentMfe = entryPrice - low;
      const currentMae = high - entryPrice;
      if (currentMfe > mfe) mfe = currentMfe;
      if (currentMae > mae) mae = currentMae;

      if (target1 !== null && low <= target1) targetHit = true;
      if (high >= stopPrice) stopHit = true;
    }

    if (targetHit && stopHit) {
      outcome = "AMBIGUOUS";
      break;
    } else if (targetHit) {
      // In a real scenario, we might want to continue evaluating to see if T2 is hit.
      // For simplicity in milestone 1 of simulation, we just mark T1.
      outcome = "T1_REACHED";
      // Check T2 in the same candle
      if (target2 !== null) {
        if (direction === "LONG" && high >= target2) outcome = "T2_REACHED";
        if (direction === "SHORT" && low <= target2) outcome = "T2_REACHED";
      }
      break;
    } else if (stopHit) {
      outcome = "STOP_REACHED";
      break;
    }
  }

  return {
    outcome,
    maxFavorableExcursion: mfe > 0 ? mfe : 0,
    maxAdverseExcursion: mae > 0 ? mae : 0,
  };
}
