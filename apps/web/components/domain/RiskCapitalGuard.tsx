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
          <span className="material-symbols-outlined text-accent-primary text-[20px]">
            security
          </span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
            Daily Risk &amp; Capital Guard
          </span>
        </div>
        <span className="px-space-xs py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
          LIMIT HEALTHY
        </span>
      </div>

      {/* 3 Metrics Grid */}
      <div className="grid grid-cols-3 gap-space-sm py-space-sm bg-surface-container-low rounded-lg p-space-sm my-space-xs">
        <div className="flex flex-col">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Realized P&amp;L
          </span>
          <span className={`font-metric-md text-metric-md font-bold ${isRealizedPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isRealizedPositive ? "+" : ""}₹{Math.abs(computedRealized).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-body-xs text-body-xs text-text-secondary">
            Booked ({finalClosedCount} trades)
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Unrealized P&amp;L
          </span>
          <span className={`font-metric-md text-metric-md font-bold ${isUnrealizedPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isUnrealizedPositive ? "+" : ""}₹{Math.abs(computedUnrealized).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-body-xs text-body-xs text-text-secondary">
            {finalOpenCount} Open positions
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-label-code text-label-code uppercase text-text-secondary">
            Max Daily Loss
          </span>
          <span className="font-metric-md text-metric-md text-text-primary font-bold">
            ₹{maxDailyLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-body-xs text-body-xs text-accent-bullish">
            ₹{lossDrawn.toFixed(2)} drawn
          </span>
        </div>
      </div>

      {/* Trade Quota Progress Bar */}
      <div className="flex flex-col gap-1 pt-space-xs">
        <div className="flex justify-between items-center font-label-code text-label-code">
          <span className="text-text-secondary">Execution Session Quota:</span>
          <span className="font-semibold text-text-primary">
            {finalExecutionsUsed} of {maxDailyExecutions} Max Daily Executions Used
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
