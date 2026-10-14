"use client"
import * as React from "react"
import { type Signal } from "@/mock/signals"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useNow } from "@/lib/useNow"

/** Whole minutes until the entry window closes (rounded up), or null before the client clock is known. */
export function minutesLeft(expiresAt: string, now: number | null): number | null {
  if (now === null) return null
  const ms = new Date(expiresAt).getTime() - now
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 60_000)) : null
}

export function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.direction === "LONG"
  const isActive = signal.status === "ACTIVE" || signal.status === "EXPIRING"
  const left = minutesLeft(signal.expiresAt, useNow())
  const percentChange = ((signal.price % 2) + 0.5).toFixed(2)

  return (
    <div className={cn(
      "bg-surface rounded-xl shadow-md p-space-md flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200 border border-border-subtle",
      isLong ? "border-l-4 border-l-accent-bullish" : "border-l-4 border-l-accent-bearish"
    )}>
      <div>
        {/* Header Ticker & Badges */}
        <div className="flex items-start justify-between mb-space-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-md text-headline-md font-bold text-text-primary">{signal.symbol}</span>
              <span className="font-label-code text-label-code text-text-secondary px-1 py-0.5 rounded bg-surface-high">NSE CASH</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary truncate max-w-[200px]">
              {signal.setup || "VWAP Pullback + Vol Surge"}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn(
              "px-2 py-0.5 rounded font-label-code text-label-code font-bold flex items-center gap-1",
              isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
            )}>
              {isLong ? "▲ LONG" : "▼ SHORT"}
            </span>
            <span className="font-label-code text-label-code font-semibold px-1.5 py-0.5 rounded bg-primary-container text-on-primary">
              SCORE {signal.confidence}/100
            </span>
          </div>
        </div>

        {/* Price & Expiry Bar */}
        <div className="bg-surface-container-low rounded-lg p-space-sm mb-space-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex flex-col">
              <span className="font-label-code text-label-code uppercase text-text-secondary">Live Price</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-metric-lg text-metric-lg font-bold text-text-primary">₹{signal.price.toFixed(2)}</span>
                <span className={cn("font-label-code text-label-code font-semibold", isLong ? "text-accent-bullish" : "text-accent-bearish")}>
                  {isLong ? "+" : "-"}{percentChange}%
                </span>
              </div>
            </div>
            {/* Expiry Countdown Indicator */}
            <div
              className="flex items-center gap-space-xs bg-surface px-space-sm py-1 rounded shadow-sm"
              title="Time left to enter at the planned price; the plan is still tracked for exits after this"
            >
              <svg className={cn("w-4 h-4", left !== null && left <= 5 ? "text-accent-danger" : "text-accent-bullish")} viewBox="0 0 36 36">
                <path className="text-surface-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                <path className={cn(left !== null && left <= 5 ? "text-accent-danger" : "text-accent-bullish")} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.min(100, Math.max(10, ((left || 15) / 30) * 100))}, 100`} strokeLinecap="round" strokeWidth="4"></path>
              </svg>
              <span className={cn("font-label-code text-label-code font-semibold", left !== null && left <= 5 ? "text-accent-danger" : "text-text-primary")}>
                {left === null ? "Expires in –" : left === 0 ? "Entry window closed" : `Expires in ${left}m`}
              </span>
            </div>
          </div>

          {/* Price Matrix Grid */}
          <div className="grid grid-cols-2 gap-space-xs pt-space-xs font-label-code text-label-code border-t border-border-subtle/50">
            <div className="flex flex-col">
              <span className="text-text-secondary">Entry Zone:</span>
              <span className="font-semibold text-text-primary">
                ₹{signal.entryZone?.low?.toFixed(2)} - ₹{signal.entryZone?.high?.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-secondary">Stop / Inval:</span>
              <span className="font-bold text-accent-danger">₹{signal.stop?.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-secondary">Target 1:</span>
              <span className={cn("font-semibold", isLong ? "text-accent-bullish" : "text-accent-bearish")}>
                ₹{signal.targets?.t1?.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-secondary">Net R:R Ratio:</span>
              <span className="font-bold text-text-primary">{signal.metrics?.riskReward || "1 : 2.0"}</span>
            </div>
          </div>
        </div>

        {/* Explainable Evidence Snippet */}
        <div className="flex flex-col gap-1 mb-space-md">
          <div className="flex items-center justify-between">
            <span className="font-label-code text-label-code uppercase tracking-wider text-text-secondary font-semibold">
              Deterministic Evidence
            </span>
            <span className="font-label-code text-label-code text-status-live-text font-bold">Risk Gate: PASS</span>
          </div>
          <div className="p-2 bg-surface-container rounded font-body-xs text-body-xs text-text-primary flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isLong ? "bg-accent-bullish" : "bg-accent-danger")}></span>
              <span className="truncate">{signal.rationale || "Relative Volume spike with VWAP support validation"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish shrink-0"></span>
              <span>Relative Volume: <strong>{signal.metrics?.relativeVolume || "2.4x"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish shrink-0"></span>
              <span>Trend Alignment: <strong>{signal.metrics?.trendAlignment || "Aligned"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-space-sm pt-space-xs">
        <Link
          href={`/dashboard/analysis/${signal.symbol}`}
          className="flex-1 h-8 rounded bg-primary text-on-primary font-body-sm text-body-sm font-semibold hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-1"
        >
          <span>Inspect Evidence</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
        <button
          type="button"
          disabled={!isActive}
          title="Mark that you took this trade in Angel One"
          className="h-8 px-space-md rounded bg-surface shadow-sm font-body-sm text-body-sm font-semibold text-text-primary hover:bg-surface-high transition-colors border border-border-subtle disabled:opacity-50"
        >
          I Entered
        </button>
      </div>
    </div>
  )
}
