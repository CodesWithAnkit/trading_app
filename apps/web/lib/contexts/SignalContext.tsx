"use client"
import React, { createContext, useContext, useState } from "react"
import type { Signal } from "@/mock/signals"
import type { ApproachingSetup, MomentumStock } from "@/lib/scanner-types"

export type StreamStatus = "connecting" | "live" | "reconnecting"

type SignalContextType = {
  signals: Signal[]
  activeSignals: Signal[]
  expiredSignals: Signal[]
  approachingSignals: ApproachingSetup[]
  momentum: MomentumStock[]
  watchingCount: number
  streamStatus: StreamStatus
  /** False until the first snapshot arrives, so pages can tell "loading" from "empty". */
  hydrated: boolean
  updateSignalStatus: (id: string, status: Signal["status"]) => void
}

const SignalContext = createContext<SignalContextType | undefined>(undefined)

// Same-origin through the Next rewrite by default; point straight at NestJS if a proxy buffers the stream.
const STREAM_URL = process.env.NEXT_PUBLIC_SCANNER_STREAM_URL || "/api/v1/scanner/stream"

export function SignalProvider({ children }: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<Signal[]>([])
  const [approachingSignals, setApproachingSignals] = useState<ApproachingSetup[]>([])
  const [momentum, setMomentum] = useState<MomentumStock[]>([])
  const [watchingCount, setWatchingCount] = useState(0)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting")
  const [hydrated, setHydrated] = useState(false)

  React.useEffect(() => {
    let cancelled = false

    // Signals fired before this tab connected; SSE only carries new ones. Approaching and
    // momentum are not fetched here: the stream sends both on every (re)connect, and a
    // slower REST response would overwrite them with older data.
    const loadSnapshot = () =>
      fetch("/api/v1/scanner/top-setups")
        .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((payload: { data?: Signal[] }) => {
          if (cancelled) return
          // Merge, keeping local copies (and their local status changes) of signals already held.
          setSignals(prev => {
            const known = new Set(prev.map(s => s.id))
            return [...prev, ...(payload.data ?? []).filter(s => !known.has(s.id))]
          })
        })
        .catch(err => console.error("Failed to load scanner snapshot", err))
        .finally(() => !cancelled && setHydrated(true))

    const source = new EventSource(STREAM_URL)

    source.onopen = () => {
      setStreamStatus("live")
      // Also refills anything missed while a dropped connection was reconnecting.
      loadSnapshot()
    }
    source.onerror = () => setStreamStatus(source.readyState === EventSource.CLOSED ? "connecting" : "reconnecting")

    source.addEventListener("signal:new", (e: MessageEvent) => {
      const signal = JSON.parse(e.data) as Signal
      setSignals(prev => [signal, ...prev.filter(s => s.id !== signal.id)])
    })
    source.addEventListener("approaching:update", (e: MessageEvent) => {
      setApproachingSignals(JSON.parse(e.data) as ApproachingSetup[])
    })
    source.addEventListener("momentum:update", (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as { watching: number; stocks: MomentumStock[] }
      setWatchingCount(payload.watching)
      setMomentum(payload.stocks)
    })

    return () => {
      cancelled = true
      source.close()
    }
  }, [])

  const activeSignals = signals.filter(s => s.status === "ACTIVE" || s.status === "EXPIRING")
  const expiredSignals = signals.filter(s => s.status === "EXPIRED" || s.status === "INVALIDATED" || s.status === "SKIPPED" || s.status === "ENTERED")

  const updateSignalStatus = (id: string, status: Signal["status"]) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  return (
    <SignalContext.Provider
      value={{ signals, activeSignals, expiredSignals, approachingSignals, momentum, watchingCount, streamStatus, hydrated, updateSignalStatus }}
    >
      {children}
    </SignalContext.Provider>
  )
}

export function useSignals() {
  const ctx = useContext(SignalContext)
  if (!ctx) throw new Error("useSignals must be used within SignalProvider")
  return ctx
}
