"use client"
import React from "react"
import { DashboardProvider } from "@/lib/contexts/DashboardContext"
import { SignalProvider } from "@/lib/contexts/SignalContext"
import { TradeProvider } from "@/lib/contexts/TradeContext"
import { SettingsProvider } from "@/lib/contexts/SettingsContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <DashboardProvider>
        <SignalProvider>
          <TradeProvider>
            {children}
          </TradeProvider>
        </SignalProvider>
      </DashboardProvider>
    </SettingsProvider>
  )
}
