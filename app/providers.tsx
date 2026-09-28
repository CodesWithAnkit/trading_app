"use client"
import React from "react"
import { DashboardProvider } from "@/lib/contexts/DashboardContext"
import { SignalProvider } from "@/lib/contexts/SignalContext"
import { TradeProvider } from "@/lib/contexts/TradeContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <SignalProvider>
        <TradeProvider>
          {children}
        </TradeProvider>
      </SignalProvider>
    </DashboardProvider>
  )
}
