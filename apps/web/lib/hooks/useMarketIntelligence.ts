"use client"
import { apiFetch, openAuthedStream } from "@/lib/api/apiFetch"
import * as React from "react"
import type { MarketContextContract } from "../contracts/intelligence"

export interface UseMarketIntelligenceReturn {
  data: MarketContextContract | null
  error: Error | null
  isLoading: boolean
  isStale: boolean
  isDisconnected: boolean
  feedLatencyMs: number
  refresh: () => Promise<void>
}

export function useMarketIntelligence(pollIntervalMs = 30_000): UseMarketIntelligenceReturn {
  const [data, setData] = React.useState<MarketContextContract | null>(null)
  const [error, setError] = React.useState<Error | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [lastTickReceivedAt, setLastTickReceivedAt] = React.useState<number>(Date.now())

  const fetchContext = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiFetch("/api/v1/intelligence/context")
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const json: MarketContextContract = await res.json()
      setData(json)
      setError(null)
      setLastTickReceivedAt(Date.now())
    } catch (err: any) {
      console.warn("Failed fetching market intelligence context, preserving state:", err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch and polling loop
  React.useEffect(() => {
    fetchContext()
    const timer = setInterval(fetchContext, pollIntervalMs)
    return () => clearInterval(timer)
  }, [fetchContext, pollIntervalMs])

  // Live SSE listener for real time regime shifts
  React.useEffect(() => {
    // spec 0021 AC-6: ticket authenticated stream with automatic reconnect.
    const closeStream = openAuthedStream("/api/v1/scanner/stream", eventSource => {
      eventSource.addEventListener("intelligence:regime", (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data)
          setData(prev => (prev ? { ...prev, ...parsed, snapshotTime: new Date().toISOString() } : parsed))
          setLastTickReceivedAt(Date.now())
        } catch (e) {
          console.error("Error parsing intelligence:regime SSE:", e)
        }
      })
    })

    return closeStream
  }, [])

  const currentAgeMs = Date.now() - lastTickReceivedAt
  const feedLatencyMs = data?.feedLatencyMs ? Math.max(data.feedLatencyMs, currentAgeMs) : currentAgeMs
  const isStale = feedLatencyMs > 5000
  const isDisconnected = feedLatencyMs > 15000 || error !== null

  return {
    data,
    error,
    isLoading,
    isStale,
    isDisconnected,
    feedLatencyMs,
    refresh: fetchContext,
  }
}
