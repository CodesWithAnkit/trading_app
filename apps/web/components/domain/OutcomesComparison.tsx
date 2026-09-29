"use client"
import * as React from "react"
import { Trophy, Hourglass } from "lucide-react"
import { cn } from "@/lib/utils"
import { type OutcomesPayload, type SignalOutcome, strategyLabel } from "@/lib/scanner-types"

const STATUS_STYLE: Record<string, string> = {
  WON: "bg-secondary-container text-on-secondary-container",
  LOST: "bg-error-container text-error",
  NEUTRAL: "bg-surface-container-highest text-on-surface-variant",
}

/** After-hours "we said X, it went to Y" view with a win summary (spec 0009 AC-9, AC-10). */
export function OutcomesComparison() {
  const [payload, setPayload] = React.useState<OutcomesPayload | null>(null)
  const [state, setState] = React.useState<"loading" | "ready" | "empty" | "error">("loading")

  React.useEffect(() => {
    fetch("/api/v1/scanner/outcomes")
      .then(async res => {
        if (res.status === 404) return setState("empty")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setPayload(await res.json())
        setState("ready")
      })
      .catch(err => {
        console.error("Failed to load outcomes", err)
        setState("error")
      })
  }, [])

  return (
    <section className="flex flex-col gap-4 bg-surface-container-low p-6 rounded-xl border border-outline-variant/40 shadow-sm" data-testid="outcomes-comparison">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-primary w-6 h-6" />
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Today&apos;s Calls vs Reality</h2>
        </div>
        {payload && <SummaryBadge summary={payload.summary} />}
      </div>

      {state === "loading" && <p className="text-sm text-on-surface-variant py-6 text-center">Loading today&apos;s outcomes…</p>}
      {state === "empty" && <p className="text-sm text-on-surface-variant py-6 text-center">No signals fired today, so there is nothing to compare.</p>}
      {state === "error" && <p className="text-sm text-error py-6 text-center">Could not load outcomes. Check that the scanner API is running.</p>}
      {state === "ready" && payload && (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {payload.data.map(o => <OutcomeRow key={o.id} outcome={o} />)}
        </ul>
      )}
    </section>
  )
}

function SummaryBadge({ summary }: { summary: OutcomesPayload["summary"] }) {
  return (
    <span data-testid="outcomes-summary" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-on-primary text-sm font-bold">
      {summary.total} signal{summary.total === 1 ? "" : "s"} fired today, {summary.winners} {summary.winners === 1 ? "was a winner" : "were winners"}
      {summary.pending > 0 && <span className="font-medium opacity-80">· {summary.pending} awaiting reconciliation</span>}
    </span>
  )
}

function OutcomeRow({ outcome: o }: { outcome: SignalOutcome }) {
  const isLong = o.direction === "LONG"
  const wentTo = isLong ? o.actualHigh : o.actualLow
  const pnl = o.outcomePnlPct

  return (
    <li className="flex flex-col gap-2 bg-surface-container-lowest rounded-lg p-space-md shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-on-surface">{o.symbol}</span>
          <span className={cn("px-1.5 py-0.5 rounded font-label-caps text-label-caps font-bold uppercase", isLong ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-fixed text-on-tertiary-fixed-variant")}>
            {isLong ? "↑ Long" : "↓ Short"}
          </span>
          <span className="text-xs text-on-surface-variant truncate">{strategyLabel(o.setup)}</span>
        </div>
        {o.outcomeStatus ? (
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold uppercase", STATUS_STYLE[o.outcomeStatus])}>{o.outcomeStatus}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant"><Hourglass className="w-3 h-3" /> Pending</span>
        )}
      </div>
      <p className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
        We said entry at <span className="text-on-surface font-semibold">₹{o.referenceEntry.toFixed(2)}</span>
        {" "}(target ₹{o.targets.t1?.toFixed(2)}, stop ₹{o.stop.toFixed(2)})
        {wentTo !== null && <>, it went to <span className="text-on-surface font-semibold">₹{wentTo.toFixed(2)}</span></>}
        {o.actualClose !== null && <> and closed at ₹{o.actualClose.toFixed(2)}</>}
        {pnl !== null && (
          <>, result{" "}
            <span className={cn("font-bold", pnl > 0 ? "text-secondary" : pnl < 0 ? "text-error" : "text-on-surface")}>
              {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}%
            </span>
          </>
        )}
        .
      </p>
    </li>
  )
}
