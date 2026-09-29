import * as React from "react"
import { type Signal } from "@/mock/signals"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.direction === "LONG"
  const isShort = signal.direction === "SHORT"
  const isActive = signal.status === "ACTIVE" || signal.status === "EXPIRING"

  const percentChange = ((signal.price % 2) + 0.5).toFixed(2)

  return (
    <div className={cn(
      "signal-card bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between gap-space-md hover:bg-surface-container transition-all",
      isLong ? "long-card" : "short-card"
    )}>
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full font-label-caps text-label-caps font-bold uppercase tracking-wider flex items-center gap-0.5",
              isLong ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            )}>
              {isLong ? "↑ Long" : "↓ Short"}
            </span>
            <span className="font-label-caps text-label-caps px-1.5 py-0.5 bg-surface-container-highest rounded text-on-surface-variant">
              NSE Cash
            </span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-numeric-sm text-label-numeric-sm bg-surface-container-lowest px-2 py-0.5 rounded shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-tertiary">timer</span>
            <span>Expires in 18m</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{signal.symbol}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block">{signal.symbol} Ltd.</span>
          </div>
          <div className="text-right">
            <span className="font-label-numeric-md text-label-numeric-md font-bold text-on-surface">₹{signal.price.toFixed(2)}</span>
            <span className={cn(
              "font-label-numeric-sm text-label-numeric-sm block font-semibold",
              isLong ? "text-secondary" : "text-tertiary-container"
            )}>
              {isLong ? "+" : "-"}{percentChange}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-on-surface font-label-caps text-label-caps font-semibold shadow-xs flex items-center gap-1">
            <span className={cn("material-symbols-outlined text-[14px]", isLong ? "text-secondary" : "text-tertiary")}>verified</span> 
            Confidence: {signal.confidence}
          </span>
          <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
            R:R {signal.metrics?.riskReward || "1:2.0"}
          </span>
        </div>

        {/* Tabular Numerical Setup Parameters */}
        <div className="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm">
            <span className="text-on-surface-variant">Planned Entry</span>
            <span className="text-on-surface font-semibold">₹{signal.entryZone?.low?.toFixed(2)} – ₹{signal.entryZone?.high?.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 font-label-numeric-sm text-label-numeric-sm border-t border-outline-variant/30 pt-1">
            <div className="flex items-center gap-1">
              <span className="text-on-surface-variant">Stop-Loss:</span>
              <span className="px-1.5 py-0.2 rounded bg-error-container text-error font-semibold">
                ₹{signal.stop?.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-on-surface-variant">Target:</span>
              <span className={cn("font-semibold", isLong ? "text-secondary" : "text-tertiary-container")}>
                ₹{signal.targets?.t1?.toFixed(2)} {signal.targets?.t2 ? `/ ₹${signal.targets.t2.toFixed(2)}` : ''}
              </span>
            </div>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
          {signal.rationale}
        </p>
      </div>

      {/* Card Actions */}
      <div className="flex flex-col gap-1 pt-space-xs">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/analysis/${signal.symbol}`} className="flex-1 h-11 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors flex items-center justify-center gap-1 shadow-xs">
            <span className="material-symbols-outlined text-[18px]">visibility</span>View plan
          </Link>
          <button 
            type="button" 
            disabled={!isActive}
            className="flex-1 h-11 px-space-md rounded-lg enabled:bg-primary-container enabled:hover:bg-primary disabled:bg-surface-container-highest enabled:text-on-primary disabled:text-on-surface-variant font-body-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>I entered
          </button>
        </div>
        <span className="text-[10px] font-body-sm text-center text-on-surface-variant/80">
          Records your journal only · No broker order is placed
        </span>
      </div>
    </div>
  )
}
