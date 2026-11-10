"use client"
import { apiFetch, openAuthedStream } from "@/lib/api/apiFetch"
import React, { createContext, useContext, useState } from "react"
import type { ExitReason, NewsGateEvent, Signal, SignalExit, SignalStatus } from "@/mock/signals"
import type { ApproachingSetup, MomentumStock } from "@/lib/scanner-types"

export type StreamStatus = "connecting" | "live" | "reconnecting"

const EXIT_STATUS: Record<ExitReason, SignalStatus> = { TARGET: "TARGET_HIT", STOP: "STOP_HIT", TIME: "TIME_EXIT" }
const CLOSED_STATUSES: SignalStatus[] = ["TARGET_HIT", "STOP_HIT", "TIME_EXIT"]
export const isClosedStatus = (status: SignalStatus) => CLOSED_STATUSES.includes(status)

type SignalContextType = {
  signals: Signal[]
  activeSignals: Signal[]
  expiredSignals: Signal[]
  /** Plans closed today by target, stop or the 15:15 time exit (spec 0010). */
  closedSignals: Signal[]
  /** Exit alerts to show as toasts, newest last. */
  exitAlerts: SignalExit[]
  dismissExitAlert: (id: string) => void
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
  const [exitAlerts, setExitAlerts] = useState<SignalExit[]>([])
  // Ids already toasted, so a replayed or duplicate event never toasts twice.
  const toasted = React.useRef(new Set<string>())

  React.useEffect(() => {
    let cancelled = false

    // Signals fired before this tab connected; SSE only carries new ones. Approaching and
    // momentum are not fetched here: the stream sends both on every (re)connect, and a
    // slower REST response would overwrite them with older data.
    const loadSnapshot = () =>
      apiFetch("/api/v1/scanner/top-setups")
        .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((payload: { data?: Signal[] }) => {
          if (cancelled) return
          // Merge: keep local copies (and their local status changes), except that a plan the
          // server has since closed takes the server's version (an exit missed while offline).
          setSignals(prev => {
            const fresh = new Map((payload.data ?? []).map(s => [s.id, s]))
            const merged = prev.map(s => {
              const server = fresh.get(s.id)
              return server && isClosedStatus(server.status) && !isClosedStatus(s.status) ? server : s
            })
            const known = new Set(prev.map(s => s.id))
            return [...merged, ...(payload.data ?? []).filter(s => !known.has(s.id))]
          })
        })
        .catch(err => console.error("Failed to load scanner snapshot", err))
        .finally(() => !cancelled && setHydrated(true))

    // spec 0021 AC-6: ticket authenticated stream; reconnects with a fresh ticket on error or token expiry.
    const closeStream = openAuthedStream(STREAM_URL, source => {
    const opened = source.onopen
    source.onopen = (ev) => {
      opened?.call(source, ev)
      setStreamStatus("live")
      // Also refills anything missed while a dropped connection was reconnecting.
      loadSnapshot()
    }

    source.addEventListener("signal:new", (e: MessageEvent) => {
      const signal = JSON.parse(e.data) as Signal
      setSignals(prev => [signal, ...prev.filter(s => s.id !== signal.id)])
    })
    source.addEventListener("signal:exit", (e: MessageEvent) => {
      const exit = JSON.parse(e.data) as SignalExit
      let alreadyClosed = false
      setSignals(prev => prev.map(s => {
        if (s.id !== exit.id) return s
        alreadyClosed = isClosedStatus(s.status)
        return { ...s, status: EXIT_STATUS[exit.reason], exitPrice: exit.exitPrice, exitAt: exit.exitAt, exitReason: exit.reason }
      }))
      if (!alreadyClosed && !toasted.current.has(exit.id)) {
        toasted.current.add(exit.id)
        setExitAlerts(prev => [...prev, exit])
      }
    })
    // spec 0025 AC-4: a news verdict landed for a signal (entry, or an after entry escalation).
    source.addEventListener("signal:news-gate", (e: MessageEvent) => {
      const v = JSON.parse(e.data) as NewsGateEvent
      setSignals(prev => prev.map(s => {
        if (s.id !== v.signalId) return s
        if (v.kind === "entry") return { ...s, newsGate: v.gate, newsGateReason: v.reason, newsGateItems: v.items, newsGateCheckedAt: v.checkedAt }
        if (v.gate === "pass") return s
        return { ...s, newsAfterGate: v.gate, newsAfterReason: v.reason, newsAfterItems: v.items, newsAfterCheckedAt: v.checkedAt }
      }))
    })
    source.addEventListener("approaching:update", (e: MessageEvent) => {
      setApproachingSignals(JSON.parse(e.data) as ApproachingSetup[])
    })
    source.addEventListener("momentum:update", (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as { watching: number; stocks: MomentumStock[] }
      setWatchingCount(payload.watching)
      setMomentum(payload.stocks)
    })

    }, () => setStreamStatus("reconnecting"))

    return () => {
      cancelled = true
      closeStream()
    }
  }, [])

  const activeSignals = signals.filter(s => s.status === "ACTIVE" || s.status === "EXPIRING")
  const expiredSignals = signals.filter(s => s.status === "EXPIRED" || s.status === "INVALIDATED" || s.status === "SKIPPED" || s.status === "ENTERED")
  const closedSignals = signals
    .filter(s => isClosedStatus(s.status))
    .sort((a, b) => String(b.exitAt ?? "").localeCompare(String(a.exitAt ?? "")))

  const dismissExitAlert = (id: string) => setExitAlerts(prev => prev.filter(a => a.id !== id))

  const updateSignalStatus = (id: string, status: Signal["status"]) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  return (
    <SignalContext.Provider
      value={{ signals, activeSignals, expiredSignals, closedSignals, exitAlerts, dismissExitAlert, approachingSignals, momentum, watchingCount, streamStatus, hydrated, updateSignalStatus }}
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
