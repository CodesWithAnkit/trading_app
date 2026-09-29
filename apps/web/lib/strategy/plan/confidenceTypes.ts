export type ConfidenceScore = {
  score: number;
  band: "LOW" | "MEDIUM" | "HIGH" | "INVALID_CONFIG";
  components: {
    setupQuality: number;
    relativeVolume: number;
    trendAlignment: number;
    volatility: number;
    liquidity: number;
    riskReward: number;
  };
  weights: Record<string, number | null>;
};
