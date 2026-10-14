import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { type MomentumStock, formatVolume } from "@/lib/scanner-types"

const TREND_LABEL: Record<MomentumStock["trend"], string> = { UP: "5m ↑", DOWN: "5m ↓", UNKNOWN: "5m –" }

/** Watched stocks ranked by % change × relative volume × trend alignment (spec 0009 AC-1). */
export function MomentumLeaders({ stocks, limit = 10 }: { stocks: MomentumStock[]; limit?: number }) {
  const top = stocks.slice(0, limit)
  const maxScore = Math.max(...top.map(s => Math.abs(s.momentumScore)), 0.01)

  return (
    <ol className="flex flex-col divide-y divide-outline-variant/40" data-testid="momentum-leaders">
      {top.map((stock, i) => {
        const up = stock.dayChangePct >= 0
        return (
          <li key={stock.symbol}>
            <Link
              href={`/dashboard/markets/${encodeURIComponent(stock.symbol)}`}
              className="grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[1.5rem_8rem_1fr_auto] items-center gap-3 py-2.5 px-1 hover:bg-surface-container rounded-md transition-colors"
            >
              <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">{i + 1}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-on-surface truncate">{stock.symbol}</span>
                <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                  {formatVolume(stock.volume)} · {stock.relativeVolume.toFixed(1)}x · {TREND_LABEL[stock.trend]}
                </span>
              </div>
              <div className="hidden sm:block h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className={cn("h-full rounded-full", stock.momentumScore >= 0 ? "bg-secondary" : "bg-tertiary-container")}
                  style={{ width: `${(Math.abs(stock.momentumScore) / maxScore) * 100}%` }}
                />
              </div>
              <div className="text-right font-label-numeric-sm text-label-numeric-sm">
                <span className="block font-bold text-on-surface">₹{stock.ltp.toFixed(2)}</span>
                {stock.ranked ? (
                  <span className={cn("font-semibold", up ? "text-secondary" : "text-tertiary-container")}>
                    {up ? "+" : ""}{stock.dayChangePct.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-on-surface-variant" title="Waiting for the previous close from the feed">unranked</span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
