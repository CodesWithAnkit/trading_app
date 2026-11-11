"use client"
import * as React from "react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTrades, type CloseResult } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { formatInr } from "@/lib/risk/labels"
import { cn } from "@/lib/utils"
import type { Trade } from "@/mock/trades"

export type CloseTradeDialogProps = {
  /** The open journal entry to close; null keeps the dialog closed. */
  trade: Trade | null
  onClose: () => void
}

const RESULTS: { value: CloseResult; label: string }[] = [
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "CANCELLED", label: "Cancelled" },
]

/**
 * spec 0028 AC-9: closes a journal entry once. Won and Lost need your real exit price
 * (prefilled with the target or stop); the server computes the P&L. Cancelled is ₹0.
 */
export function CloseTradeDialog({ trade, onClose }: CloseTradeDialogProps) {
  const { closeEntry } = useTrades()
  const { refreshRisk } = useSignals()
  const [result, setResult] = React.useState<CloseResult>("WON")
  const [exit, setExit] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!trade) return
    setResult("WON")
    setExit(trade.target1 !== undefined ? trade.target1.toFixed(2) : "")
    setError(null)
  }, [trade])

  if (!trade) return null

  const pick = (r: CloseResult) => {
    setResult(r)
    if (r === "WON" && trade.target1 !== undefined) setExit(trade.target1.toFixed(2))
    if (r === "LOST" && trade.stopLoss !== undefined) setExit(trade.stopLoss.toFixed(2))
  }

  const needsExit = result !== "CANCELLED"
  const exitNum = Number(exit)
  const exitOk = !needsExit || exitNum > 0
  const blocked = needsExit && (!trade.quantity || trade.flags?.includes("CHECK_DIRECTION"))
  const preview = !needsExit
    ? 0
    : exitOk && trade.quantity
      ? (trade.direction === "SHORT" ? trade.entryPrice - exitNum : exitNum - trade.entryPrice) * trade.quantity
      : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!trade || !exitOk || blocked) return
    setSaving(true)
    setError(null)
    try {
      await closeEntry(trade.id, result, needsExit ? exitNum : undefined)
      refreshRisk()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't close the trade.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-surface border-border-subtle text-text-primary">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Close {trade.symbol}</DialogTitle>
            <DialogDescription className="font-label-code text-text-secondary">
              {trade.direction === "SHORT" ? "Short" : "Long"} · {trade.quantity || "no quantity"} @ {trade.entryPrice.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label="Result" className="flex gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={result === r.value}
                onClick={() => pick(r.value)}
                className={cn(
                  "flex-1 min-h-11 rounded-lg border text-body-sm",
                  result === r.value ? "border-accent-primary bg-accent-primary/5 font-semibold text-accent-primary" : "border-border-strong"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {needsExit && (
            <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
              Exit price (required)
              <input
                inputMode="decimal"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                aria-invalid={!exitOk}
                className="h-11 rounded-lg border border-border-strong bg-surface px-3 font-label-code text-text-primary"
              />
              <span className="font-normal text-body-xs text-text-secondary">Use your real fill from Angel One.</span>
            </label>
          )}

          {blocked && (
            <p role="note" className="text-body-xs text-accent-danger">
              This older entry has no quantity or no clear direction, so its P&amp;L can&apos;t be worked out. You can still mark it Cancelled.
            </p>
          )}

          <div className="flex items-baseline justify-between rounded-lg border border-border-subtle bg-surface-container-low p-3">
            <span className="text-body-xs text-text-secondary">Realized P&amp;L (worked out on save)</span>
            <span
              className={cn(
                "font-label-code text-body-md font-semibold",
                preview === null || preview === 0 ? "text-text-primary" : preview > 0 ? "text-accent-primary" : "text-accent-bearish"
              )}
            >
              {preview === null ? "—" : `${preview > 0 ? "+" : preview < 0 ? "−" : ""}${formatInr(Math.abs(preview))}`}
            </span>
          </div>

          {error && (
            <p role="alert" className="text-body-xs text-accent-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <button type="button" onClick={onClose} className="min-h-11 px-4 rounded-lg border border-border-strong">
              Keep open
            </button>
            <button
              type="submit"
              disabled={!exitOk || !!blocked || saving}
              className="min-h-11 px-4 rounded-lg bg-accent-primary text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Closing…" : "Close trade"}
            </button>
          </DialogFooter>
          <p className="text-body-xs text-text-secondary">Closed trades can&apos;t be edited.</p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
