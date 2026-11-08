import { Metrics } from './metrics.js';

// Gate v1 (spec 0020, AC-7). Constants in code on purpose: not settings.
export const GATE_V1 = {
  minProfitFactor: 1.1,
  minTrades: 100,
  minFullOosYears: 2,
  minPositiveYearShare: 0.6,
} as const;

export type SymbolGate = {
  ok: boolean;
  reasons: string[];
  fullYears: number;
  positiveYears: number;
};

/** Gate checks for one symbol's out of sample metrics against that symbol's coin toss median. */
export function gateForSymbol(oos: Metrics, coinMedianNetR: number | null): SymbolGate {
  const reasons: string[] = [];
  const full = Object.values(oos.perYear).filter((y) => y.full);
  const positive = full.filter((y) => y.netR > 0).length;
  if (oos.profitFactor < GATE_V1.minProfitFactor) reasons.push(`PF ${oos.profitFactor} < ${GATE_V1.minProfitFactor}`);
  if (oos.trades < GATE_V1.minTrades) reasons.push(`${oos.trades} trades < ${GATE_V1.minTrades}`);
  if (full.length < GATE_V1.minFullOosYears) reasons.push(`${full.length} full OOS years < ${GATE_V1.minFullOosYears}`);
  else if (positive / full.length < GATE_V1.minPositiveYearShare) {
    reasons.push(`${positive}/${full.length} years positive < ${GATE_V1.minPositiveYearShare * 100}%`);
  }
  if (coinMedianNetR === null) reasons.push('no coin toss baseline for this symbol');
  else if (!(oos.netR > coinMedianNetR)) reasons.push(`net R ${oos.netR} not above coin median ${coinMedianNetR}`);
  return { ok: reasons.length === 0, reasons, fullYears: full.length, positiveYears: positive };
}

/** A rule passes only when every required symbol passes. */
export function ruleGate(bySymbol: Record<string, SymbolGate | undefined>, symbols: string[]): boolean {
  return symbols.every((s) => bySymbol[s]?.ok === true);
}
