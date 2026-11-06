"use client"
import * as React from "react"
import Link from "next/link"
import { type Trade } from "@/mock/trades"
import { cn } from "@/lib/utils"

export interface MobilePositionCardProps {
  trade: Trade
  currentLtp?: number
  isSelected?: boolean
  onSelectChange?: (tradeId: string, checked: boolean) => void
  onAuditClick?: (trade: Trade) => void
  onPartialExitClick?: (trade: Trade) => void
  onFullExitClick?: (trade: Trade) => void
  onAdjustSlClick?: (trade: Trade) => void
  isLocked?: boolean
}

export function MobilePositionCard({
  trade,
  currentLtp,
  isSelected = false,
  onSelectChange,
  onAuditClick,
  onPartialExitClick,
  onFullExitClick,
  onAdjustSlClick,
  isLocked = false,
}: MobilePositionCardProps) {
  const isLong = trade.direction === "LONG"
  const isOpen = trade.status === "OPEN"
  const ltp = currentLtp ?? trade.entryPrice * (isLong ? 1.008 : 0.992)

  const unrealizedPnl = (ltp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1)
  const unrealizedPct = ((ltp - trade.entryPrice) / trade.entryPrice) * 100 * (isLong ? 1 : -1)
  const displayPnl = isOpen ? unrealizedPnl : trade.netPnl ?? 0
  const isProfitable = displayPnl >= 0

  const hasPartialExit = trade.legs?.some(l => l.action === "PARTIAL_EXIT") ?? false
  const defaultStop = trade.entryPrice * (isLong ? 0.99 : 1.01)
  const trailingOrInitialStop = trade.stopLoss ?? (hasPartialExit ? trade.entryPrice : defaultStop)
  const target1Price = trade.target1 ?? trade.entryPrice * (isLong ? 1.015 : 0.985)

  return (
    <div
      data-testid={`mobile-position-card-${trade.symbol}`}
      className={cn(
        "bg-surface rounded-xl p-3 shadow-sm space-y-2 border border-border-subtle transition-all",
        isSelected && "ring-2 ring-accent-primary bg-primary-fixed/10",
        isLocked && "opacity-85 border-dashed border-border-strong"
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {isOpen && onSelectChange && (
            <input
              type="checkbox"
              aria-label={`Select trade ${trade.symbol}`}
              checked={isSelected}
              onChange={e => onSelectChange(trade.id, e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
                {trade.symbol}
              </span>
              <span
                className={cn(
                  "font-label-code text-label-code font-semibold px-1 rounded",
                  isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
                )}
              >
                {isLong ? "▲ LONG" : "▼ SHORT"}
              </span>
              <span className="font-label-code text-label-code text-text-secondary tabular-nums">
                Qty: {trade.quantity}
              </span>
            </div>
            <span className="font-label-code text-label-code text-text-secondary block mt-0.5 tabular-nums">
              Avg Fill: ₹{trade.entryPrice.toFixed(2)} • {isOpen ? "LTP" : "Exit"}:{" "}
              <strong className="text-text-primary">
                ₹{(isOpen ? ltp : trade.exitPrice ?? ltp).toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 tabular-nums">
          <span
            className={cn(
              "font-metric-md text-metric-md font-semibold block",
              isProfitable ? "text-accent-bullish" : "text-accent-danger"
            )}
          >
            {isProfitable ? "+" : "-"}₹{Math.abs(displayPnl).toFixed(2)}
          </span>
          {isOpen ? (
            <span
              className={cn(
                "font-label-code text-label-code",
                isProfitable ? "text-accent-bullish" : "text-accent-danger"
              )}
            >
              ({isProfitable ? "+" : ""}
              {unrealizedPct.toFixed(2)}%)
            </span>
          ) : (
            <span className="font-label-code text-label-code text-text-secondary">Settled</span>
          )}
        </div>
      </div>

      {/* Stop & Milestone Bar */}
      <div className="bg-surface-high p-2 rounded-lg flex items-center justify-between font-label-code text-label-code tabular-nums">
        <div>
          <span className="text-text-secondary block text-[10px]">
            {hasPartialExit ? "TRAILING STOP" : "INITIAL STOP"}
          </span>
          <span
            className={cn(
              "font-semibold font-metric-sm",
              hasPartialExit ? "text-accent-bullish" : "text-accent-danger"
            )}
          >
            ₹{trailingOrInitialStop.toFixed(2)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-text-secondary block text-[10px]">
            {hasPartialExit ? "MILESTONE" : "TARGET 1"}
          </span>
          {hasPartialExit ? (
            <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-1.5 py-0.5 rounded font-semibold">
              T1 Hit (Booked 50%)
            </span>
          ) : (
            <span className="text-text-primary font-semibold">
              ₹{target1Price.toFixed(2)} ({isOpen ? "Pending" : "Closed"})
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isOpen ? (
          <>
            {onPartialExitClick && hasPartialExit ? (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onPartialExitClick(trade)}
                className="flex-1 min-h-[36px] bg-surface-high hover:bg-surface-variant text-text-primary font-headline-sm text-headline-sm py-1 px-2 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                Partial Exit
              </button>
            ) : onAdjustSlClick ? (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onAdjustSlClick(trade)}
                className="flex-1 min-h-[36px] bg-surface-high hover:bg-surface-variant text-text-primary font-headline-sm text-headline-sm py-1 px-2 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                Adjust SL
              </button>
            ) : onPartialExitClick ? (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onPartialExitClick(trade)}
                className="flex-1 min-h-[36px] bg-surface-high hover:bg-surface-variant text-text-primary font-headline-sm text-headline-sm py-1 px-2 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                Partial Exit
              </button>
            ) : null}

            {onFullExitClick && (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onFullExitClick(trade)}
                className="flex-1 min-h-[36px] bg-status-disconnected-bg text-status-disconnected-text font-headline-sm text-headline-sm py-1 px-2 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                Full Exit
              </button>
            )}

            {onAuditClick && (
              <button
                type="button"
                onClick={() => onAuditClick(trade)}
                className="min-h-[36px] px-3 bg-surface border border-border-subtle hover:bg-surface-high text-text-primary font-label-code text-label-code font-bold rounded transition-colors"
              >
                Audit
              </button>
            )}

            {!onFullExitClick && !onPartialExitClick && (
              <Link
                href={`/dashboard/trades/${trade.id}`}
                className="flex-1 min-h-[36px] flex items-center justify-center bg-accent-primary text-on-primary font-headline-sm text-headline-sm py-1 px-3 rounded shadow-xs"
              >
                Manage
              </Link>
            )}
          </>
        ) : (
          onAuditClick && (
            <button
              type="button"
              onClick={() => onAuditClick(trade)}
              className="w-full min-h-[36px] bg-surface-high hover:bg-surface-container text-text-primary font-headline-sm text-headline-sm py-1 px-3 rounded border border-border-subtle transition-colors"
            >
              Inspect Audit Trail
            </button>
          )
        )}
      </div>
    </div>
  )
}
