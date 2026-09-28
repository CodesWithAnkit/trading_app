import { SimulationResult } from "./simulationRunner";

export type CalibrationReport = {
  version: string;
  timestamp: string;
  metrics: {
    signals: {
      candidates: number;
      active: number;
      invalidated: number;
      expired: number;
      duplicatesSuppressed: number;
    };
    outcomes: {
      t1First: number;
      t2First: number;
      stopFirst: number;
      neither: number;
      ambiguous: number;
      averageMfe: number;
      averageMae: number;
    };
    unresolvedParameters: string[];
    candidateRanges: Record<string, { min: number; max: number }>;
  };
};

export function generateCalibrationReport(
  version: string,
  simResult: SimulationResult,
  unresolvedParameters: string[],
  candidateRanges: Record<string, { min: number; max: number }>
): CalibrationReport {
  
  let t1First = 0;
  let t2First = 0;
  let stopFirst = 0;
  let neither = 0;
  let ambiguous = 0;
  let totalMfe = 0;
  let mfeCount = 0;
  let totalMae = 0;
  let maeCount = 0;

  for (const o of simResult.outcomes) {
    if (o.outcome === "T1_REACHED") t1First++;
    else if (o.outcome === "T2_REACHED") t2First++;
    else if (o.outcome === "STOP_REACHED") stopFirst++;
    else if (o.outcome === "AMBIGUOUS") ambiguous++;
    else neither++;

    if (o.maxFavorableExcursion !== null) {
      totalMfe += o.maxFavorableExcursion;
      mfeCount++;
    }
    if (o.maxAdverseExcursion !== null) {
      totalMae += o.maxAdverseExcursion;
      maeCount++;
    }
  }

  return {
    version,
    timestamp: new Date().toISOString(),
    metrics: {
      signals: {
        candidates: simResult.signalsGenerated.length, // Placeholder logic
        active: simResult.signalsGenerated.filter(s => s.state === "ACTIVE" || s.state === "ENTERED").length,
        invalidated: simResult.signalsGenerated.filter(s => s.state === "INVALIDATED").length,
        expired: simResult.signalsGenerated.filter(s => s.state === "EXPIRED").length,
        duplicatesSuppressed: simResult.duplicatesSuppressed,
      },
      outcomes: {
        t1First,
        t2First,
        stopFirst,
        neither,
        ambiguous,
        averageMfe: mfeCount > 0 ? totalMfe / mfeCount : 0,
        averageMae: maeCount > 0 ? totalMae / maeCount : 0,
      },
      unresolvedParameters,
      candidateRanges,
    }
  };
}
