export type SetupFamily = 
  | "BREAKOUT_MOMENTUM" 
  | "BREAKDOWN_MOMENTUM" 
  | "MEAN_REVERSION" 
  | "SCALPING" 
  | "VWAP_TREND"
  | "GAP_AND_GO"
  | "MA_CROSSOVER"
  | "OSCILLATOR_THRESHOLD"
  | "VOLUME_PROFILE"
  | "NONE";

export type CandidateSetup = {
  valid: boolean;
  setupFamily: SetupFamily;
  rejectionReasons: string[];
  // Include specific values computed during detection that tradePlanBuilder might need (e.g., stops, targets)
  dynamicEntry?: number;
  dynamicStop?: number;
  dynamicTarget?: number;
};
