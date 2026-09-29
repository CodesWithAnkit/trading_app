export type CandidateSetup = {
  valid: boolean;
  setupFamily: "BREAKOUT_MOMENTUM" | "BREAKDOWN_MOMENTUM" | "NONE";
  rejectionReasons: string[];
};
