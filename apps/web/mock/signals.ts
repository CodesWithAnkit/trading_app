export type SignalStatus =
  | "ACTIVE" | "EXPIRING" | "EXPIRED" | "INVALIDATED" | "SKIPPED" | "ENTERED"
  // Live exits (spec 0010)
  | "TARGET_HIT" | "STOP_HIT" | "TIME_EXIT"

export type ExitReason = "TARGET" | "STOP" | "TIME"

export type Signal = {
  id: string
  symbol: string
  exchange: "NSE"
  direction: "LONG" | "SHORT"
  setup: string
  status: SignalStatus
  price: number
  entryZone: { low: number; high: number }
  referenceEntry: number
  stop: number
  targets: { t1: number; t2?: number }
  confidence: number
  confidenceBand: "LOW" | "MEDIUM" | "HIGH"
  createdAt: string
  expiresAt: string
  rationale: string
  metrics: {
    relativeVolume: string
    trendAlignment: string
    volatility: string
    liquidity: string
    riskReward: string
  }
  /** Live exit (spec 0010); absent or null while the plan is open. */
  exitPrice?: number | null
  exitAt?: string | null
  exitReason?: ExitReason | null
}

/** The `signal:exit` stream event (spec 0010 AC-6). */
export type SignalExit = {
  id: string
  symbol: string
  setup: string
  reason: ExitReason
  exitPrice: number
  exitAt: string
  pnlPct: number
  stale: boolean
}

// Generate some mock timestamps relative to now
const now = new Date()
const tenMinutesAgo = new Date(now.getTime() - 10 * 60000).toISOString()
const expiringSoon = new Date(now.getTime() + 4 * 60000).toISOString() // 4 mins left
const activeUntilLater = new Date(now.getTime() + 18 * 60000).toISOString() // 18 mins left
const expiredTime = new Date(now.getTime() - 5 * 60000).toISOString() // expired 5 mins ago

export const mockSignals: Signal[] = [
  {
    id: "sig_001",
    symbol: "RELIANCE",
    exchange: "NSE",
    direction: "LONG",
    setup: "Breakout",
    status: "ACTIVE",
    price: 1452.80,
    entryZone: { low: 1450, high: 1454 },
    referenceEntry: 1452,
    stop: 1438,
    targets: { t1: 1468, t2: 1482 },
    confidence: 85,
    confidenceBand: "HIGH",
    createdAt: tenMinutesAgo,
    expiresAt: activeUntilLater,
    rationale: "Strong relative volume · Breakout above 5-minute range",
    metrics: {
      relativeVolume: "2.4x average",
      trendAlignment: "Aligned with daily",
      volatility: "Normal",
      liquidity: "High",
      riskReward: "1:2.3",
    },
  },
  {
    id: "sig_002",
    symbol: "HDFCBANK",
    exchange: "NSE",
    direction: "SHORT",
    setup: "Breakdown",
    status: "EXPIRING",
    price: 1621.10,
    entryZone: { low: 1618, high: 1622 },
    referenceEntry: 1620,
    stop: 1630,
    targets: { t1: 1605, t2: 1590 },
    confidence: 65,
    confidenceBand: "MEDIUM",
    createdAt: tenMinutesAgo,
    expiresAt: expiringSoon,
    rationale: "Failing VWAP · Sector weakness",
    metrics: {
      relativeVolume: "1.2x average",
      trendAlignment: "Counter to daily",
      volatility: "High",
      liquidity: "High",
      riskReward: "1:1.5",
    },
  },
  {
    id: "sig_003",
    symbol: "TCS",
    exchange: "NSE",
    direction: "LONG",
    setup: "Momentum",
    status: "EXPIRED",
    price: 3955.00,
    entryZone: { low: 3940, high: 3960 },
    referenceEntry: 3950,
    stop: 3920,
    targets: { t1: 4000, t2: 4040 },
    confidence: 45,
    confidenceBand: "LOW",
    createdAt: new Date(now.getTime() - 40 * 60000).toISOString(),
    expiresAt: expiredTime,
    rationale: "Opening drive setup",
    metrics: {
      relativeVolume: "1.0x average",
      trendAlignment: "Neutral",
      volatility: "Low",
      liquidity: "High",
      riskReward: "1:1.8",
    },
  }
]
