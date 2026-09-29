import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Signal } from "@/mock/signals"
import { strategyLabel } from "@/lib/scanner-types"

const REASON: Record<string, { label: string; style: string }> = {
  TARGET: { label: "Target hit", style: "bg-secondary-container text-on-secondary-container" },
  STOP: { label: "Stop hit", style: "bg-error-container text-error" },
  TIME: { label: "Time exit", style: "bg-surface-container-highest text-on-surface-variant" },
}

const istTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }) : "–"

/** Plans closed today, with how and where they exited (spec 0010 AC-6). */
export function ClosedPlans({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null
  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/40" data-testid="closed-plans">
      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Closed today ({signals.length})</h3>
      <ul className="flex flex-col divide-y divide-outline-variant/40">
        {signals.map(s => {
          const reason = REASON[s.exitReason ?? ""] ?? REASON.TIME
          const pnl = s.exitPrice != null && s.referenceEntry ? ((s.exitPrice - s.referenceEntry) / s.referenceEntry) * 100 : null
          return (
            <li key={s.id}>
              <Link
                href={`/dashboard/analysis/${encodeURIComponent(s.symbol)}`}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[8rem_1fr_auto_auto] items-center gap-3 py-2.5 px-1 hover:bg-surface-container rounded-md transition-colors"
              >
                <span className="font-bold text-on-surface">{s.symbol}</span>
                <span className="hidden sm:block text-sm text-on-surface-variant truncate">
                  {strategyLabel(s.setup)} · entry ₹{s.referenceEntry.toFixed(2)} → ₹{s.exitPrice?.toFixed(2) ?? "–"} at {istTime(s.exitAt)}
                </span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", reason.style)}>{reason.label}</span>
                {pnl !== null && (
                  <span className={cn("font-label-numeric-sm text-label-numeric-sm font-bold text-right min-w-[4.5rem]", pnl > 0 ? "text-secondary" : pnl < 0 ? "text-error" : "text-on-surface")}>
                    {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}%
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
