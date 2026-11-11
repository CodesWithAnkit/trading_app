"use client"
import * as React from "react"
import Link from "next/link"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  CutKey,
  istToday,
  ScorecardData,
  ScorecardFilters,
  ScorecardRow,
  useScorecard,
} from "@/lib/hooks/useScorecard"

// spec 0027: the Signal Scorecard. Reconciled outcomes only, measured in R.
// Design: https://claude.ai/artifact/XAPsBkouzLiEgLPmuLamuD

const CUTS: { key: CutKey; label: string }[] = [
  { key: "strategy", label: "Strategy" },
  { key: "setup", label: "Setup" },
  { key: "timeBucket", label: "Time of day" },
  { key: "regime", label: "Market regime" },
  { key: "newsVerdict", label: "News verdict" },
]

const PRESETS: { key: ScorecardFilters["preset"]; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
]

// Distinct in lightness as well as hue, so lines stay apart without colour vision.
const LINE_COLORS = ["#1D4ED8", "#C2410C", "#0F766E", "#6B21A8", "#0369A1", "#A16207", "#BE185D", "#374151"]
const LINE_DASHES = ["0", "0", "6 4", "2 4", "0", "6 4", "2 4", "8 3"]

function fmtR(v: number | null): string {
  if (v === null) return "—"
  const sign = v > 0 ? "+" : v < 0 ? "−" : ""
  return `${sign}${Math.abs(v).toFixed(2)}R`
}
function fmtPct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`
}
function signClass(v: number | null): string {
  if (v === null || v === 0) return "text-text-primary"
  return v > 0 ? "text-accent-primary" : "text-accent-bearish"
}

export default function ScorecardPage() {
  const [filters, setFilters] = React.useState<ScorecardFilters>({
    preset: "30d",
    from: istToday(-30),
    to: istToday(),
    direction: "",
    strategyId: "",
    strategyVersion: "",
  })
  const [cut, setCut] = React.useState<CutKey>("strategy")
  const { data, error, loading, retry } = useScorecard(filters)
  const set = (patch: Partial<ScorecardFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div className="flex flex-col gap-4 px-gutter sm:px-gutter-md lg:px-margin-lg py-4 lg:py-margin w-full max-w-[1280px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">Scorecard</h1>
          <p className="text-body-sm text-text-secondary">
            Reconciled outcomes only, measured in R. Net figures are estimated after charges.
          </p>
        </div>
        {data && (
          <div className="flex flex-wrap gap-4 text-body-sm text-text-secondary">
            <span>
              Not yet reconciled: <strong className="font-label-code text-text-primary">{data.excluded.unreconciled}</strong>
            </span>
            <span>
              Invalid risk: <strong className="font-label-code text-text-primary">{data.excluded.invalidRisk}</strong>
            </span>
            <span>
              Min sample: <strong className="font-label-code text-text-primary">{data.settings.minSample}</strong>{" "}
              <Link href="/settings" className="text-accent-primary underline underline-offset-2">
                Edit in Settings
              </Link>
            </span>
          </div>
        )}
      </header>

      <section aria-label="Filters" className="bg-surface border border-border-subtle rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 bg-surface-container rounded-lg p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={filters.preset === p.key}
              onClick={() => set({ preset: p.key })}
              className={`min-h-10 px-3 rounded-md text-body-sm ${
                filters.preset === p.key ? "bg-surface text-text-primary font-semibold shadow-sm" : "text-text-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {filters.preset === "custom" && (
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-body-sm text-text-secondary">
              From
              <input
                type="date"
                value={filters.from}
                max={filters.to}
                onChange={(e) => set({ from: e.target.value })}
                className="h-10 rounded-lg border border-border-strong bg-surface px-2 text-text-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-body-sm text-text-secondary">
              To
              <input
                type="date"
                value={filters.to}
                min={filters.from}
                onChange={(e) => set({ to: e.target.value })}
                className="h-10 rounded-lg border border-border-strong bg-surface px-2 text-text-primary"
              />
            </label>
          </div>
        )}
        <FilterSelect
          label="Direction"
          value={filters.direction}
          onChange={(v) => set({ direction: v as ScorecardFilters["direction"] })}
          options={[["", "All"], ["LONG", "Long"], ["SHORT", "Short"]]}
        />
        <FilterSelect
          label="Strategy"
          value={filters.strategyId}
          onChange={(v) => set({ strategyId: v })}
          options={[["", "All strategies"], ...(data?.filterOptions.strategies ?? []).map((s) => [s, s] as [string, string])]}
        />
        <FilterSelect
          label="Version"
          value={filters.strategyVersion}
          onChange={(v) => set({ strategyVersion: v })}
          options={[["", "All versions"], ...(data?.filterOptions.versions ?? []).map((s) => [s, s] as [string, string])]}
        />
        {data && (
          <span className="ml-auto text-body-xs text-text-secondary">
            {data.range.all ? "All time" : `${data.range.from} to ${data.range.to} (IST)`}
          </span>
        )}
      </section>

      {error ? (
        <div role="alert" className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col items-start gap-3">
          <p className="text-body-sm text-text-primary font-semibold">Couldn&apos;t load the scorecard.</p>
          <p className="text-body-sm text-text-secondary">{error}</p>
          <button type="button" onClick={retry} className="min-h-11 px-4 rounded-lg bg-accent-primary text-white font-semibold">
            Retry
          </button>
        </div>
      ) : !data ? (
        <div className="bg-surface border border-border-subtle rounded-xl p-6 text-body-sm text-text-secondary" aria-busy="true">
          Loading scorecard…
        </div>
      ) : data.overall.trades === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col gap-2">
          <p className="text-body-sm text-text-primary font-semibold">No reconciled trades in this range</p>
          <p className="text-body-sm text-text-secondary">
            {data.excluded.unreconciled} signals are waiting for the 15:32 IST reconciliation and {data.excluded.invalidRisk} have
            invalid risk (no stored stop).
          </p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 ${loading ? "opacity-60" : ""}`}>
          <Overall data={data} />
          <Curve data={data} />
          <Breakdown rows={data.cuts[cut]} cut={cut} setCut={setCut} riskAssumed={data.settings.riskBudgetAssumed} />
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <label className="flex items-center gap-2 text-body-sm text-text-secondary">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-border-strong bg-surface px-2 text-text-primary"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function Overall({ data }: { data: ScorecardData }) {
  const o = data.overall
  const tiles: { label: string; value: string; sub: string; cls: string }[] = [
    { label: "Trades", value: String(o.trades), sub: `${o.wins} won · ${o.losses} lost · ${o.neutrals} neutral`, cls: "text-text-primary" },
    { label: "Win rate", value: fmtPct(o.winRate), sub: "Neutral trades in the total", cls: "text-text-primary" },
    { label: "Avg R gross", value: fmtR(o.avgRGross), sub: "Before charges", cls: signClass(o.avgRGross) },
    { label: "Expectancy net", value: fmtR(o.expectancyNet), sub: "Estimated, per trade", cls: signClass(o.expectancyNet) },
    { label: "Est. cost share", value: fmtPct(o.estimatedCostShare), sub: "Trades on the ₹20 default", cls: "text-text-primary" },
  ]
  return (
    <section aria-label="Overall" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {tiles.map((t) => (
        <div key={t.label} className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col gap-1">
          <span className="text-label-code font-semibold uppercase tracking-wider text-text-secondary">{t.label}</span>
          <span className={`font-label-code text-[28px] font-semibold tracking-tight ${t.cls}`}>{t.value}</span>
          <span className="text-body-xs text-text-secondary">{t.sub}</span>
        </div>
      ))}
      {o.tooFew && (
        <p className="col-span-full text-body-xs text-text-secondary">
          Fewer than {data.settings.minSample} trades overall: treat every number here as early evidence.
        </p>
      )}
    </section>
  )
}

function Curve({ data }: { data: ScorecardData }) {
  // One merged series keyed by trade time; each strategy steps only at its own trades.
  const rows = React.useMemo(() => {
    const all = data.curve.flatMap((l) => l.points.map((p) => ({ at: p.at, id: l.strategyId, v: p.cumNetR })))
    all.sort((a, b) => a.at.localeCompare(b.at))
    const last: Record<string, number> = {}
    return all.map((p) => {
      last[p.id] = p.v
      return { at: p.at, ...last }
    })
  }, [data.curve])

  return (
    <section aria-label="Cumulative net R" className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-body-md font-semibold text-text-primary">Cumulative net R by strategy</h2>
        <ul className="flex flex-wrap gap-3 text-body-xs text-text-primary">
          {data.curve.map((l, i) => (
            <li key={l.strategyId} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block w-4 h-[3px] rounded" style={{ background: LINE_COLORS[i] }} />
              <span className="font-label-code">{l.strategyId}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-60" role="img" aria-label="Cumulative net R per strategy over the selected range">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis dataKey="at" tick={false} axisLine={false} />
            <YAxis tickFormatter={(v: number) => `${v}R`} width={44} tick={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="var(--color-outline)" strokeDasharray="4 4" />
            <Tooltip
              labelFormatter={(at) => new Date(String(at)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              formatter={(v) => fmtR(Number(v))}
            />
            {data.curve.map((l, i) => (
              <Line
                key={l.strategyId}
                type="stepAfter"
                dataKey={l.strategyId}
                stroke={LINE_COLORS[i]}
                strokeDasharray={LINE_DASHES[i]}
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.curveOmitted.length > 0 && (
        <p className="text-body-xs text-text-secondary">Not charted (smaller samples): {data.curveOmitted.join(", ")}</p>
      )}
    </section>
  )
}

function Breakdown({
  rows,
  cut,
  setCut,
  riskAssumed,
}: {
  rows: ScorecardRow[]
  cut: CutKey
  setCut: (c: CutKey) => void
  riskAssumed: boolean
}) {
  const cutLabel = CUTS.find((c) => c.key === cut)!.label
  return (
    <section aria-label="Breakdown" className="bg-surface border border-border-subtle rounded-xl flex flex-col">
      <div role="tablist" aria-label="Cut" className="flex gap-1 px-3 pt-3 border-b border-border-subtle overflow-x-auto">
        {CUTS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={cut === c.key}
            onClick={() => setCut(c.key)}
            className={`min-h-11 px-4 whitespace-nowrap text-body-sm border-b-2 ${
              cut === c.key ? "border-accent-primary text-accent-primary font-semibold" : "border-transparent text-text-secondary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-body-sm">
          <thead>
            <tr className="text-right text-label-code uppercase tracking-wider text-text-secondary">
              <th scope="col" className="text-left px-4 py-3 font-semibold">{cutLabel}</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Trades</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">W / L / N</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Win rate</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Avg win</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Avg loss</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Avg R gross</th>
              <th scope="col" className="px-2.5 py-3 font-semibold">Expectancy net</th>
              <th scope="col" className="px-4 py-3 font-semibold">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-t border-border-subtle ${r.tooFew ? "opacity-60 bg-surface-container-low" : ""}`}>
                <th scope="row" className="text-left px-4 py-3.5 font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label-code text-text-primary">{r.label}</span>
                    {r.tooFew && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-status-stale-bg text-status-stale-text">
                        Too few trades
                      </span>
                    )}
                  </div>
                </th>
                <td className="px-2.5 py-3.5 text-right font-label-code font-semibold text-text-primary">{r.trades}</td>
                <td className="px-2.5 py-3.5 text-right font-label-code text-text-primary">
                  {r.wins} / {r.losses} / {r.neutrals}
                </td>
                <td className="px-2.5 py-3.5 text-right font-label-code text-text-primary">{fmtPct(r.winRate)}</td>
                <td className="px-2.5 py-3.5 text-right font-label-code text-accent-primary">{fmtR(r.avgWinR)}</td>
                <td className="px-2.5 py-3.5 text-right font-label-code text-accent-bearish">{fmtR(r.avgLossR)}</td>
                <td className={`px-2.5 py-3.5 text-right font-label-code ${signClass(r.avgRGross)}`}>{fmtR(r.avgRGross)}</td>
                <td className={`px-2.5 py-3.5 text-right font-label-code font-semibold ${signClass(r.expectancyNet)}`}>
                  {fmtR(r.expectancyNet)}
                </td>
                <td className="px-4 py-3.5 text-right font-label-code text-text-secondary">{fmtPct(r.estimatedCostShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-body-xs text-text-secondary border-t border-border-subtle">
        Win rate counts NEUTRAL trades in the total. Avg win and avg loss use WON and LOST trades only. Est. cost is the share of
        trades charged the ₹20 default because they have no evidence row. Rows below the minimum sample are muted.
        {riskAssumed && " Your risk per trade isn't set, so costs assume a ₹1,000 risk budget."}
      </p>
    </section>
  )
}
