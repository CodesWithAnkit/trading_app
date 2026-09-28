import { StrategyConfig } from "../config/strategyConfig";
import { Candle } from "../market/candleTypes";
import { InstrumentContext } from "../eligibility/eligibilityTypes";
import { evaluateEligibility } from "../eligibility/eligibilityEngine";
import { calculateStructure } from "../features/structureCalculator";
import { calculateRvol } from "../features/rvolCalculator";
import { calculateTrend } from "../features/trendCalculator";
import { detectCandidate } from "../setup/candidateDetection";
import { buildTradePlan } from "../plan/tradePlanBuilder";
import { validateRiskReward } from "../plan/riskRewardValidator";
import { calculateConfidence } from "../plan/confidenceScorer";
import { buildSignalSnapshot, SignalSnapshot } from "../signal/signalSnapshot";
import { isDuplicate } from "../signal/deduplication";
import { evaluateOutcome, EvaluationReport } from "./outcomeEvaluation";

export type SimulationResult = {
  signalsGenerated: SignalSnapshot[];
  outcomes: EvaluationReport[];
  duplicatesSuppressed: number;
};

// Simplified mocked extraction of InstrumentContext for the runner
function buildMockContext(candles1m: Candle[], candles5m: Candle[]): InstrumentContext {
  const latest = candles1m[candles1m.length - 1];
  return {
    symbol: latest.symbol,
    instrumentType: "NSE_CASH_EQUITY",
    isActive: true,
    isSuspended: false,
    isCautionary: false,
    isUnsuitable: false,
    currentPrice: latest.close,
    avg1mVolume: latest.volume,
    avg5mVolume: candles5m[candles5m.length - 1]?.volume || 0,
    avgTradedValue: latest.volume * latest.close,
    currentSpreadBps: 2,
    available1mCandles: candles1m.length,
    available5mCandles: candles5m.length,
  };
}

export function runSimulation(
  config: StrategyConfig,
  candles1m: Candle[],
  candles5m: Candle[] // In reality, we'd aggregate 1m to 5m on the fly or pass them
): SimulationResult {
  const signals: SignalSnapshot[] = [];
  const outcomes: EvaluationReport[] = [];
  let duplicatesSuppressed = 0;

  // For demonstration, we step through starting from an index that has enough history
  const startIdx = 100; 

  for (let i = startIdx; i < candles1m.length - 30; i++) {
    const current1m = candles1m[i];
    
    // We assume 1m and 5m arrays are synchronized by some timeline logic.
    // For this runner skeleton, we simulate historical slices:
    const hist1m = candles1m.slice(0, i + 1);
    const hist5m = candles5m.filter(c => new Date(c.timestamp) <= new Date(current1m.timestamp));
    const current5m = hist5m[hist5m.length - 1];

    if (!current5m) continue;

    const context = buildMockContext(hist1m, hist5m);
    const eligibility = evaluateEligibility(config, context);

    if (!eligibility.eligible) continue;

    const structure = calculateStructure(config, hist5m);
    const rvol = calculateRvol(config, current5m, hist5m);
    const trend = calculateTrend(config, current5m, hist5m, current1m, hist1m);

    const candidate = detectCandidate(config, current1m, structure, rvol, trend);
    if (!candidate.valid) continue;

    const plan = buildTradePlan(config, candidate, structure, current1m.close);
    if (!plan) continue;

    const rr = validateRiskReward(config, plan);
    if (!rr.valid) continue;

    const confidence = calculateConfidence(config, {
      setupQuality: structure.structureQuality ?? 50,
      relativeVolume: rvol.rvol ? Math.min(100, rvol.rvol * 50) : 0,
      trendAlignment: trend.state === "BULLISH" || trend.state === "BEARISH" ? 80 : 20,
      volatility: 50,
      liquidity: 50,
      riskReward: rr.riskRewardRatio ? Math.min(100, rr.riskRewardRatio * 20) : 0,
    });

    const signal = buildSignalSnapshot(
      config,
      current1m.symbol,
      "NSE",
      current1m.close,
      current1m.timestamp,
      candidate.setupFamily,
      plan,
      structure,
      rvol,
      trend,
      confidence,
      eligibility,
      rr
    );

    if (isDuplicate(signal, signals, 30)) {
      duplicatesSuppressed++;
      continue;
    }

    signals.push(signal);

    // Evaluate outcome using the *future* candles
    const futureCandles = candles1m.slice(i + 1, i + 31); // next 30 minutes
    const outcome = evaluateOutcome(signal, futureCandles);
    outcomes.push(outcome);
  }

  return {
    signalsGenerated: signals,
    outcomes,
    duplicatesSuppressed
  };
}
