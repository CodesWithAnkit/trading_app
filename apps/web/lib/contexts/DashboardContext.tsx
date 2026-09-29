"use client"
import React, { createContext, useContext, useState } from "react"
import { MarketState, mockMarketState } from "@/mock/market"

type DashboardState = {
  marketState: MarketState
  updatedAt: string
  setMarketState: (state: MarketState) => void
}

const DashboardContext = createContext<DashboardState | undefined>(undefined)

import { createClient } from "@/lib/supabase"

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(mockMarketState)

  React.useEffect(() => {
    const supabase = createClient()
    
    const fetchHealth = async () => {
      const { data, error } = await supabase
        .from('feed_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        
      if (data && !error) {
        updateStateFromHealth(data)
      }
    }

    const updateStateFromHealth = (payload: any) => {
      const status = payload.status
      let nextState: MarketState = 'DISCONNECTED'
      
      if (status === 'CONNECTED') {
        const lastTick = payload.last_tick_at ? new Date(payload.last_tick_at) : null
        const isStale = lastTick && (Date.now() - lastTick.getTime() > 15 * 60 * 1000)
        
        nextState = isStale ? 'DELAYED' : 'LIVE'
      } else if (status === 'DELAYED' || status === 'STALE') {
        nextState = 'DELAYED'
      }
      
      setState({ state: nextState, updatedAt: new Date().toISOString() })
    }

    fetchHealth()

    const channel = supabase
      .channel('public:feed_health')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_health' }, payload => {
        updateStateFromHealth(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
