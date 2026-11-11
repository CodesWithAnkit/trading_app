"use client"
import * as React from "react"

import { apiFetch } from "@/lib/api/apiFetch"
import { cn } from "@/lib/utils"
import { useSignals } from "@/lib/contexts/SignalContext"
import type { RiskLimits } from "@/lib/risk/types"

type Field = { key: keyof RiskLimits; label: string; help: string; min: number; max?: number; step: number; prefix?: string }

const FIELDS: Field[] = [
  { key: "riskPerTrade", label: "Risk per trade", help: "₹100 or more. Sets every signal's share count.", min: 100, step: 50, prefix: "₹" },
  { key: "dailyLossLimit", label: "Daily loss limit", help: "At least your risk per trade. Counts today's net loss plus open risk.", min: 100, step: 500, prefix: "₹" },
  { key: "maxOpenTrades", label: "Max open trades", help: "1 to 20. Your PENDING journal entries.", min: 1, max: 20, step: 1 },
  { key: "maxCapitalPerTrade", label: "Max capital per trade", help: "₹1,000 or more. Caps share count on tight stops.", min: 1000, step: 1000, prefix: "₹" },
]

/** Same rules as the backend (spec 0028 AC-1); the server checks again and its message wins. */
function validate(v: Record<keyof RiskLimits, string>): string | null {
  const n = (k: keyof RiskLimits) => Number(v[k])
  if (!(n("riskPerTrade") >= 100)) return "Risk per trade must be ₹100 or more."
  if (!(n("dailyLossLimit") >= n("riskPerTrade"))) return "Daily loss limit must be at least your risk per trade."
  if (!Number.isInteger(n("maxOpenTrades")) || n("maxOpenTrades") < 1 || n("maxOpenTrades") > 20) return "Max open trades must be a whole number from 1 to 20."
  if (!(n("maxCapitalPerTrade") >= 1000)) return "Max capital per trade must be ₹1,000 or more."
  return null
}

export type RiskLimitsSettingsProps = { className?: string }

/** spec 0028 AC-1: the four limits every signal's verdict is sized from, saved per user. */
export function RiskLimitsSettings({ className }: RiskLimitsSettingsProps) {
  const { refreshRisk } = useSignals()
  const [values, setValues] = React.useState<Record<keyof RiskLimits, string> | null>(null)
  const [status, setStatus] = React.useState<"loading" | "idle" | "saving" | "saved" | "error">("loading")
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    apiFetch("/api/v1/settings/risk")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Request failed (${r.status})`))))
      .then((l: RiskLimits) => {
        setValues({
          riskPerTrade: String(l.riskPerTrade),
          dailyLossLimit: String(l.dailyLossLimit),
          maxOpenTrades: String(l.maxOpenTrades),
          maxCapitalPerTrade: String(l.maxCapitalPerTrade),
        })
        setStatus("idle")
      })
      .catch(() => {
        setStatus("error")
        setMessage("Couldn't load your risk limits.")
      })
  }, [])

  const problem = values ? validate(values) : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!values || problem) return
    setStatus("saving")
    setMessage(null)
    const body = Object.fromEntries(FIELDS.map((f) => [f.key, Number(values[f.key])]))
    const res = await apiFetch("/api/v1/settings/risk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setStatus("saved")
      refreshRisk()
    } else {
      const err = await res.json().catch(() => null)
      setStatus("error")
      setMessage(err?.message ?? "Couldn't save.")
    }
  }

  return (
    <form
      onSubmit={save}
      aria-labelledby="risk-limits-title"
      className={cn("bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md", className)}
    >
      <div className="flex flex-col gap-0.5 pb-space-xs border-b border-border-subtle">
        <h2 id="risk-limits-title" className="font-headline-sm text-headline-sm font-bold text-text-primary">
          Risk limits
        </h2>
        <p className="text-body-xs text-text-secondary">
          Every signal is sized from these: take N shares, or skip with a reason. Orders are always placed by hand.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-body-sm font-semibold text-text-primary">
            {f.label}
            <span className="relative">
              {f.prefix && (
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-label-code text-text-secondary">
                  {f.prefix}
                </span>
              )}
              <input
                type="number"
                inputMode="numeric"
                min={f.min}
                max={f.max}
                step={f.step}
                disabled={!values}
                value={values?.[f.key] ?? ""}
                onChange={(e) => {
                  setValues((v) => (v ? { ...v, [f.key]: e.target.value } : v))
                  setStatus("idle")
                }}
                className={cn("h-11 w-full rounded-lg border border-border-strong bg-surface font-label-code text-text-primary", f.prefix ? "pl-7 pr-3" : "px-3")}
              />
            </span>
            <span className="font-normal text-body-xs text-text-secondary">{f.help}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!values || !!problem || status === "saving"}
          className="min-h-11 px-4 rounded-lg bg-accent-primary text-white font-semibold disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save limits"}
        </button>
        <p role="status" className={cn("text-body-xs", problem || status === "error" ? "text-accent-danger" : "text-text-secondary")}>
          {problem ?? (status === "saved" ? "Saved. Signal sizes update in a moment." : message ?? "")}
        </p>
      </div>
    </form>
  )
}
