"use client"
import * as React from "react"
import { apiFetch } from "@/lib/api/apiFetch"

// spec 0020: data for /dashboard/backtest. Polls every 3 s while a run or backfill is active.

export type YearStat = { trades: number; netR: number; full: boolean }
export type GateInfo = {
  ok?: boolean
  reasons?: string[]
  fullYears?: number
  positiveYears?: number
  /** spec 0022: symbols the gate was judged on, and those left out for missing history. */
  judgedOn?: string[]
  unavailable?: { symbol: string; provider: string }[]
}
export type OosMetrics = {
  trades: number
  winRate: number
  netR: number
  profitFactor: number
  maxDrawdownR: number
  perYear: Record<string, YearStat>
  equity?: number[]
  gate?: GateInfo
}
export type BuyHoldOos = { returnPct: number; maxDrawdownPct: number; perYear: Record<string, { returnPct: number; full: boolean }> }

export type RunRow = {
  id: string
  rule_id: string
  symbol: string
  status: "queued" | "running" | "done" | "failed"
  progress?: number
  window_start: string | null
  window_end: string | null
  oos_start: string | null
  passed_gate: boolean
  /** Rule runs carry OosMetrics; BASE_BUYHOLD carries returnPct / maxDrawdownPct and per year returnPct instead. */
  out_of_sample:
    | (Partial<Omit<OosMetrics, "perYear">> & {
        returnPct?: number
        maxDrawdownPct?: number
        unavailable?: boolean
        provider?: string
        reason?: string
        perYear?: Record<string, Partial<YearStat> & { returnPct?: number; full: boolean }>
      })
    | null
  gap_days?: number
  created_at: string
  finished_at?: string | null
  error?: string | null
}

export type Leaderboard = { done: RunRow[]; active: RunRow[]; recentFailures: RunRow[] }
export type Definitions = {
  version: string
  rules: Record<string, { name: string; style: string; text: string }>
  ruleIds: string[]
  gate: { minProfitFactor: number; minTrades: number; minFullOosYears: number; minPositiveYearShare: number }
}
export type BackfillState = {
  status: "idle" | "running" | "done" | "failed"
  provider?: string | null
  startedAt: string | null
  finishedAt: string | null
  rows: number
  retries: number
  series: Record<string, { chunk: number; chunks: number; rows: number; from?: string; to?: string; done: boolean; unavailable?: boolean }>
  log: { at: string; type: string; message: string }[]
  error: string | null
}
/** spec 0023: live toggle per guru rule and index. */
export type LiveToggle = {
  ruleId: string
  symbol: string
  enabled: boolean
  state: "off" | "no run" | "warming up" | "live" | "blocked"
  reason: string | null
  runId: string | null
  updatedAt: string | null
}

export async function fetchToggles(): Promise<LiveToggle[]> {
  return json<LiveToggle[]>(await apiFetch("/api/v1/backtest/toggles"))
}

export async function updateToggle(ruleId: string, symbol: string, enabled: boolean): Promise<LiveToggle> {
  return json<LiveToggle>(
    await apiFetch(`/api/v1/backtest/toggles/${encodeURIComponent(ruleId)}/${encodeURIComponent(symbol)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }),
  )
}

export type HistoryCounts = Record<string, { count: number; first: string | null; last: string | null }>

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body?.message ?? `HTTP ${res.status}`), { status: res.status })
  return body as T
}

export function useBacktest() {
  const [board, setBoard] = React.useState<Leaderboard | null>(null)
  const [defs, setDefs] = React.useState<Definitions | null>(null)
  const [backfill, setBackfill] = React.useState<BackfillState | null>(null)
  const [history, setHistory] = React.useState<HistoryCounts | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<{ tone: "error" | "info"; title: string; text: string } | null>(null)

  const load = React.useCallback(async () => {
    try {
      const [b, f] = await Promise.all([
        apiFetch("/api/v1/backtest/leaderboard").then(json<Leaderboard>),
        apiFetch("/api/v1/backtest/backfill").then(json<BackfillState>),
      ])
      setBoard(b)
      setBackfill(f)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    const first = setTimeout(load, 0)
    apiFetch("/api/v1/backtest/definitions").then(json<Definitions>).then(setDefs).catch(() => undefined)
    apiFetch("/api/v1/backtest/history").then(json<HistoryCounts>).then(setHistory).catch(() => undefined)
    return () => clearTimeout(first)
  }, [load])

  const busy = Boolean(board?.active.length) || backfill?.status === "running"
  React.useEffect(() => {
    if (!busy) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [busy, load])

  // Refresh history counts when a backfill finishes.
  const prevBackfill = React.useRef(backfill?.status)
  React.useEffect(() => {
    if (prevBackfill.current === "running" && backfill?.status !== "running") {
      apiFetch("/api/v1/backtest/history").then(json<HistoryCounts>).then(setHistory).catch(() => undefined)
    }
    prevBackfill.current = backfill?.status
  }, [backfill?.status])

  const startRuns = async (ruleIds: string[], symbols: string[]) => {
    setNotice(null)
    try {
      await apiFetch("/api/v1/backtest/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleIds, symbols }),
      }).then(json)
      await load()
    } catch (e) {
      const status = (e as { status?: number }).status
      setNotice({
        tone: "error",
        title: status === 409 ? "Nothing was started" : "Could not start the runs",
        text: (e as Error).message,
      })
    }
  }

  const startBackfill = async (symbols: string[]) => {
    setNotice(null)
    try {
      await apiFetch("/api/v1/backtest/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      }).then(json)
      await load()
    } catch (e) {
      const status = (e as { status?: number }).status
      setNotice({
        tone: "error",
        title: status === 409 ? "Backfill already running" : status === 502 ? "Broker error" : "Could not start the backfill",
        text: (e as Error).message,
      })
    }
  }

  return { board, defs, backfill, history, error, notice, setNotice, startRuns, startBackfill, reload: load }
}

export type TradesPage = {
  data: {
    id: string
    trade_date: string
    side: "LONG" | "SHORT"
    entry_time: string
    entry: number
    stop: number
    target: number
    exit_time: string
    exit: number
    exit_reason: "target" | "stop" | "time"
    r_gross: number
    cost_r: number
    r_net: number
    is_oos: boolean
  }[]
  nextCursor: string | null
  counts: { target: number; stop: number; time: number }
  total: number
}

export async function fetchTrades(runId: string, oos: "true" | "false" | "all", cursor?: string | null): Promise<TradesPage> {
  const p = new URLSearchParams({ limit: "200" })
  if (oos !== "all") p.set("oos", oos)
  if (cursor) p.set("cursor", cursor)
  return json<TradesPage>(await apiFetch(`/api/v1/backtest/runs/${runId}/trades?${p}`))
}
