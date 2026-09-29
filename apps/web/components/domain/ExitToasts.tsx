"use client"
import * as React from "react"
import { X, Target, ShieldAlert, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSignals } from "@/lib/contexts/SignalContext"
import type { SignalExit } from "@/mock/signals"

const AUTO_DISMISS_MS = 12_000

const COPY: Record<SignalExit["reason"], { label: string; icon: React.ElementType }> = {
  TARGET: { label: "target hit", icon: Target },
  STOP: { label: "stop hit", icon: ShieldAlert },
  TIME: { label: "time exit (15:15)", icon: Clock },
}

/** "Exit now" alerts for live plans (spec 0010 AC-6). */
export function ExitToasts() {
  const { exitAlerts, dismissExitAlert } = useSignals()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]" role="region" aria-label="Exit alerts">
      {exitAlerts.map(alert => (
        <ExitToast key={alert.id} alert={alert} onDismiss={() => dismissExitAlert(alert.id)} />
      ))}
    </div>
  )
}

function ExitToast({ alert, onDismiss }: { alert: SignalExit; onDismiss: () => void }) {
  // Keyed to the alert, not the callback, so live stream re-renders don't restart the timer.
  const dismiss = React.useRef(onDismiss)
  React.useEffect(() => {
    dismiss.current = onDismiss
  })
  React.useEffect(() => {
    const id = setTimeout(() => dismiss.current(), AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [alert.id])

  const { label, icon: Icon } = COPY[alert.reason]
  const good = alert.pnlPct > 0
  return (
    <div
      role="status"
      data-testid="exit-toast"
      className={cn(
        "flex items-start gap-3 rounded-xl p-4 shadow-lg border bg-surface-container-lowest",
        alert.reason === "TARGET" ? "border-secondary" : alert.reason === "STOP" ? "border-error" : "border-outline-variant"
      )}
    >
      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", alert.reason === "TARGET" ? "text-secondary" : alert.reason === "STOP" ? "text-error" : "text-on-surface-variant")} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface">
          Exit {alert.symbol}: {label}
        </p>
        <p className="text-sm text-on-surface-variant">
          at ₹{alert.exitPrice.toFixed(2)},{" "}
          <span className={cn("font-semibold", good ? "text-secondary" : alert.pnlPct < 0 ? "text-error" : "text-on-surface")}>
            {good ? "+" : ""}{alert.pnlPct.toFixed(2)}%
          </span>
          {alert.stale && <span className="ml-1 text-xs">(last known price)</span>}
        </p>
      </div>
      <button onClick={onDismiss} className="p-1 rounded hover:bg-surface-container text-on-surface-variant" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
