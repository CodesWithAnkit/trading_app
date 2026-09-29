import { StrategyConfig } from "../config/strategyConfig";
import { StructureFeature } from "../features/featureTypes";
import { CandidateSetup } from "../setup/setupTypes";
import { TradePlan } from "./planTypes";

export function buildTradePlan(
  config: StrategyConfig,
  candidate: CandidateSetup,
  structure: StructureFeature,
  currentPrice: number
): TradePlan | null {
  if (!candidate.valid || candidate.setupFamily === "NONE") return null;

  const direction: "LONG" | "SHORT" = candidate.setupFamily === "BREAKOUT_MOMENTUM" ? "LONG" : "SHORT";
  
  // 1. Reference Entry
  let referenceEntry = currentPrice;
  if (config.entry.reference_method === "STRUCTURE_EDGE") {
    referenceEntry = direction === "LONG" ? (structure.referenceHigh ?? currentPrice) : (structure.referenceLow ?? currentPrice);
  }

  // 2. Entry Zone
  // Max width bps
  const maxBps = config.entry.max_width_bps ?? 20; // fallback
  const widthAbs = referenceEntry * (maxBps / 10000);
  
  let entryLow = referenceEntry - widthAbs / 2;
  let entryHigh = referenceEntry + widthAbs / 2;

  // 3. Stop
  let stopPrice = referenceEntry;
  let structuralRef = direction === "LONG" ? structure.referenceLow : structure.referenceHigh;
  
  if (config.stop.structural.enabled && structuralRef !== null) {
    stopPrice = structuralRef;
  } else {
    // Fallback if structure stop is disabled or null
    const dist = referenceEntry * ((config.stop.minimum_distance_bps ?? 20) / 10000);
    stopPrice = direction === "LONG" ? referenceEntry - dist : referenceEntry + dist;
  }

  const distFromEntry = Math.abs(referenceEntry - stopPrice);
  const stopBps = (distFromEntry / referenceEntry) * 10000;

  // 4. Targets
  let t1: number | null = null;
  if (config.targets.t1.method === "PERCENT_FROM_REFERENCE_ENTRY" && config.targets.t1.default_move_percent !== null) {
    const move = referenceEntry * (config.targets.t1.default_move_percent / 100);
    t1 = direction === "LONG" ? referenceEntry + move : referenceEntry - move;
  } else if (config.targets.t1.method === "RISK_MULTIPLIER") {
    t1 = direction === "LONG" ? referenceEntry + distFromEntry : referenceEntry - distFromEntry;
  }

  // T2 logic placeholder
  let t2: number | null = null;
  if (config.targets.t2_plus.enabled) {
    t2 = t1 !== null ? (direction === "LONG" ? t1 + distFromEntry : t1 - distFromEntry) : null;
  }

  // 5. Trailing
  const trailingEnabled = config.trailing.enabled;

  return {
    direction,
    entryZone: {
      entryLow,
      entryHigh,
      referenceEntry
    },
    stop: {
      price: stopPrice,
      method: config.stop.method || "STRUCTURAL",
      structuralReference: structuralRef,
      distanceFromEntry: distFromEntry,
      distanceBps: stopBps,
    },
    targets: {
      t1,
      t2,
    },
    trailing: {
      enabled: trailingEnabled,
      activationCondition: config.trailing.activation.method,
      trailingMethod: config.trailing.distance.method,
      trailingDistance: config.trailing.distance.value,
      initialStop: stopPrice,
    }
  };
}
