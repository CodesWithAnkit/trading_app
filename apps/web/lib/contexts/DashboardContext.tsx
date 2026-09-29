"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import { MarketState } from "@/mock/market"

export type MarketWatchInstrument = {
  symbol: string;
  ltp: number;
  dayOpen: number;
  change1dPct: number;
  volume: number;
  lastTickAt: string;
  status: string;
}

export type MarketStatusPayload = {
  status: MarketState;
  lastTickAt: string | null;
  subscribedCount: number;
  sessionState: string;
  providerType: string;
  serverTime: string;
}

type DashboardState = {
  marketState: MarketState
  marketStatus: MarketStatusPayload | null
  updatedAt: string
  sessionElapsedMinutes: number
  instruments: MarketWatchInstrument[]
  setMarketState: (state: MarketState) => void
}

const DashboardContext = createContext<DashboardState | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [marketState, setMarketState] = useState<MarketState>('SIMULATED')
  const [marketStatus, setMarketStatus] = useState<MarketStatusPayload | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString())
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState(0)
  const [instruments, setInstruments] = useState<MarketWatchInstrument[]>([])

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [statusRes, watchRes] = await Promise.all([
          fetch('/api/v1/market/status'),
          fetch('/api/v1/market/watch')
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json() as MarketStatusPayload;
          setMarketState(statusData.status);
          setMarketStatus(statusData);
          
          if (statusData.lastTickAt) {
            setUpdatedAt(statusData.lastTickAt);
          }

          // Calculate session elapsed if OPEN
          if (statusData.sessionState === 'OPEN' || statusData.sessionState === 'CLOSING') {
            const now = new Date();
            const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const openTime = new Date(istTime);
            openTime.setHours(9, 15, 0, 0);
            
            const diffMs = istTime.getTime() - openTime.getTime();
            setSessionElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
          } else {
            setSessionElapsedMinutes(0);
          }
        }

        if (watchRes.ok) {
          const watchData = await watchRes.json();
          setInstruments(watchData.instruments || []);
        }
      } catch (err) {
        console.error("Failed to fetch market data", err);
      }
    }

    // Initial fetch
    fetchMarketData()

    // 5-second polling
    const interval = setInterval(fetchMarketData, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        marketState,
        marketStatus,
        updatedAt,
        sessionElapsedMinutes,
        instruments,
        setMarketState: (s) => setMarketState(s)
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
