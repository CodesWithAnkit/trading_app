"use client"
import * as React from "react"

import { cn } from "@/lib/utils"
import type { RiskVerdict as Verdict } from "@/lib/risk/types"
import { formatInr, noteLabel, skipHint, skipLabel } from "@/lib/risk/labels"

export type RiskVerdictProps = {
  /** The verdict from the API; null or undefined while it loads. */
  verdict: Verdict | null | undefined
  /** Compact single line for dense rows (Scanner); full box for cards. */
  compact?: boolean
  className?: string
}

/**
 * spec 0028 AC-6: "Take N shares · risk ₹X · notional ₹Y" (with any cap or reduce note), or
 * "Skip: reason". Signals are never hidden, so a skip still shows the card around it.
 */
export function RiskVerdict({ verdict, compact = false, className }: RiskVerdictProps) {
  if (!verdict) {
    return (
      <div className={cn("text-body-xs text-text-secondary", className)} aria-live="polite">
        Sizing…
      </div>
    )
  }

  if (verdict.verdict === "TAKE") {
    const notes = verdict.notes.map(noteLabel)
    if (compact) {
      return (
        <div className={cn("text-body-xs font-semibold text-accent-primary", className)}>
          Take {verdict.qty} · risk {formatInr(verdict.riskInr)}
          {notes.length > 0 && <span className="font-normal text-text-secondary"> · {notes.join(", ")}</span>}
        </div>
      )
    }
    return (
      <div className={cn("rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-2.5 flex flex-col gap-1", className)}>
        <span className="text-body-sm font-bold text-accent-primary">Take {verdict.qty} shares</span>
        <span className="font-label-code text-label-code text-text-secondary tabular-nums">
          risk {formatInr(verdict.riskInr)} · notional {formatInr(verdict.notionalInr)}
        </span>
        {notes.length > 0 && (
          <span className="self-start rounded-full border border-accent-primary/30 bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-primary">
            {notes.join(" · ")}
          </span>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn("text-body-xs font-semibold text-accent-bearish", className)} title={skipHint(verdict.skipReason)}>
        Skip: {skipLabel(verdict.skipReason)}
      </div>
    )
  }
  return (
    <div className={cn("rounded-lg border border-accent-bearish/30 bg-accent-bearish/5 p-2.5 flex flex-col gap-0.5", className)}>
      <span className="text-body-sm font-bold text-accent-bearish">Skip: {skipLabel(verdict.skipReason)}</span>
      <span className="text-body-xs text-text-secondary">{skipHint(verdict.skipReason)}</span>
    </div>
  )
}
