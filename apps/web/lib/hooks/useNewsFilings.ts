"use client"
import { apiFetch, openAuthedStream } from "@/lib/api/apiFetch"
import * as React from "react"
import type { NewsFetchRunContract, NewsScheduleContract, NewsFilingItemContract, NewsFilingsResponseContract } from "../contracts/intelligence"

export interface UseNewsFilingsReturn {
  events: NewsFilingItemContract[]
  totalCount: number
  officialCount: number
  highImpactCount: number
  lastIngestionAt: string
  isLoading: boolean
  /** True once the first load finished, so an empty list means "nothing stored". */
  hasLoaded: boolean
  error: Error | null
  refresh: () => Promise<void>
  /** Spec 0024 AC-8: the latest fetch run, and whether one is in progress. */
  latestRun: NewsFetchRunContract | null
  isFetching: boolean
  /** Seconds left on the manual cooldown after a 429, else null. */
  retryAfter: number | null
  fetchError: string | null
  /** Spec 0024 AC-1: ask the backend to fetch now (admin only). */
  fetchLatest: () => Promise<void>
  /** Spec 0024 AC-10: cancel the running fetch (admin only). */
  cancelFetch: () => Promise<void>
  /** Spec 0024 AC-11: the scheduled fetch pause state, and pause/resume (admin only). */
  schedule: NewsScheduleContract | null
  setSchedulePaused: (paused: boolean) => Promise<void>
}

const EMPTY: NewsFilingsResponseContract = { events: [], totalCount: 0, officialCount: 0, highImpactCount: 0, lastIngestionAt: "" }
const RUN_POLL_MS = 2_000

/** Summary counts for a list (kept in step when SSE adds items). */
function summarize(events: NewsFilingItemContract[], lastIngestionAt: string): NewsFilingsResponseContract {
  return {
    events,
    totalCount: events.length,
    officialCount: events.filter(e => e.isOfficialFiling).length,
    highImpactCount: events.filter(e => e.impactLevel === "HIGH").length,
    lastIngestionAt,
  }
}

export function useNewsFilings(symbol?: string, pollIntervalMs = 60_000): UseNewsFilingsReturn {
  const [data, setData] = React.useState<NewsFilingsResponseContract>(EMPTY)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasLoaded, setHasLoaded] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [latestRun, setLatestRun] = React.useState<NewsFetchRunContract | null>(null)
  const [requesting, setRequesting] = React.useState(false)
  const [retryAfter, setRetryAfter] = React.useState<number | null>(null)
  const [fetchError, setFetchError] = React.useState<string | null>(null)
  const [schedule, setSchedule] = React.useState<NewsScheduleContract | null>(null)

  const fetchNews = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const url = symbol ? `/api/v1/intelligence/news?symbol=${encodeURIComponent(symbol)}` : "/api/v1/intelligence/news"
      const res = await apiFetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const json: NewsFilingsResponseContract = await res.json()
      setData(json?.events ? json : EMPTY)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
      setHasLoaded(true)
    }
  }, [symbol])

  const loadLatestRun = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/intelligence/news/fetch-runs/latest")
      if (!res.ok) return null
      const text = await res.text()
      const run: NewsFetchRunContract | null = text ? JSON.parse(text) : null
      setLatestRun(run)
      return run
    } catch {
      return null
    }
  }, [])

  const loadSchedule = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/intelligence/news/schedule")
      if (res.ok) setSchedule(await res.json())
    } catch {
      // the paused banner just stays hidden
    }
  }, [])

  React.useEffect(() => {
    fetchNews()
    loadLatestRun()
    loadSchedule()
    const timer = setInterval(() => {
      fetchNews()
      loadLatestRun()
      loadSchedule()
    }, pollIntervalMs)
    return () => clearInterval(timer)
  }, [fetchNews, loadLatestRun, loadSchedule, pollIntervalMs])

  // While a run is going, follow it until it finishes, then reload the list once.
  const running = latestRun?.status === "running"
  React.useEffect(() => {
    if (!running) return
    const timer = setInterval(async () => {
      const run = await loadLatestRun()
      if (run && run.status !== "running") fetchNews()
    }, RUN_POLL_MS)
    return () => clearInterval(timer)
  }, [running, loadLatestRun, fetchNews])

  // Count the cooldown down to zero.
  React.useEffect(() => {
    if (!retryAfter) return
    const timer = setTimeout(() => setRetryAfter(s => (s && s > 1 ? s - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [retryAfter])

  const fetchLatest = React.useCallback(async () => {
    setRequesting(true)
    setFetchError(null)
    try {
      const res = await apiFetch("/api/v1/intelligence/news/fetch", { method: "POST" })
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setRetryAfter(Number(body?.retryAfter) || 60)
        return
      }
      if (!res.ok) throw new Error(`Fetch failed (HTTP ${res.status})`)
      await loadLatestRun()
    } catch (err) {
      setFetchError((err as Error).message)
    } finally {
      setRequesting(false)
    }
  }, [loadLatestRun])

  const cancelFetch = React.useCallback(async () => {
    if (!latestRun || latestRun.status !== "running") return
    setFetchError(null)
    try {
      const res = await apiFetch(`/api/v1/intelligence/news/fetch-runs/${latestRun.id}/cancel`, { method: "POST" })
      if (!res.ok && res.status !== 409) throw new Error(`Cancel failed (HTTP ${res.status})`)
      await loadLatestRun()
    } catch (err) {
      setFetchError((err as Error).message)
    }
  }, [latestRun, loadLatestRun])

  const setSchedulePaused = React.useCallback(async (paused: boolean) => {
    setFetchError(null)
    try {
      const res = await apiFetch("/api/v1/intelligence/news/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      })
      if (!res.ok) throw new Error(`Could not ${paused ? "pause" : "resume"} the schedule (HTTP ${res.status})`)
      setSchedule(await res.json())
    } catch (err) {
      setFetchError((err as Error).message)
    }
  }, [])

  // Real time: each newly stored item arrives once as `intelligence:news` (spec 0024 AC-8).
  React.useEffect(() => {
    const closeStream = openAuthedStream("/api/v1/scanner/stream", eventSource => {
      eventSource.addEventListener("intelligence:news", (event: MessageEvent) => {
        try {
          const item: NewsFilingItemContract = JSON.parse(event.data)
          if (symbol && item.symbol !== symbol.toUpperCase() && !item.isMacro) return
          setData(prev => summarize([item, ...prev.events.filter(e => e.id !== item.id)], item.ingestedAt))
        } catch (e) {
          console.error("Error parsing intelligence:news SSE:", e)
        }
      })
    })
    return closeStream
  }, [symbol])

  return {
    ...data,
    isLoading,
    hasLoaded,
    error,
    refresh: fetchNews,
    latestRun,
    isFetching: requesting || running,
    retryAfter,
    fetchError,
    fetchLatest,
    cancelFetch,
    schedule,
    setSchedulePaused,
  }
}
