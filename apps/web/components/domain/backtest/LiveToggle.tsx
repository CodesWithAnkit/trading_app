"use client"
import * as React from "react"
import { fetchToggles, updateToggle, type LiveToggle as Toggle } from "@/lib/hooks/useBacktest"

const STATE_STYLE: Record<Toggle["state"], string> = {
  live: "bg-secondary-container text-on-secondary-fixed",
  "warming up": "bg-surface-container text-on-primary-fixed-variant",
  blocked: "bg-error-container text-on-error-container",
  off: "bg-surface-high text-on-surface-variant",
  "no run": "bg-surface-high text-on-surface-variant",
}

/** spec 0023 AC-1, AC-8: the Live switch for one guru rule on one index, with its state. */
export function LiveToggle({ ruleId, symbol }: { ruleId: string; symbol: string }) {
  const [t, setT] = React.useState<Toggle | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let live = true
    fetchToggles()
      .then((all) => live && setT(all.find((x) => x.ruleId === ruleId && x.symbol === symbol) ?? null))
      .catch((e) => live && setError((e as Error).message))
    return () => {
      live = false
    }
  }, [ruleId, symbol])

  if (!t) return error ? <p className="text-xs text-error">{error}</p> : null
  const canEnable = t.state !== "no run" && (t.enabled || t.state !== "blocked")

  const flip = async () => {
    setBusy(true)
    setError(null)
    try {
      setT(await updateToggle(ruleId, symbol, !t.enabled))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-border-subtle p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Live on {symbol}</span>
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${STATE_STYLE[t.state]}`}>{t.state}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={t.enabled}
          aria-label={`Live signals for ${ruleId} on ${symbol}`}
          disabled={busy || (!t.enabled && !canEnable)}
          onClick={flip}
          className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${t.enabled ? "bg-primary" : "bg-border-strong"}`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-all ${t.enabled ? "left-6" : "left-1"}`} />
        </button>
      </div>
      {t.reason && <p className="text-xs text-text-secondary">{t.reason}</p>}
      {!t.enabled && t.state !== "no run" && <p className="text-xs text-text-secondary">Signals only. Nothing is ever ordered for you.</p>}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </div>
  )
}

/** spec 0023 AC-8: read only list of what is live, for Settings (admins only). */
export function LiveGuruRulesList() {
  const [rows, setRows] = React.useState<Toggle[] | null>(null)
  React.useEffect(() => {
    fetchToggles()
      .then((all) => setRows(all.filter((t) => t.enabled)))
      .catch(() => setRows([]))
  }, [])
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col gap-2">
      <h2 className="text-base font-bold text-text-primary">Live guru rules</h2>
      {rows === null ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-secondary">None. Switch a passing rule on from the Backtest Lab.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((t) => (
            <li key={`${t.ruleId}|${t.symbol}`} className="flex items-center justify-between text-sm">
              <span className="font-mono">
                {t.ruleId} · {t.symbol}
              </span>
              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${STATE_STYLE[t.state]}`}>{t.state}</span>
            </li>
          ))}
        </ul>
      )}
      <a href="/dashboard/backtest" className="text-sm text-primary hover:underline self-start">
        Manage in the Backtest Lab
      </a>
    </section>
  )
}
