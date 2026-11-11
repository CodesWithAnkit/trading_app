"use client"
import * as React from "react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { formatInr, skipLabel } from "@/lib/risk/labels"
import { strategyLabel } from "@/lib/scorecard/labels"
import type { Signal } from "@/mock/signals"

export type TakeTradeDialogProps = {
  /** The signal to take; null keeps the dialog closed. */
  signal: Signal | null
  onClose: () => void
  /** Called after the journal entry is saved. */
  onSaved?: () => void
}

type Form = { direction: "LONG" | "SHORT"; entry: string; stop: string; target: string; quantity: string; notes: string }

/**
 * spec 0028 AC-10: "Take this trade" records the trade in the journal, prefilled from the
 * signal and its verdict (quantity, direction), every field editable to match your fill.
 */
export function TakeTradeDialog({ signal, onClose, onSaved }: TakeTradeDialogProps) {
  const { createEntry } = useTrades()
  const { refreshRisk } = useSignals()
  const [form, setForm] = React.useState<Form | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!signal) return
    setError(null)
    setForm({
      direction: signal.direction,
      entry: signal.referenceEntry.toFixed(2),
      stop: signal.stop.toFixed(2),
      target: signal.targets.t1.toFixed(2),
      quantity: signal.risk?.verdict === "TAKE" ? String(signal.risk.qty) : "",
      notes: "",
    })
  }, [signal])

  if (!signal || !form) return null
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const qty = Number(form.quantity)
  const entry = Number(form.entry)
  const stop = Number(form.stop)
  const target = Number(form.target)
  const valid = Number.isInteger(qty) && qty >= 1 && entry > 0 && stop > 0 && target > 0
  const riskNow = valid ? qty * Math.abs(entry - stop) : null
  const verdict = signal.risk

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || !signal) return
    setSaving(true)
    setError(null)
    try {
      await createEntry({
        symbol: signal.symbol,
        strategyName: signal.guru?.ruleId ? `guru:${signal.guru.ruleId}` : signal.setup.toLowerCase(),
        direction: form!.direction,
        entryPrice: entry,
        stopPrice: stop,
        targetPrice: target,
        quantity: qty,
        signalId: signal.id,
        notes: form!.notes || undefined,
      })
      refreshRisk()
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the trade.")
    } finally {
      setSaving(false)
    }
  }

  const field = "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 font-label-code text-text-primary"

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-surface border-border-subtle text-text-primary">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Take this trade</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Prefilled from the {signal.symbol} signal ({strategyLabel(signal.guru?.ruleId ? `guru:${signal.guru.ruleId}` : signal.setup)}).
              Change anything that differs from your fill in Angel One.
            </DialogDescription>
          </DialogHeader>

          {verdict?.verdict === "SKIP" && (
            <p role="note" className="rounded-lg border border-accent-bearish/30 bg-accent-bearish/5 p-2.5 text-body-xs text-text-primary">
              Your limits say skip: {skipLabel(verdict.skipReason)}. You can still record it if you already placed the order.
            </p>
          )}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-body-sm font-semibold mb-1.5">Direction</legend>
            <div className="flex gap-2">
              {(["LONG", "SHORT"] as const).map((d) => (
                <label
                  key={d}
                  className={`flex-1 min-h-11 flex items-center justify-center gap-2 rounded-lg border text-body-sm cursor-pointer ${
                    form.direction === d ? "border-accent-primary bg-accent-primary/5 font-semibold text-accent-primary" : "border-border-strong"
                  }`}
                >
                  <input type="radio" name="direction" checked={form.direction === d} onChange={() => set({ direction: d })} />
                  {d === "LONG" ? "Long" : "Short"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
              Entry
              <input inputMode="decimal" className={field} value={form.entry} onChange={(e) => set({ entry: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
              Stop
              <input inputMode="decimal" className={field} value={form.stop} onChange={(e) => set({ stop: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
              Target
              <input inputMode="decimal" className={field} value={form.target} onChange={(e) => set({ target: e.target.value })} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
            Quantity
            <input
              inputMode="numeric"
              className={`${field} border-accent-primary`}
              value={form.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
              aria-describedby="take-qty-help"
              aria-invalid={form.quantity !== "" && !(Number.isInteger(qty) && qty >= 1)}
            />
            <span id="take-qty-help" className="font-normal text-body-xs text-text-secondary">
              {verdict?.verdict === "TAKE" ? `Suggested ${verdict.qty} shares · ` : ""}
              {riskNow !== null ? `risk at this size ${formatInr(riskNow)}` : "Whole number, 1 or more."}
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-body-sm font-semibold">
            Notes (optional)
            <textarea
              rows={2}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 font-normal text-text-primary"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </label>

          {error && (
            <p role="alert" className="text-body-xs text-accent-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <button type="button" onClick={onClose} className="min-h-11 px-4 rounded-lg border border-border-strong text-text-primary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || saving}
              className="min-h-11 px-4 rounded-lg bg-accent-primary text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add to journal"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
