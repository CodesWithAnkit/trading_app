export type TradeStatus = "OPEN" | "CLOSED"
export type TradeAction = "ENTRY" | "PARTIAL_EXIT" | "EXIT"

export type TradeLeg = {
  id: string
  action: TradeAction
  price: number
  quantity: number
  timestamp: string
}

export type Trade = {
  id: string
  signalId?: string
  symbol: string
  direction: "LONG" | "SHORT"
  status: TradeStatus
  quantity: number
  entryPrice: number
  exitPrice?: number
  netPnl?: number
  grossPnl?: number
  legs: TradeLeg[]
  notes: string
  createdAt: string
  closedAt?: string
}

const now = new Date()

export const mockTrades: Trade[] = [
  {
    id: "trd_001",
    signalId: "sig_001", // linked to RELIANCE
    symbol: "RELIANCE",
    direction: "LONG",
    status: "OPEN",
    quantity: 100,
    entryPrice: 1451.50,
    legs: [
      {
        id: "leg_001",
        action: "ENTRY",
        price: 1451.50,
        quantity: 100,
        timestamp: new Date(now.getTime() - 8 * 60000).toISOString()
      }
    ],
    notes: "Entered slightly below reference. Looks strong.",
    createdAt: new Date(now.getTime() - 8 * 60000).toISOString()
  },
  {
    id: "trd_002",
    symbol: "INFY",
    direction: "SHORT",
    status: "CLOSED",
    quantity: 50,
    entryPrice: 1500.00,
    exitPrice: 1485.00,
    netPnl: 650.00,
    grossPnl: 750.00,
    legs: [
      {
        id: "leg_002",
        action: "ENTRY",
        price: 1500.00,
        quantity: 50,
        timestamp: new Date(now.getTime() - 120 * 60000).toISOString()
      },
      {
        id: "leg_003",
        action: "PARTIAL_EXIT",
        price: 1490.00,
        quantity: 25,
        timestamp: new Date(now.getTime() - 100 * 60000).toISOString()
      },
      {
        id: "leg_004",
        action: "EXIT",
        price: 1480.00,
        quantity: 25,
        timestamp: new Date(now.getTime() - 90 * 60000).toISOString()
      }
    ],
    notes: "Nice trend breakdown, took partials at T1.",
    createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
    closedAt: new Date(now.getTime() - 90 * 60000).toISOString()
  }
]
