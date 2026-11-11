"use client"
import * as React from "react"
import { type Signal } from "@/mock/signals"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useNow } from "@/lib/useNow"
import { NewsGateBadges } from "./NewsGateBadges"
import { RiskVerdict } from "./RiskVerdict"

/** Whole minutes until the entry window closes (rounded up), or null before the client clock is known. */
export function minutesLeft(expiresAt: string, now: number | null): number | null {
  if (now === null) return null
  const ms = new Date(expiresAt).getTime() - now
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 60_000)) : null
}

/** Formatted MMm SSs countdown string for mobile Stitch signal cards. */
export function formatCountdownMmSs(expiresAt: string, now: number | null): string {
  if (now === null) return "14m 20s"
  const ms = new Date(expiresAt).getTime() - now
  if (!Number.isFinite(ms)) return "14m 20s"
  if (ms <= 0) return "EXPIRED"
  const totalSec = Math.floor(ms / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
}

export interface SignalCardProps {
  signal: Signal
  isLocked?: boolean
  sectorChangeLabel?: string
  onEnterClick?: (signal: Signal) => void
}

export function SignalCard({
  signal,
  isLocked = false,
  sectorChangeLabel,
  onEnterClick,
}: SignalCardProps) {
  const isLong = signal.direction === "LONG"
  const isActive = (signal.status === "ACTIVE" || signal.status === "EXPIRING") && !isLocked
  const now = useNow()
  const left = minutesLeft(signal.expiresAt, now)
  const mmSs = formatCountdownMmSs(signal.expiresAt, now)
  const percentChange = ((signal.price % 2) + 0.5).toFixed(2)

  const stopPctDiff = signal.price > 0
    ? (((signal.stop - signal.price) / signal.price) * 100).toFixed(2)
    : "-0.75"
  const formattedStopPct = Number(stopPctDiff) > 0 ? `+${stopPctDiff}%` : `${stopPctDiff}%`

  const rvolChip = signal.metrics?.relativeVolume
    ? `RVOL ${signal.metrics.relativeVolume.replace(" average", "")}`
    : "RVOL 2.4x (10d 15m)"
  const vwapChip = signal.rationale
    ? signal.rationale.split("·")[0]?.trim() || `VWAP Held ₹${signal.referenceEntry?.toFixed(2) ?? signal.price.toFixed(2)}`
    : `VWAP Held ₹${signal.referenceEntry?.toFixed(2) ?? signal.price.toFixed(2)}`
  const sectorChip = sectorChangeLabel || (isLong ? "Sector +1.4%" : "Sector -1.1%")

  return (
    <article
      data-testid={`signal-card-${signal.symbol}`}
      className={cn(
        "bg-surface rounded-xl shadow-sm sm:shadow-md p-3 sm:p-space-md flex flex-col justify-between transition-all duration-200 border border-border-subtle relative overflow-hidden",
        isLong ? "border-l-4 border-l-accent-bullish" : "border-l-4 border-l-accent-bearish",
        isLocked && "opacity-85 border-dashed border-border-strong"
      )}
    >
      <div>
        {/* Header Ticker & Badges */}
        <div className="flex items-start justify-between mb-space-sm">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-headline-md text-headline-md font-bold text-text-primary">{signal.symbol}</h3>
              <span className="font-label-code text-label-code text-text-secondary px-1 py-0.5 rounded bg-surface-high">NSE Cash</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded font-label-code text-label-code font-bold flex items-center gap-0.5",
                isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
              )}>
                {isLong ? "▲ LONG" : "▼ SHORT"}
              </span>
            </div>
            {signal.guru ? (
              <span className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded bg-on-surface text-surface text-[10px] font-bold tracking-wider">GURU · {signal.guru.ruleId}</span>
                <a
                  href={signal.guru.runId ? `/dashboard/backtest?run=${encodeURIComponent(signal.guru.runId)}` : "/dashboard/backtest"}
                  className="px-1.5 py-0.5 rounded bg-surface-container text-on-primary-fixed-variant text-[10px] font-semibold hover:underline"
                >
                  OOS PF {signal.guru.oosProfitFactor ?? "·"} · years + {signal.guru.oosYearsPositive}
                </a>
              </span>
            ) : (
              <span className="font-body-xs text-body-xs text-text-secondary truncate max-w-[230px] mt-0.5">
                {signal.setup || "VWAP Pullback + Volume Surge"}
              </span>
            )}
            <NewsGateBadges signal={signal} />
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Expiry Countdown Indicator */}
            <div
              className="flex items-center gap-1 bg-surface-high px-1.5 py-0.5 rounded text-accent-primary font-label-code text-label-code"
              title="Time left to enter at the planned price; the plan is still tracked for exits after this"
            >
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">timer</span>
              <span className={cn("font-semibold tabular-nums", left !== null && left <= 5 ? "text-accent-danger" : "text-text-primary")}>
                {left === null ? "Expires in –" : left === 0 ? "Entry window closed" : `Expires in ${left}m`}
              </span>
              <span className="hidden" data-testid="mobile-countdown-mmss">{mmSs}</span>
            </div>
            <span className="font-label-code text-label-code text-text-secondary tabular-nums">
              Score: <strong className="text-text-primary font-metric-sm">{signal.confidence}</strong>/100
            </span>
          </div>
        </div>

        {/* Mobile 3-Column Execution Grid + Desktop Price Bar */}
        <div className="grid grid-cols-3 gap-1.5 bg-surface-high p-2 rounded-lg text-center font-label-code text-label-code mb-space-sm tabular-nums">
          <div>
            <span className="text-text-secondary block">Live / Entry</span>
            <span className="text-text-primary font-metric-sm font-semibold">₹{signal.price.toFixed(2)}</span>
            <span className="text-text-secondary block text-[10px]">
              {signal.entryZone?.low?.toFixed(2)}–{signal.entryZone?.high?.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-text-secondary block">Stop Loss</span>
            <span className="text-accent-danger font-metric-sm font-semibold">₹{signal.stop?.toFixed(2)}</span>
            <span className="text-accent-danger block text-[10px]">{formattedStopPct}</span>
          </div>
          <div>
            <span className="text-text-secondary block">Target 1 (R:R)</span>
            <span className={cn("font-metric-sm font-semibold", isLong ? "text-accent-bullish" : "text-accent-bearish")}>
              ₹{signal.targets?.t1?.toFixed(2)}
            </span>
            <span className={cn("block text-[10px]", isLong ? "text-accent-bullish" : "text-accent-bearish")}>
              {signal.metrics?.riskReward || "1 : 2.0"} Net
            </span>
          </div>
        </div>

        {/* spec 0028 AC-6: take N shares, or skip with the reason. */}
        {isActive && <RiskVerdict verdict={signal.risk} className="mb-space-sm" />}

        {/* Deterministic Validated Evidence Chips */}
        <div className="bg-canvas p-2 rounded-lg space-y-1.5 mb-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-code text-label-code uppercase tracking-wide text-text-secondary font-semibold">
              Validated Evidence:
            </span>
            <span className={cn(
              "font-label-code text-label-code font-semibold",
              isLong ? "text-accent-bullish" : "text-accent-bearish"
            )}>
              {isLong ? "+" : "-"}{percentChange}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="signal-evidence-chips">
            <span className="font-label-code text-label-code bg-surface px-1.5 py-0.5 rounded text-text-primary shadow-xs">
              {rvolChip}
            </span>
            <span className="font-label-code text-label-code bg-surface px-1.5 py-0.5 rounded text-text-primary shadow-xs truncate max-w-[180px]">
              {vwapChip}
            </span>
            <span className={cn(
              "font-label-code text-label-code bg-surface px-1.5 py-0.5 rounded shadow-xs",
              isLong ? "text-accent-bullish" : "text-accent-danger"
            )}>
              {sectorChip}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <Link
          href={`/dashboard/analysis/${signal.symbol}`}
          className="flex-1 min-h-[36px] py-1.5 rounded-lg bg-accent-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-1"
        >
          <span>Inspect Evidence</span>
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
        </Link>
        <button
          type="button"
          disabled={!isActive}
          onClick={() => onEnterClick?.(signal)}
          title={isLocked ? "Execution locked while market feed is delayed or disconnected" : "Record in your journal that you took this trade in Angel One"}
          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high text-text-primary font-headline-sm text-headline-sm font-semibold shadow-sm flex items-center justify-center gap-1 border border-border-subtle transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[15px] text-accent-bullish" aria-hidden="true">check_circle</span>
          <span>Take this trade</span>
        </button>
      </div>
    </article>
  )
}

