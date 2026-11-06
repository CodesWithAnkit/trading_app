"use client"
import * as React from "react"
import { useTrades } from "@/lib/contexts/TradeContext"

export interface CapitalGuardProps {
  realizedPnl?: number
  realizedTradesCount?: number
  unrealizedPnl?: number
  openPositionsCount?: number
  maxDailyLoss?: number
  lossDrawn?: number
  executionsUsed?: number
  maxDailyExecutions?: number
}

export function RiskCapitalGuard({
  realizedPnl,
  realizedTradesCount,
  unrealizedPnl,
  openPositionsCount,
  maxDailyLoss = 6000,
  lossDrawn = 0,
  executionsUsed,
  maxDailyExecutions = 6
}: CapitalGuardProps) {
  const { openTrades, trades } = useTrades()

  const finalOpenCount = openPositionsCount ?? openTrades.length
  const finalClosedCount = realizedTradesCount ?? trades.filter(t => t.status === "CLOSED").length

  // Calculate default values from TradeContext if not explicitly provided
  const computedRealized = realizedPnl ?? trades
    .filter(t => t.status === "CLOSED")
    .reduce((sum, t) => sum + (t.netPnl ?? 0), 3180)

  const computedUnrealized = unrealizedPnl ?? 840
  const finalExecutionsUsed = executionsUsed ?? (finalOpenCount + finalClosedCount > 0 ? finalOpenCount + finalClosedCount : 3)
  const quotaPct = Math.min(100, Math.round((finalExecutionsUsed / maxDailyExecutions) * 100))

  const isRealizedPositive = computedRealized >= 0
  const isUnrealizedPositive = computedUnrealized >= 0

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-space-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-accent-primary text-[20px]" aria-hidden="true">
            security
          </span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
            Daily Risk &amp; Capital Guard
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
          LIMIT HEALTHY
        </span>
      </div>

      {/* Metrics Grid: 2 columns on mobile (Realized + Unrealized), 3 columns on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-space-sm py-space-sm my-space-xs">
        <div className="flex flex-col bg-surface-high sm:bg-surface-container-low p-2.5 rounded-lg">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Realized P&amp;L
          </span>
          <span className={`font-metric-lg sm:font-metric-md text-metric-lg sm:text-metric-md font-bold tabular-nums ${isRealizedPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isRealizedPositive ? "+" : "-"}₹{Math.abs(computedRealized).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-label-code sm:font-body-xs text-label-code sm:text-body-xs text-text-secondary">
            Booked ({finalClosedCount} trades)
          </span>
        </div>

        <div className="flex flex-col bg-surface-high sm:bg-surface-container-low p-2.5 rounded-lg">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Unrealized P&amp;L
          </span>
          <span className={`font-metric-lg sm:font-metric-md text-metric-lg sm:text-metric-md font-bold tabular-nums ${isUnrealizedPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isUnrealizedPositive ? "+" : "-"}₹{Math.abs(computedUnrealized).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-label-code sm:font-body-xs text-label-code sm:text-body-xs text-text-secondary">
            {finalOpenCount} Live positions
          </span>
        </div>

        <div className="hidden sm:flex flex-col bg-surface-container-low p-2.5 rounded-lg">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Max Daily Loss
          </span>
          <span className="font-metric-md text-metric-md text-text-primary font-bold tabular-nums">
            ₹{maxDailyLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-body-xs text-body-xs text-accent-bullish tabular-nums">
            ₹{lossDrawn.toFixed(2)} drawn
          </span>
        </div>
      </div>

      {/* Execution Quota & Max Daily Loss Limit Tracker */}
      <div className="bg-canvas sm:bg-transparent p-2 sm:p-0 rounded-lg flex flex-col gap-1.5 pt-space-xs font-label-code text-label-code">
        <div className="flex sm:hidden justify-between items-center text-text-secondary">
          <span>Max Daily Loss Limit:</span>
          <span className="text-text-primary font-metric-sm font-semibold tabular-nums">
            ₹{maxDailyLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
            <span className="text-accent-bullish font-normal">(₹{lossDrawn.toFixed(2)} Drawn)</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Daily Execution Quota:</span>
          <span className="font-semibold text-text-primary font-metric-sm tabular-nums">
            {finalExecutionsUsed} of {maxDailyExecutions} Used
          </span>
        </div>
        <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden flex">
          <div
            className="bg-accent-primary h-full transition-all duration-300"
            style={{ width: `${quotaPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
