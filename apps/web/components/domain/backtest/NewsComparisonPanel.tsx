"use client"
import * as React from "react"
import { fetchNewsComparison, type NewsComparison, type NewsComparisonMetrics } from "@/lib/hooks/useBacktest"
import { pct, signedR } from "./format"

const ROWS: { key: keyof NewsComparisonMetrics; label: string; fmt: (n: number) => string }[] = [
  { key: "trades", label: "Trades", fmt: n => String(n) },
  { key: "winRate", label: "Win rate", fmt: n => pct(n) },
  { key: "netR", label: "Net R", fmt: n => signedR(n) },
  { key: "profitFactor", label: "Profit factor", fmt: n => n.toFixed(2) },
  { key: "maxDrawdownR", label: "Max drawdown", fmt: n => `${n.toFixed(1)} R` },
]

/**
 * Spec 0025 backtest news comparison: this run's trades on days we collected news, scored as
 * they are and again skipping the trades the live news gate would have blocked at entry.
 */
export function NewsComparisonPanel({ runId, status }: { runId: string; status: string }) {
  const [data, setData] = React.useState<NewsComparison | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (status !== "done") return
    let live = true
    setData(null)
    setError(null)
    fetchNewsComparison(runId)
      .then(d => live && setData(d))
      .catch(e => live && setError((e as Error).message))
    return () => { live = false }
  }, [runId, status])

  if (status !== "done") return null

  return (
    <section aria-label="News filter comparison" className="px-5 py-4 border-b border-border-subtle flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-text-primary">With and without the news gate</h3>
        <span className="font-mono text-[11px] text-text-secondary">{data?.gateVersion ?? "news-gate-v1"}</span>
      </div>

      {error ? (
        <p className="text-xs text-accent-danger">Could not load the news comparison: {error}</p>
      ) : !data ? (
        <p className="text-xs text-text-secondary">Scoring covered trades…</p>
      ) : data.coveredDays === 0 ? (
        <p className="text-xs text-text-secondary">No news coverage in this run&apos;s window yet.</p>
      ) : (
        <>
          <p className="text-xs text-text-secondary">
            {data.coveredTrades} of {data.totalTrades} trades covered, on {data.coveredDays} {data.coveredDays === 1 ? "day" : "days"}.
            {" "}{data.blocked.length} blocked, {data.warnedTrades} warned (warnings keep the trade).
          </p>
          {data.sampleTooSmall && (
            <p role="note" className="text-xs font-semibold text-status-stale-text bg-status-stale-bg rounded px-2 py-1 self-start">
              Sample too small: under 30 covered trades, so don&apos;t read much into these numbers yet.
            </p>
          )}
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-text-secondary text-left">
                <th className="font-medium py-1">Metric</th>
                <th className="font-medium py-1 text-right">Without filter</th>
                <th className="font-medium py-1 text-right">With filter</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => (
                <tr key={r.key} className="border-t border-border-subtle">
                  <td className="py-1 text-text-secondary">{r.label}</td>
                  <td className="py-1 text-right text-text-primary">{r.fmt(data.without[r.key])}</td>
                  <td className="py-1 text-right text-text-primary font-semibold">{r.fmt(data.with[r.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.blocked.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-accent-primary">Blocked trades ({data.blocked.length})</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {data.blocked.map(b => (
                  <li key={`${b.tradeDate}-${b.side}`} className="text-text-secondary">
                    <span className="text-text-primary font-mono">{b.tradeDate} {b.side} {signedR(b.rNet)}</span> · {b.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}
