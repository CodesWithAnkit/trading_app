export type StructureFeature = {
  referenceHigh: number | null;
  referenceLow: number | null;
  rangeWidth: number | null;
  rangeWidthBps: number | null;
  structureQuality: number | null;
  directionContext: "BULLISH" | "BEARISH" | "MIXED" | "UNAVAILABLE";
};

export type RvolFeature = {
  currentVolume: number | null;
  baselineVolume: number | null;
  rvol: number | null;
  baselineMethod: string | null;
  comparablePeriod: string | null;
};

export type TrendState = "BULLISH" | "BEARISH" | "MIXED" | "CONTRADICTORY" | "UNAVAILABLE";

export type TrendFeature = {
  state: TrendState;
  primaryContext: string;
  secondaryContext: string;
};
