"use client"
import React, { createContext, useContext, useState } from "react"
import { Trade, TradeAction, mockTrades } from "@/mock/trades"

type TradeContextType = {
  trades: Trade[]
  openTrades: Trade[]
  closedTrades: Trade[]
  addTrade: (trade: Trade) => void
  addTradeLeg: (tradeId: string, action: TradeAction, price: number, quantity: number) => void
}

const TradeContext = createContext<TradeContextType | undefined>(undefined)

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>(mockTrades)

  const openTrades = trades.filter(t => t.status === "OPEN")
  const closedTrades = trades.filter(t => t.status === "CLOSED")

  const addTrade = (trade: Trade) => {
    setTrades(prev => [trade, ...prev])
  }

  const addTradeLeg = (tradeId: string, action: TradeAction, price: number, quantity: number) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== tradeId) return t;
      const newLeg = {
        id: `leg_${Date.now()}`,
        action,
        price,
        quantity,
        timestamp: new Date().toISOString()
      };
      const newLegs = [...t.legs, newLeg];
      
      let newStatus = t.status;
      if (action === "EXIT") {
         newStatus = "CLOSED";
      }

      return {
        ...t,
        status: newStatus,
        legs: newLegs,
        ...(action === "EXIT" ? { closedAt: newLeg.timestamp, exitPrice: price } : {})
      }
    }))
  }

  return (
    <TradeContext.Provider value={{ trades, openTrades, closedTrades, addTrade, addTradeLeg }}>
      {children}
    </TradeContext.Provider>
  )
}

export function useTrades() {
  const ctx = useContext(TradeContext)
  if (!ctx) throw new Error("useTrades must be used within TradeProvider")
  return ctx
}
