import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { type ApproachingSetup, formatVolume, strategyLabel } from "@/lib/scanner-types"

/** Lightweight review card for a stock within 1% of a strategy trigger (spec 0009 AC-2). */
export function ApproachingCard({ setup }: { setup: ApproachingSetup }) {
  const up = setup.dayChangePct >= 0

  return (
    <Link
      href={`/dashboard/analysis/${encodeURIComponent(setup.symbol)}`}
      data-testid="approaching-card"
      className="group bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm border border-dashed border-outline-variant hover:border-primary hover:bg-surface-container transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">Approaching</span>
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{setup.symbol}</span>
        </div>
        <div className="text-right">
          <span className="font-label-numeric-md text-label-numeric-md font-bold text-on-surface block">₹{setup.price.toFixed(2)}</span>
          <span className={cn("font-label-numeric-sm text-label-numeric-sm font-semibold", up ? "text-secondary" : "text-tertiary-container")}>
            {up ? "+" : ""}{setup.dayChangePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
        <span>Vol {formatVolume(setup.volume)}</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span>RVol {setup.relativeVolume.toFixed(2)}x</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span>Score {setup.momentumScore.toFixed(2)}</span>
      </div>

      <ul className="flex flex-col gap-2 bg-surface-container-lowest rounded-lg p-space-sm shadow-xs">
        {setup.strategies.map(s => (
          <li key={s.setupFamily} className="flex flex-col gap-1" title={s.condition}>
            <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm">
              <span className="text-on-surface font-semibold">{strategyLabel(s.setupFamily)}</span>
              <span className="text-on-surface-variant">
                {s.distancePct.toFixed(2)}% to ₹{s.triggerLevel.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden" aria-label={`${s.proximity}% of the way to trigger`}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${s.proximity}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Link>
  )
}
