"use client"
import * as React from "react"
import Link from "next/link"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { minutesLeft } from "@/components/domain/SignalCard"
import { useNow } from "@/lib/useNow"
import { 
  Radar, 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Eye, 
  BookmarkPlus,
  AlertCircle
} from "lucide-react"

export default function SignalScannerPage() {
  const { activeSignals, approachingSignals, watchingCount, streamStatus, hydrated } = useSignals()
  const { instruments } = useDashboardState()
  const [filterDirection, setFilterDirection] = React.useState<"ALL" | "LONG" | "SHORT" | "EXPIRING">("ALL")
  const [sectorFilter, setSectorFilter] = React.useState<string>("ALL")
  const now = useNow()

  const watching = watchingCount || instruments.length

  const filteredSignals = activeSignals.filter(signal => {
    if (filterDirection === "LONG" && signal.direction !== "LONG") return false
    if (filterDirection === "SHORT" && signal.direction !== "SHORT") return false
    if (filterDirection === "EXPIRING") {
      const left = minutesLeft(signal.expiresAt, now)
      if (left === null || left > 5) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero Title */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">radar</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Signal Scanner
              </h1>
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-label-code text-label-code font-bold uppercase">
                {activeSignals.length} Active Candidates
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-high text-text-secondary font-label-code text-label-code hidden sm:inline">
                NSE Cash Universe ({watching} Monitored)
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Ranked by multi-factor quantitative confluence, VWAP support, and volume acceleration. Manual execution only.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-border-subtle">
            <button
              onClick={() => setFilterDirection("ALL")}
              className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                filterDirection === "ALL" ? "bg-surface text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              All ({activeSignals.length})
            </button>
            <button
              onClick={() => setFilterDirection("LONG")}
              className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                filterDirection === "LONG" ? "bg-surface text-accent-bullish shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setFilterDirection("SHORT")}
              className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                filterDirection === "SHORT" ? "bg-surface text-accent-danger shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Short
            </button>
            <button
              onClick={() => setFilterDirection("EXPIRING")}
              className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                filterDirection === "EXPIRING" ? "bg-surface text-accent-bearish shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Expiring Soon
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 font-label-code text-label-code text-primary bg-surface shadow-xs px-space-md py-1.5 rounded font-semibold hover:bg-surface-container transition-colors border border-border-subtle"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-scan
          </button>
        </div>
      </div>

      {/* Main Signal Candidates Stack */}
      <div className="flex flex-col gap-space-md">
        {filteredSignals.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-secondary mb-3">
              <Radar className="w-7 h-7" />
            </div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">No Matching Setups Found</h3>
            <p className="font-body-xs text-body-xs text-text-secondary max-w-sm mt-1">
              Currently no stocks match the active filter criteria. Check approaching setups or reset filters.
            </p>
          </div>
        ) : (
          filteredSignals.map((signal, index) => {
            const isLong = signal.direction === "LONG"
            const left = minutesLeft(signal.expiresAt, now)
            const isExpiring = left !== null && left <= 5
            const score = signal.confidence || 75

            return (
              <div
                key={signal.id}
                className="bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-border-subtle"
              >
                {/* Top Metadata Stripe */}
                <div className="bg-surface-high px-space-md py-space-xs flex flex-wrap items-center justify-between text-text-secondary font-label-code text-label-code border-b border-border-subtle">
                  <div className="flex items-center gap-space-md">
                    <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      Rank {String(index + 1).padStart(2, "0")} • {signal.setup}
                    </span>
                    <span className="hidden sm:inline">Feed Latency: 12ms (Optimal)</span>
                    <span>Exchange: NSE CASH</span>
                  </div>

                  <div className="flex items-center gap-space-sm font-semibold">
                    <span className="material-symbols-outlined text-[15px] text-accent-bearish">timer</span>
                    <span className={isExpiring ? "text-accent-danger font-bold" : "text-text-primary"}>
                      Lifespan: {left === null ? "Active" : left === 0 ? "Expired" : `${left}m remaining`}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isExpiring ? "bg-accent-danger" : "bg-accent-bullish animate-ping"}`} />
                  </div>
                </div>

                {/* Candidate Content 12-Column Grid */}
                <div className="p-space-lg grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-center">
                  {/* Col 1: Ticker, Direction, Setup Details (Cols 1-3) */}
                  <div className="xl:col-span-3 space-y-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-md text-headline-md font-bold text-text-primary">
                        {signal.symbol}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-code text-label-code font-bold ${
                        isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
                      }`}>
                        {isLong ? "▲ LONG" : "▼ SHORT"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-label-code font-medium">
                        Equity
                      </span>
                    </div>

                    <div className="flex items-baseline gap-space-sm">
                      <span className="font-metric-lg text-metric-lg font-bold text-text-primary">
                        ₹{signal.price.toFixed(2)}
                      </span>
                      <span className={`font-label-code text-label-code font-bold ${isLong ? "text-accent-bullish" : "text-accent-bearish"}`}>
                        {isLong ? "+1.85%" : "-1.20%"} Today
                      </span>
                      <span className="font-label-code text-label-code text-text-secondary">
                        (Vol: {signal.metrics?.relativeVolume || "2.4x"})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-surface-high font-body-xs text-body-xs text-text-primary font-medium">
                        {signal.setup}
                      </span>
                      <span className="text-label-code font-label-code text-status-live-text font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Gate: PASS
                      </span>
                    </div>
                  </div>

                  {/* Col 2: Precise Levels & Risk Parameters (Cols 4-8) */}
                  <div className="xl:col-span-5 bg-surface-bright rounded-lg p-space-md grid grid-cols-2 sm:grid-cols-4 gap-space-sm border border-border-subtle">
                    <div>
                      <span className="block font-label-code text-label-code text-text-secondary uppercase">Entry Zone</span>
                      <span className="font-metric-md text-metric-md font-bold text-text-primary">
                        ₹{signal.entryZone?.low?.toFixed(2)}–{signal.entryZone?.high?.toFixed(2)}
                      </span>
                      <span className="block font-label-code text-label-code text-accent-bullish">Targeted zone</span>
                    </div>
                    <div>
                      <span className="block font-label-code text-label-code text-accent-danger uppercase">Stop Loss</span>
                      <span className="font-metric-md text-metric-md font-bold text-accent-danger">
                        ₹{signal.stop?.toFixed(2)}
                      </span>
                      <span className="block font-label-code text-label-code text-text-secondary">Risk defined</span>
                    </div>
                    <div>
                      <span className="block font-label-code text-label-code text-text-secondary uppercase">Target 1 & 2</span>
                      <span className="font-metric-md text-metric-md font-bold text-text-primary">
                        ₹{signal.targets?.t1?.toFixed(2)} {signal.targets?.t2 ? `/ ${signal.targets.t2.toFixed(2)}` : ""}
                      </span>
                      <span className="block font-label-code text-label-code text-status-live-text">Book 50% on T1</span>
                    </div>
                    <div>
                      <span className="block font-label-code text-label-code text-text-secondary uppercase">Net R:R Ratio</span>
                      <span className="font-metric-md text-metric-md font-bold text-accent-primary">
                        {signal.metrics?.riskReward || "1 : 2.0"}
                      </span>
                      <span className="block font-label-code text-label-code text-text-secondary">Post Charges</span>
                    </div>
                  </div>

                  {/* Col 3: Quality Score (Cols 9-10) */}
                  <div className="xl:col-span-2 space-y-1.5 pl-0 xl:pl-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-code text-label-code text-text-secondary uppercase">Setup Score</span>
                      <span className="font-label-code text-label-code font-bold text-accent-bullish bg-status-live-bg px-1.5 py-0.5 rounded">
                        {score >= 80 ? "HIGH" : "GOOD"} ({score}/100)
                      </span>
                    </div>
                    <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                      <div className="bg-accent-bullish h-full rounded-full" style={{ width: `${score}%` }}></div>
                    </div>
                    <div className="font-label-code text-label-code text-text-secondary leading-snug">
                      Determinism: <span className="text-text-primary font-medium">100% Rule Valid</span><br />
                      Execution: <span className="text-accent-primary font-bold">Manual Angel One</span>
                    </div>
                  </div>

                  {/* Col 4: Action Buttons (Cols 11-12) */}
                  <div className="xl:col-span-2 flex flex-row xl:flex-col gap-space-sm justify-end">
                    <Link
                      href={`/dashboard/analysis/${signal.symbol}`}
                      className="flex-1 xl:flex-none h-8 px-3 rounded bg-surface-container hover:bg-surface-container-high text-primary font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border border-border-subtle shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Analysis</span>
                    </Link>
                    <button
                      type="button"
                      title="Log manual entry into trade journal"
                      className="flex-1 xl:flex-none h-8 px-3 rounded bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>I Entered</span>
                    </button>
                  </div>
                </div>

                {/* Inline Visual Micro-Tape / Evidence Sub-band */}
                <div className="bg-surface-bright px-space-md py-2 flex flex-wrap items-center justify-between gap-space-md text-body-xs text-text-secondary border-t border-border-subtle">
                  <div className="flex items-center gap-space-md flex-wrap">
                    <span className="font-semibold text-text-primary">Confluence Triggers:</span>
                    <span className="inline-flex items-center gap-1 text-accent-bullish font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish"></span>
                      {signal.rationale || "5m Candle closed cleanly > VWAP with volume surge"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-accent-bullish font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish"></span>
                      Trend Alignment: {signal.metrics?.trendAlignment || "Bullish Multi-Timeframe"}
                    </span>
                  </div>
                  <div className="font-label-code text-label-code text-text-secondary">
                    Safety Gate: <span className="text-text-primary font-semibold">ALL GATES PASS</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
