export type EligibilityStatus = 
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "CONFIG_INCOMPLETE"
  | "DATA_INVALID";

export type EligibilityResult = {
  eligible: boolean;
  status: EligibilityStatus;
  reasons: string[];
  metrics: Record<string, number | null>;
};

export type InstrumentContext = {
  symbol: string;
  instrumentType: string;
  isActive: boolean;
  isSuspended: boolean;
  isCautionary: boolean;
  isUnsuitable: boolean;
  currentPrice: number | null;
  avg1mVolume: number | null;
  avg5mVolume: number | null;
  avgTradedValue: number | null;
  currentSpreadBps: number | null;
  available1mCandles: number;
  available5mCandles: number;
};
