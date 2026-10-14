"use client"
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

const DEFAULT_MARKET_CONTEXT: MarketContextContract = {
  regime: "BULLISH_TREND_DAY",
  regimeLabel: "REGIME 01 // BULLISH TREND DAY",
  regimeDescription: "High conviction directional expansion with heavy institutional participation above session VWAP anchors.",
  regimeConfidence: 88,
  niftyLtp: 24845.60,
  niftyChangePct: 0.85,
  vixLtp: 13.42,
  vixChangePct: -3.8,
  vixStatus: "LOW_NORMAL",
  advanceCount: 142,
  declineCount: 56,
  unchangedCount: 32,
  advanceDeclineRatio: 2.54,
  pctAboveVwap: 68,
  medianDayChange: 0.85,
  sectors: [
    { name: "NIFTY METAL", ltp: 9240.50, changePct: 1.82, alphaVsNifty: 1.18, leaderSymbol: "TATASTEEL", leaderChangePct: 2.10, advances: 12, declines: 3, bias: "LONG" },
    { name: "NIFTY AUTO", ltp: 23110.15, changePct: 1.24, alphaVsNifty: 0.60, leaderSymbol: "M&M", leaderChangePct: 1.95, advances: 11, declines: 4, bias: "LONG" },
    { name: "NIFTY BANK", ltp: 52380.40, changePct: 0.38, alphaVsNifty: -0.26, leaderSymbol: "HDFCBANK", leaderChangePct: 0.45, advances: 7, declines: 5, bias: "NEUTRAL" },
    { name: "NIFTY FMCG", ltp: 58410.20, changePct: 0.15, alphaVsNifty: -0.49, leaderSymbol: "ITC", leaderChangePct: 0.30, advances: 8, declines: 7, bias: "NEUTRAL" },
    { name: "NIFTY IT", ltp: 37620.80, changePct: -0.42, alphaVsNifty: -1.06, leaderSymbol: "INFY", leaderChangePct: -0.60, advances: 3, declines: 7, bias: "SHORT" },
    { name: "NIFTY REALTY", ltp: 1012.30, changePct: -1.14, alphaVsNifty: -1.78, leaderSymbol: "DLF", leaderChangePct: -1.80, advances: 2, declines: 8, bias: "SHORT" },
  ],
  snapshotTime: new Date().toISOString(),
  feedLatencyMs: 42,
  feedHealth: "HEALTHY",
}

export function useMarketIntelligence(pollIntervalMs = 30_000): UseMarketIntelligenceReturn {
  const [data, setData] = React.useState<MarketContextContract | null>(DEFAULT_MARKET_CONTEXT)
  const [error, setError] = React.useState<Error | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [lastTickReceivedAt, setLastTickReceivedAt] = React.useState<number>(Date.now())

  const fetchContext = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/v1/intelligence/context")
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
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource("/api/v1/scanner/stream")
      eventSource.addEventListener("intelligence:regime", (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data)
          setData(prev => (prev ? { ...prev, ...parsed, snapshotTime: new Date().toISOString() } : parsed))
          setLastTickReceivedAt(Date.now())
        } catch (e) {
          console.error("Error parsing intelligence:regime SSE:", e)
        }
      })
    } catch (err) {
      console.warn("SSE stream unavailable for market intelligence:", err)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
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
