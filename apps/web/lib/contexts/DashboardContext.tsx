"use client"
import React, { createContext, useContext, useState } from "react"
import { MarketState, mockMarketState } from "@/mock/market"

type DashboardState = {
  marketState: MarketState
  updatedAt: string
  setMarketState: (state: MarketState) => void
}

const DashboardContext = createContext<DashboardState | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(mockMarketState)

  return (
    <DashboardContext.Provider
      value={{
        marketState: state.state,
        updatedAt: state.updatedAt,
        setMarketState: (s) => setState({ state: s, updatedAt: new Date().toISOString() })
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardState() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboardState must be used within DashboardProvider")
  return ctx
}
