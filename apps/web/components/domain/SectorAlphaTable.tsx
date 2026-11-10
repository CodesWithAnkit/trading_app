"use client"
import * as React from "react"

export type SectorRow = {
  name: string
  ltp: number
  changePct: number
  /** null when the real NIFTY change is unknown (spec 0026). */
  alphaVsNifty: number | null
  leaderSymbol: string
  leaderChangePct: number
  advances: number
  declines: number
  bias: "LONG" | "SHORT" | "NEUTRAL"
}

/** The rule gate: setups only in sectors at or above this alpha vs NIFTY. */
export const ALPHA_GATE_PCT = 0.5
/** Alpha bars are scaled to this magnitude; anything beyond is drawn full length. */
const ALPHA_SCALE_PCT = 2

const signed = (n: number, digits = 2) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`
const price = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const tone = (n: number) => (n > 0 ? "text-accent-bullish" : n < 0 ? "text-accent-danger" : "text-text-secondary")

const BIAS = {
  LONG: { label: "Long", mark: "▲", cls: "text-status-live-text bg-status-live-bg" },
  SHORT: { label: "Short", mark: "▼", cls: "text-status-disconnected-text bg-status-disconnected-bg" },
  NEUTRAL: { label: "Neutral", mark: "•", cls: "text-text-secondary bg-surface-high" },
} as const

/**
 * Alpha vs NIFTY as a bar growing from a zero line, with a tick at the +0.50% gate.
 * This is the column the rule gate reads, so it is the one visual accent of the table.
 */
function AlphaBar({ alpha }: { alpha: number | null }) {
  if (alpha === null) return <span className="font-metric-sm text-text-secondary" title="NIFTY change not known yet">–</span>
  const width = Math.min(Math.abs(alpha) / ALPHA_SCALE_PCT, 1) * 50
  const passes = alpha >= ALPHA_GATE_PCT
  const gateLeft = 50 + (ALPHA_GATE_PCT / ALPHA_SCALE_PCT) * 50
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`w-14 shrink-0 text-right font-metric-sm tabular-nums font-semibold ${tone(alpha)}`}>{signed(alpha)}</span>
      <div className="relative h-2 flex-1 min-w-16 rounded-full bg-surface-high" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
        <span className="absolute -inset-y-0.5 w-px bg-primary/50" style={{ left: `${gateLeft}%` }} />
        <span
          className={`absolute inset-y-0 rounded-full ${alpha >= 0 ? (passes ? "bg-accent-bullish" : "bg-accent-bullish/45") : "bg-accent-danger/80"}`}
          style={alpha >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
        />
      </div>
      <span className="sr-only">{passes ? "passes the alpha gate" : "below the alpha gate"}</span>
    </div>
  )
}

function Breadth({ adv, dec }: { adv: number; dec: number }) {
  const total = adv + dec
  const advPct = total ? (adv / total) * 100 : 0
  return (
    <div className="flex items-center gap-2" title={`${adv} advancing, ${dec} declining`}>
      <div className="flex h-1.5 w-12 overflow-hidden rounded-full bg-surface-high" aria-hidden="true">
        <span className="bg-accent-bullish" style={{ width: `${advPct}%` }} />
        <span className="bg-accent-danger" style={{ width: `${total ? 100 - advPct : 0}%` }} />
      </div>
      <span className="font-label-code text-body-xs tabular-nums text-text-secondary whitespace-nowrap">
        {adv}<span className="text-text-secondary/60">/</span>{dec}
      </span>
    </div>
  )
}

function BiasLabel({ bias }: { bias: SectorRow["bias"] }) {
  const b = BIAS[bias]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-body-xs font-semibold whitespace-nowrap ${b.cls}`}>
      <span aria-hidden="true">{b.mark}</span>
      {b.label}
    </span>
  )
}

/** Sectors sorted by alpha, strongest first, so the gate passers lead the table. */
export function SectorAlphaTable({ rows }: { rows: SectorRow[] }) {
  const sorted = React.useMemo(() => [...rows].sort((a, b) => (b.alphaVsNifty ?? -Infinity) - (a.alphaVsNifty ?? -Infinity)), [rows])
  const passing = sorted.filter((r) => r.alphaVsNifty !== null && r.alphaVsNifty >= ALPHA_GATE_PCT).length

  return (
    <>
      {/* Desktop and tablet: fixed columns so nothing wraps or overflows the card */}
      <table className="hidden md:table w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle bg-surface-container-low text-body-xs text-text-secondary">
            <th scope="col" className="py-2 pl-space-md pr-2 font-semibold">Sector</th>
            <th scope="col" className="py-2 px-2 font-semibold text-right">Last</th>
            <th scope="col" className="py-2 px-2 font-semibold">Alpha vs NIFTY</th>
            <th scope="col" className="py-2 px-2 font-semibold">Leader</th>
            <th scope="col" className="py-2 px-2 font-semibold">Breadth</th>
            <th scope="col" className="py-2 pl-2 pr-space-md font-semibold text-right">Bias</th>
          </tr>
        </thead>
        <tbody className="text-text-primary">
          {sorted.map((s, i) => {
            const gateEdge = i > 0 && (sorted[i - 1].alphaVsNifty ?? -Infinity) >= ALPHA_GATE_PCT && (s.alphaVsNifty ?? -Infinity) < ALPHA_GATE_PCT
            return (
              <tr
                key={s.name}
                className={`hover:bg-surface-bright ${gateEdge ? "border-t-2 border-primary/30" : "border-t border-border-subtle"}`}
              >
                <th scope="row" className="py-2 pl-space-md pr-2 font-body-sm font-semibold truncate">{s.name}</th>
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  <span className="font-metric-sm tabular-nums">{price(s.ltp)}</span>{" "}
                  <span className={`text-body-xs tabular-nums ${tone(s.changePct)}`}>{signed(s.changePct)}</span>
                </td>
                <td className="py-2 px-2">
                  <AlphaBar alpha={s.alphaVsNifty} />
                </td>
                <td className="py-2 px-2 whitespace-nowrap truncate">
                  <span className="font-label-code text-body-xs font-semibold">{s.leaderSymbol}</span>{" "}
                  <span className={`text-body-xs tabular-nums ${tone(s.leaderChangePct)}`}>{signed(s.leaderChangePct)}</span>
                </td>
                <td className="py-2 px-2">
                  <Breadth adv={s.advances} dec={s.declines} />
                </td>
                <td className="py-2 pl-2 pr-space-md text-right">
                  <BiasLabel bias={s.bias} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Phone: one compact row per sector, the alpha bar carries the comparison */}
      <ul className="md:hidden divide-y divide-border-subtle">
        {sorted.map((s) => (
          <li key={s.name} className="px-space-md py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-body-sm font-semibold truncate">{s.name}</span>
              <BiasLabel bias={s.bias} />
            </div>
            <AlphaBar alpha={s.alphaVsNifty} />
            <div className="flex items-center justify-between gap-3 text-body-xs text-text-secondary">
              <span className="tabular-nums">
                {price(s.ltp)} <span className={tone(s.changePct)}>{signed(s.changePct)}</span>
              </span>
              <span className="truncate">
                {s.leaderSymbol} <span className={tone(s.leaderChangePct)}>{signed(s.leaderChangePct)}</span>
              </span>
              <Breadth adv={s.advances} dec={s.declines} />
            </div>
          </li>
        ))}
      </ul>

      <p className="px-space-md py-2 border-t border-border-subtle text-body-xs text-text-secondary">
        {passing} of {sorted.length} sectors clear the +{ALPHA_GATE_PCT.toFixed(2)}% alpha gate. The tick on each bar marks the gate.
      </p>
    </>
  )
}
