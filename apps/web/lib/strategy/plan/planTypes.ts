export type TradePlan = {
  direction: "LONG" | "SHORT";
  entryZone: {
    entryLow: number;
    entryHigh: number;
    referenceEntry: number;
  };
  stop: {
    price: number;
    method: string;
    structuralReference: number | null;
    distanceFromEntry: number;
    distanceBps: number;
  };
  targets: {
    t1: number | null;
    t2: number | null;
  };
  trailing: {
    enabled: boolean;
    activationCondition: string | null;
    trailingMethod: string | null;
    trailingDistance: number | null;
    initialStop: number;
  };
};

export type RiskRewardMetrics = {
  valid: boolean;
  riskPerShare: number;
  rewardToTarget1: number | null;
  riskRewardRatio: number | null;
  rejectionReasons: string[];
};
