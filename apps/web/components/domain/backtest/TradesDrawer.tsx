"use client"
import * as React from "react"
import { fetchTrades, type RunRow, type TradesPage } from "@/lib/hooks/useBacktest"
import { fmtIst, num } from "./format"
import { GateBadge } from "./GateBadge"

type Tab = "true" | "false" | "all"
const TABS: { id: Tab; label: string }[] = [
  { id: "true", label: "Out of sample" },
  { id: "false", label: "In sample" },
  { id: "all", label: "All" },
]

/** spec 0020 AC-4, AC-9: every trade of a run, with gross R, cost R and net R. */
export function TradesDrawer({ run, name, onClose }: { run: RunRow; name: string; onClose: () => void }) {
  const [tab, setTab] = React.useState<Tab>("true")
  const [pages, setPages] = React.useState<TradesPage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    let live = true
    fetchTrades(run.id, tab)
      .then((p) => live && setPages([p]))
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [run.id, tab])

  React.useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const rows = pages.flatMap((p) => p.data)
  const head = pages[0]
  const next = pages[pages.length - 1]?.nextCursor

  const more = async () => {
    if (!next) return
    setLoading(true)
    try {
      const p = await fetchTrades(run.id, tab, next)
      setPages((prev) => [...prev, p])
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    const header = "date,side,entry_time,entry,stop,target,exit_time,exit,reason,r_gross,cost_r,r_net,oos"
    const lines = rows.map((t) => [t.trade_date, t.side, t.entry_time, t.entry, t.stop, t.target, t.exit_time, t.exit, t.exit_reason, t.r_gross, t.cost_r, t.r_net, t.is_oos].join(","))
    const url = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${run.rule_id}_${run.symbol}_trades.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-on-surface/45" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Trades for ${name}`}
        className="relative w-full md:w-[820px] max-h-[90dvh] md:max-h-none mt-auto md:mt-0 rounded-t-2xl md:rounded-none bg-surface shadow-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-text-primary">{name}</h2>
              <GateBadge run={run} />
            </div>
            <p className="font-mono text-xs text-text-secondary mt-1">
              {run.rule_id} · {run.symbol} · run {fmtIst(run.created_at).date} · {head ? `${head.total} trades` : "…"}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close trades" className="w-11 h-11 shrink-0 rounded-md border border-border-subtle flex items-center justify-center hover:bg-surface-high">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Sample" className="flex bg-surface-high rounded-md p-0.5 gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => {
                  if (t.id === tab) return
                  setLoading(true)
                  setPages([])
                  setError(null)
                  setTab(t.id)
                }}
                className={`h-9 px-3 rounded text-xs font-semibold ${tab === t.id ? "bg-surface text-primary shadow-sm" : "text-text-secondary"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {head && (
            <div className="flex gap-1.5 md:ml-auto text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-primary-fixed-variant">Target {head.counts.target}</span>
              <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container">Stop {head.counts.stop}</span>
              <span className="px-2.5 py-1 rounded-full bg-surface-high text-on-surface-variant">Time {head.counts.time}</span>
            </div>
          )}
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="h-9 px-3 rounded-md border border-border-strong text-xs font-semibold text-primary disabled:opacity-50">
            Export CSV
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {error && <p className="m-5 text-sm text-error">{error}</p>}
          {!error && !loading && rows.length === 0 && <p className="m-5 text-sm text-text-secondary">No trades in this sample.</p>}
          {rows.length > 0 && (
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-surface-bright text-[10px] tracking-wider text-text-secondary text-left sticky top-0">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">DATE</th>
                  <th className="px-1.5 py-2.5 font-semibold">SIDE</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">ENTRY</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">STOP</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">TARGET</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">EXIT</th>
                  <th className="px-1.5 py-2.5 font-semibold">REASON</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">R GROSS</th>
                  <th className="px-1.5 py-2.5 font-semibold text-right">COST R</th>
                  <th className="px-5 py-2.5 font-semibold text-right">R NET</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((t) => {
                  const e = fmtIst(t.entry_time)
                  const x = fmtIst(t.exit_time)
                  return (
                    <tr key={t.id} className="border-t border-surface-high">
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        {e.date} <span className="text-text-secondary">{e.time}</span>
                      </td>
                      <td className="px-1.5 py-2.5">
                        <span className={`font-sans text-[10px] font-bold px-1.5 py-0.5 rounded ${t.side === "LONG" ? "bg-surface-container text-on-primary-fixed-variant" : "bg-tertiary-fixed text-on-tertiary-fixed-variant"}`}>{t.side}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right">{num(t.entry)}</td>
                      <td className="px-1.5 py-2.5 text-right text-text-secondary">{num(t.stop)}</td>
                      <td className="px-1.5 py-2.5 text-right text-text-secondary">{num(t.target)}</td>
                      <td className="px-1.5 py-2.5 text-right whitespace-nowrap">
                        {num(t.exit)} <span className="text-text-secondary">{x.time}</span>
                      </td>
                      <td className="px-1.5 py-2.5 font-sans capitalize">{t.exit_reason}</td>
                      <td className="px-1.5 py-2.5 text-right">{num(t.r_gross)}</td>
                      <td className="px-1.5 py-2.5 text-right text-on-tertiary-fixed-variant">{num(t.cost_r, 3)}</td>
                      <td className={`px-5 py-2.5 text-right font-semibold ${Number(t.r_net) > 0 ? "text-secondary" : "text-error"}`}>{num(t.r_net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between gap-3 text-xs text-text-secondary">
          <span>
            Showing {rows.length} of {head?.total ?? 0} · fills include slippage · r_net = r_gross − cost_r
          </span>
          <button type="button" onClick={more} disabled={!next || loading} className="h-9 px-3 rounded-md border border-border-strong font-semibold text-primary disabled:opacity-50">
            {loading ? "Loading…" : next ? "Next 200" : "All loaded"}
          </button>
        </div>
      </div>
    </div>
  )
}
