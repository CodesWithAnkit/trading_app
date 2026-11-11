"use client"
import { apiFetch } from "@/lib/api/apiFetch"
import React, { createContext, useContext, useState } from "react"
import { Trade, TradeAction } from "@/mock/trades"

/** spec 0028: what "Take this trade" sends to POST /api/v1/journal. */
export type NewJournalEntry = {
  symbol: string
  strategyName: string
  direction: "LONG" | "SHORT"
  entryPrice: number
  stopPrice: number
  targetPrice: number
  quantity: number
  signalId?: string
  notes?: string
}

export type CloseResult = "WON" | "LOST" | "CANCELLED"

type TradeContextType = {
  trades: Trade[]
  openTrades: Trade[]
  closedTrades: Trade[]
  /** False until the journal has loaded once. */
  loaded: boolean
  error: string | null
  reload: () => Promise<void>
  /** spec 0028 AC-10: records a taken trade; throws with the API message on failure. */
  createEntry: (entry: NewJournalEntry) => Promise<void>
  /** spec 0028 AC-9: closes once; WON and LOST need an exit price. */
  closeEntry: (id: string, result: CloseResult, exitPrice?: number) => Promise<void>
  /** A full EXIT closes the entry (WON when it made money, else LOST); partial exits stay local notes. */
  addTradeLeg: (tradeId: string, action: TradeAction, price: number, quantity: number) => Promise<void>
  updateTradeStopLoss: (tradeId: string, newStopLoss: number) => void
}

const TradeContext = createContext<TradeContextType | undefined>(undefined)

type JournalRow = {
  id: string
  symbol: string
  strategy_name: string
  direction: "LONG" | "SHORT" | null
  quantity: number | null
  entry_price: number
  stop_price: number
  target_price: number
  exit_price: number | null
  exit_at: string | null
  realized_pnl: number | null
  status: "PENDING" | "WON" | "LOST" | "CANCELLED"
  signal_id: string | null
  notes: string | null
  created_at: string
  flags?: ("NO_QUANTITY" | "CHECK_DIRECTION")[]
}

/** Real journal rows only (AGENTS.md: never show sample numbers). Missing values stay missing. */
function toTrade(r: JournalRow): Trade {
  const n = (v: unknown) => (v === null || v === undefined ? undefined : Number(v))
  return {
    id: r.id,
    signalId: r.signal_id ?? undefined,
    symbol: r.symbol,
    direction: r.direction ?? "LONG",
    status: r.status === "PENDING" ? "OPEN" : "CLOSED",
    journalStatus: r.status,
    flags: r.flags ?? [],
    quantity: r.quantity ?? 0,
    entryPrice: Number(r.entry_price),
    stopLoss: n(r.stop_price),
    target1: n(r.target_price),
    exitPrice: n(r.exit_price),
    netPnl: n(r.realized_pnl),
    legs: [],
    notes: r.notes ?? "",
    strategyName: r.strategy_name,
    createdAt: r.created_at,
    closedAt: r.exit_at ?? undefined,
  }
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.message ?? `Request failed (${res.status})`
}

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/journal")
      if (!res.ok) throw new Error(await errorMessage(res))
      const body = (await res.json()) as { data: JournalRow[] }
      setTrades((body.data ?? []).map(toTrade))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the journal.")
    } finally {
      setLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const createEntry = async (e: NewJournalEntry) => {
    const res = await apiFetch("/api/v1/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: e.symbol,
        strategy_name: e.strategyName,
        direction: e.direction,
        entry_price: e.entryPrice,
        stop_price: e.stopPrice,
        target_price: e.targetPrice,
        quantity: e.quantity,
        signal_id: e.signalId,
        notes: e.notes,
      }),
    })
    if (!res.ok) throw new Error(await errorMessage(res))
    await reload()
  }

  const closeEntry = async (id: string, result: CloseResult, exitPrice?: number) => {
    const res = await apiFetch(`/api/v1/journal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result === "CANCELLED" ? { status: result } : { status: result, exit_price: exitPrice }),
    })
    if (!res.ok) throw new Error(await errorMessage(res))
    await reload()
  }

  const addTradeLeg = async (tradeId: string, action: TradeAction, price: number, quantity: number) => {
    const trade = trades.find((t) => t.id === tradeId)
    if (!trade) return
    if (action === "EXIT") {
      const pnl = (trade.direction === "SHORT" ? trade.entryPrice - price : price - trade.entryPrice) * (trade.quantity || quantity)
      await closeEntry(tradeId, pnl > 0 ? "WON" : "LOST", price)
      return
    }
    // Partial exits are not stored by the journal API yet; keep them as a local leg on screen.
    setTrades((prev) =>
      prev.map((t) =>
        t.id !== tradeId
          ? t
          : { ...t, legs: [...t.legs, { id: `leg_${Date.now()}`, action, price, quantity, timestamp: new Date().toISOString() }] }
      )
    )
  }

  const updateTradeStopLoss = (tradeId: string, newStopLoss: number) => {
    setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, stopLoss: newStopLoss } : t)))
  }

  const openTrades = trades.filter((t) => t.status === "OPEN")
  const closedTrades = trades.filter((t) => t.status === "CLOSED")

  return (
    <TradeContext.Provider
      value={{ trades, openTrades, closedTrades, loaded, error, reload, createEntry, closeEntry, addTradeLeg, updateTradeStopLoss }}
    >
      {children}
    </TradeContext.Provider>
  )
}

export function useTrades() {
  const ctx = useContext(TradeContext)
  if (!ctx) throw new Error("useTrades must be used within TradeProvider")
  return ctx
}
