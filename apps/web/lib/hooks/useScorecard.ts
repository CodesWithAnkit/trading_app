"use client"
import * as React from "react"
import { apiFetch } from "@/lib/api/apiFetch"

// spec 0027: data for the Scorecard page (/dashboard/performance).

export type ScorecardRow = {
  key: string
  label: string
  trades: number
  wins: number
  losses: number
  neutrals: number
  winRate: number | null
  avgWinR: number | null
  avgLossR: number | null
  avgRGross: number | null
  expectancyNet: number | null
  estimatedCostShare: number | null
  tooFew: boolean
}

export type CutKey = "strategy" | "setup" | "timeBucket" | "regime" | "newsVerdict"

export type ScorecardData = {
  range: { all: boolean; from: string | null; to: string | null }
  settings: { minSample: number; riskBudget: number; riskBudgetAssumed: boolean }
  excluded: { unreconciled: number; invalidRisk: number }
  overall: ScorecardRow
  cuts: Record<CutKey, ScorecardRow[]>
  curve: { strategyId: string; points: { at: string; cumNetR: number }[] }[]
  curveOmitted: string[]
  filterOptions: { strategies: string[]; versions: string[] }
}

export type RangePreset = "30d" | "90d" | "all" | "custom"

export type ScorecardFilters = {
  preset: RangePreset
  from: string
  to: string
  direction: "" | "LONG" | "SHORT"
  strategyId: string
  strategyVersion: string
}

/** Today's date in IST as YYYY-MM-DD, matching the backend's day boundaries. */
export function istToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d)
}

export function queryFor(f: ScorecardFilters): string {
  const p = new URLSearchParams()
  if (f.preset === "all") p.set("range", "all")
  else if (f.preset === "90d") p.set("from", istToday(-90))
  else if (f.preset === "custom") {
    if (f.from) p.set("from", f.from)
    if (f.to) p.set("to", f.to)
  }
  if (f.direction) p.set("direction", f.direction)
  if (f.strategyId) p.set("strategyId", f.strategyId)
  if (f.strategyVersion) p.set("strategyVersion", f.strategyVersion)
  const s = p.toString()
  return s ? `?${s}` : ""
}

export function useScorecard(filters: ScorecardFilters) {
  const [data, setData] = React.useState<ScorecardData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [nonce, setNonce] = React.useState(0)
  const query = queryFor(filters)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/api/v1/scorecard${query}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message ?? `Scorecard request failed (${res.status})`)
        return body as ScorecardData
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: Error) => {
        // AC-14: never keep stale numbers on screen after a failure.
        if (!cancelled) {
          setData(null)
          setError(e.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, nonce])

  return { data, error, loading, retry: () => setNonce((n) => n + 1) }
}
