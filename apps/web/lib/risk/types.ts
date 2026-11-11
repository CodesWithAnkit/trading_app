// spec 0028: the risk verdict and context the backend attaches for the signed in user.

export type SkipReason =
  | "STOP_INVALID"
  | "MAX_OPEN_TRADES"
  | "DAILY_LOSS_LIMIT"
  | "STOP_TOO_WIDE"
  | "CAPITAL_TOO_SMALL"
  | "STOP_TOO_WIDE_FOR_ROOM"

export type RiskNote = "CAPPED_BY_CAPITAL" | "REDUCED_TO_ROOM"

export type RiskVerdict =
  | { verdict: "TAKE"; qty: number; riskInr: number; notionalInr: number; notes: RiskNote[]; skipReason: null }
  | { verdict: "SKIP"; qty: 0; riskInr: 0; notionalInr: 0; notes: []; skipReason: SkipReason }

export type RiskLimits = {
  riskPerTrade: number
  dailyLossLimit: number
  maxOpenTrades: number
  maxCapitalPerTrade: number
}

export type RiskContext = {
  limits: RiskLimits
  realizedLossToday: number
  openRisk: number
  openCount: number
  dailyRoom: number
  resetsAt: string
}
