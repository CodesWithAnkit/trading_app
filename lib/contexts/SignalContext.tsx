"use client"
import React, { createContext, useContext, useState } from "react"
import { Signal, mockSignals } from "@/mock/signals"

type SignalContextType = {
  signals: Signal[]
  activeSignals: Signal[]
  expiredSignals: Signal[]
  updateSignalStatus: (id: string, status: Signal["status"]) => void
}

const SignalContext = createContext<SignalContextType | undefined>(undefined)

export function SignalProvider({ children }: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<Signal[]>(mockSignals)

  const activeSignals = signals.filter(s => s.status === "ACTIVE" || s.status === "EXPIRING")
  const expiredSignals = signals.filter(s => s.status === "EXPIRED" || s.status === "INVALIDATED" || s.status === "SKIPPED" || s.status === "ENTERED")

  const updateSignalStatus = (id: string, status: Signal["status"]) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  return (
    <SignalContext.Provider value={{ signals, activeSignals, expiredSignals, updateSignalStatus }}>
      {children}
    </SignalContext.Provider>
  )
}

export function useSignals() {
  const ctx = useContext(SignalContext)
  if (!ctx) throw new Error("useSignals must be used within SignalProvider")
  return ctx
}
