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
  const [trades, setTrades] = useState<Trade[]>([])

  React.useEffect(() => {
    fetch("http://localhost:3001/api/v1/journal")
      .then(res => res.json())
      .then(data => {
        if (!data.data || data.data.length === 0) {
          setTrades(mockTrades);
          return;
        }
        const mappedTrades = data.data.map((je: any) => ({
          id: je.id,
          symbol: je.symbol,
          direction: "LONG", // We can't easily infer direction without strategy_name parsing, defaulting to LONG
          status: je.status === "PENDING" ? "OPEN" : je.status === "WON" || je.status === "LOST" ? "CLOSED" : je.status,
          quantity: 100,
          entryPrice: je.entry_price,
          netPnl: je.status === "WON" ? (je.target_price - je.entry_price) * 100 : je.status === "LOST" ? (je.stop_price - je.entry_price) * 100 : 0,
          legs: [],
          notes: je.notes || "",
          createdAt: je.created_at
        })) as Trade[];
        setTrades(mappedTrades);
      })
      .catch(() => setTrades(mockTrades))
  }, [])

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
