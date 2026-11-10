"use client"
import * as React from "react"
import { useBacktest, type RunRow, type Definitions, type BackfillState, type HistoryCounts } from "@/lib/hooks/useBacktest"
import { ALL_RULE_IDS, SYMBOLS, fmtDateTime, gateScopeNote, isBaseline, isMarketHours, pct, signedPct, signedR, yearsPositive } from "./format"
import { Badge, GateBadge } from "./GateBadge"
import { TradesDrawer } from "./TradesDrawer"
import { LiveToggle } from "./LiveToggle"

type SymFilter = "BOTH" | "NIFTY" | "SENSEX"

/** spec 0020 AC-9: the admin backtest lab (layout from the approved Guru Backtest Lab design). */
export function BacktestLab() {
  const { board, defs, backfill, history, error, notice, setNotice, startRuns, startBackfill } = useBacktest()
  const [sym, setSym] = React.useState<SymFilter>("BOTH")
  // spec 0023: a GURU signal's evidence link opens the lab on its run (?run=<id>).
  const [selected, setSelected] = React.useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("run"),
  )
  const [drawer, setDrawer] = React.useState<RunRow | null>(null)

  const done = React.useMemo(() => board?.done ?? [], [board])
  const rows = React.useMemo(
    () =>
      done
        .filter((r) => sym === "BOTH" || r.symbol === sym)
        .sort((a, b) => order(a.rule_id) - order(b.rule_id) || a.symbol.localeCompare(b.symbol)),
    [done, sym],
  )
  const sel = rows.find((r) => r.id === selected) ?? rows.find((r) => !isBaseline(r.rule_id)) ?? rows[0] ?? null
  const nameOf = (id: string) => defs?.rules[id]?.name ?? id

  const historyEmpty = history !== null && Object.values(history).every((h) => h.count === 0)
  const backfilling = backfill?.status === "running"
  const running = board?.active ?? []
  const passing = new Set(done.filter((r) => !isBaseline(r.rule_id) && r.passed_gate).map((r) => r.rule_id)).size
  const coin = (s: string) => done.find((r) => r.rule_id === "BASE_COIN" && r.symbol === s)
  const bh = (s: string) => done.find((r) => r.rule_id === "BASE_BUYHOLD" && r.symbol === s)
  const coinSym = sym === "SENSEX" ? "SENSEX" : "NIFTY"
  const lastRun = done.reduce<string | null>((m, r) => (!m || (r.finished_at ?? "") > m ? (r.finished_at ?? m) : m), null)
  // A failure only matters until a newer run of the same rule and symbol finishes.
  const failures = (board?.recentFailures ?? []).filter(
    (f) => !done.some((d) => d.rule_id === f.rule_id && d.symbol === f.symbol && d.created_at > f.created_at),
  )
  const windowLine = sel?.window_start ? `Data ${sel.window_start} → ${sel.window_end} · OOS from ${sel.oos_start}` : "No runs yet"

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1440px] mx-auto w-full">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Guru Backtest Lab</h1>
            <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded bg-on-surface text-surface">ADMIN</span>
          </div>
          <p className="text-sm text-text-secondary">
            5 YouTube rules, pre registered as definitions {defs?.version ?? "v1"} · NIFTY &amp; SENSEX 5m · costs on · judged out of sample only
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-text-secondary px-2 hidden md:inline">{windowLine}</span>
          <button
            type="button"
            onClick={() => startBackfill([...SYMBOLS])}
            disabled={backfilling}
            className="h-11 px-4 rounded-md border border-border-strong bg-surface text-sm font-semibold text-text-primary disabled:opacity-60"
          >
            {backfilling ? "Backfill running" : "Backfill history"}
          </button>
          <button
            type="button"
            onClick={() => startRuns([...ALL_RULE_IDS], [...SYMBOLS])}
            disabled={running.length > 0 || backfilling || historyEmpty}
            className="h-11 px-4 rounded-md bg-primary text-on-primary text-sm font-semibold disabled:opacity-60"
          >
            {running.length ? `Runs in progress (${running.length})` : "Run all rules"}
          </button>
        </div>
      </header>

      {isMarketHours() && (
        <div role="status" className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed text-on-tertiary-fixed-variant text-sm">
          <span className="font-bold">Market hours</span>
          <span>Runs share CPU with the live scanner. Best started after 15:30 IST.</span>
        </div>
      )}

      {notice && (
        <div role="alert" className="flex items-start gap-3 p-4 rounded-lg border border-border-subtle bg-surface shadow-md">
          <span className="material-symbols-outlined text-tertiary-container" aria-hidden="true">error</span>
          <div className="flex-1">
            <p className="font-bold text-text-primary">{notice.title}</p>
            <p className="text-sm text-on-surface-variant">{notice.text}</p>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="h-10 px-3 rounded-md border border-border-strong text-sm font-semibold">
            Close
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-error">Could not load the lab: {error}</p>}

      {gateScopeNote(done) && (
        <div role="status" className="px-4 py-3 rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed text-on-tertiary-fixed-variant text-sm font-semibold">
          {gateScopeNote(done)}
        </div>
      )}

      {historyEmpty && !backfilling ? (
        <EmptyHistory onBackfill={() => startBackfill([...SYMBOLS])} />
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="RULES PASSING GATE" value={`${passing} / 5`} note="must pass on both symbols" />
            <Stat
              label={`COIN TOSS MEDIAN (OOS, ${coinSym})`}
              value={signedR(coin(coinSym)?.out_of_sample?.netR)}
              tone={(coin(coinSym)?.out_of_sample?.netR ?? 0) >= 0 ? "pos" : "neg"}
              note="1:2, 1000 seeds, costs on"
            />
            <Stat
              label={`BUY & HOLD (OOS, ${coinSym})`}
              value={signedPct(bh(coinSym)?.out_of_sample?.returnPct)}
              tone={(bh(coinSym)?.out_of_sample?.returnPct ?? 0) >= 0 ? "pos" : "neg"}
              note={`max DD −${(bh(coinSym)?.out_of_sample?.maxDrawdownPct ?? 0).toFixed(1)} %, not gated`}
            />
            <Stat label="LAST RUN" value={running.length ? "running" : lastRun ? fmtDateTime(lastRun) : "never"} note={`definitions ${defs?.version ?? "v1"} · cost model v1`} />
          </section>

          {backfill && backfill.status !== "idle" && <BackfillPanel state={backfill} history={history} />}

          {(running.length > 0 || failures.length > 0) && <RunStatus active={running} failures={failures} nameOf={nameOf} onRetry={startRuns} />}

          {done.length === 0 && !running.length ? (
            <div className="rounded-lg border border-border-subtle bg-surface p-6 flex flex-col gap-3 max-w-md">
              <h2 className="font-bold">History ready, no runs yet</h2>
              <p className="text-sm text-text-secondary">Run every rule to fill the leaderboard.</p>
              <button type="button" onClick={() => startRuns([...ALL_RULE_IDS], [...SYMBOLS])} className="h-11 rounded-md bg-primary text-on-primary text-sm font-semibold">
                Run all rules
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-5 items-start">
              <section className="flex-[999_1_640px] min-w-0 rounded-lg border border-border-subtle bg-surface flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-border-subtle">
                  <h2 className="text-[15px] font-bold">Leaderboard · out of sample</h2>
                  <div role="group" aria-label="Symbol" className="flex bg-surface-high rounded-md p-0.5 gap-0.5">
                    {(["BOTH", "NIFTY", "SENSEX"] as SymFilter[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={sym === s}
                        onClick={() => setSym(s)}
                        className={`h-9 px-3 rounded text-xs font-semibold ${sym === s ? "bg-surface text-primary shadow-sm" : "text-text-secondary"}`}
                      >
                        {s === "BOTH" ? "Both" : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[760px]">
                    <thead>
                      <tr className="text-left text-text-secondary text-[11px] tracking-wider">
                        <th className="px-4 py-2.5 font-semibold">RULE</th>
                        <th className="px-2 py-2.5 font-semibold text-right">TRADES</th>
                        <th className="px-2 py-2.5 font-semibold text-right">WIN %</th>
                        <th className="px-2 py-2.5 font-semibold text-right">NET</th>
                        <th className="px-2 py-2.5 font-semibold text-right">PF</th>
                        <th className="px-2 py-2.5 font-semibold text-right">MAX DD</th>
                        <th className="px-2 py-2.5 font-semibold text-right">YEARS +</th>
                        <th className="px-4 py-2.5 font-semibold">GATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const v = view(r)
                        const isSel = sel?.id === r.id
                        return (
                          <tr key={r.id} className={`border-t border-surface-high ${isSel ? "bg-surface-container-low" : isBaseline(r.rule_id) ? "bg-surface-bright" : ""}`}>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => setSelected(r.id)} className="text-left flex flex-col gap-0.5 min-h-11 justify-center" aria-pressed={isSel}>
                                <span className="font-semibold">{nameOf(r.rule_id)}</span>
                                <span className="font-mono text-[11px] text-text-secondary">
                                  {r.rule_id} · {r.symbol}
                                </span>
                              </button>
                            </td>
                            <td className="px-2 py-3 text-right font-mono">{v.trades}</td>
                            <td className="px-2 py-3 text-right font-mono">{v.win}</td>
                            <td className={`px-2 py-3 text-right font-mono font-semibold ${v.netPos ? "text-secondary" : "text-error"}`}>{v.net}</td>
                            <td className="px-2 py-3 text-right font-mono">{v.pf}</td>
                            <td className="px-2 py-3 text-right font-mono">{v.dd}</td>
                            <td className="px-2 py-3 text-right font-mono">{yearsPositive(r)}</td>
                            <td className="px-4 py-3">
                              <GateBadge run={r} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-2 p-3">
                  {rows.map((r) => {
                    const v = view(r)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelected(r.id)}
                        className={`text-left rounded-lg border p-3 flex flex-col gap-2.5 ${sel?.id === r.id ? "border-primary bg-surface-container-low" : "border-border-subtle bg-surface"}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{nameOf(r.rule_id)}</div>
                            <div className="font-mono text-[11px] text-text-secondary">
                              {r.rule_id} · {r.symbol}
                            </div>
                          </div>
                          <GateBadge run={r} />
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-[13px]">
                          <Mini label="Net" value={v.net} tone={v.netPos ? "pos" : "neg"} />
                          <Mini label="PF" value={v.pf} />
                          <Mini label="Win" value={v.win} />
                          <Mini label="Trades" value={v.trades} />
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="px-4 py-3 text-xs text-text-secondary border-t border-border-subtle">
                  Select a row for its equity curve, years and trades. Baselines are references and never pass.
                </p>
              </section>

              <aside className="flex-[1_1_380px] min-w-0 flex flex-col gap-4">
                {sel && <Detail run={sel} name={nameOf(sel.rule_id)} defs={defs} onTrades={() => setDrawer(sel)} />}
                <TerminalPanel ruleId={sel?.rule_id ?? "UP_ORB"} />
                {sel && <DefinitionPanel text={defs?.rules[sel.rule_id]?.text} version={defs?.version} />}
              </aside>
            </div>
          )}
        </>
      )}

      {historyEmpty && !backfilling && <TerminalPanel ruleId="UP_ORB" />}
      {drawer && <TradesDrawer run={drawer} name={nameOf(drawer.rule_id)} onClose={() => setDrawer(null)} />}
    </div>
  )
}

function order(id: string) {
  const i = (ALL_RULE_IDS as readonly string[]).indexOf(id)
  return i < 0 ? 99 : i
}

function view(r: RunRow) {
  const o = r.out_of_sample
  if (o?.unavailable) return { trades: "0", win: "·", net: "·", netPos: true, pf: "·", dd: "·" }
  if (r.rule_id === "BASE_BUYHOLD") {
    return { trades: "1", win: "·", net: signedPct(o?.returnPct), netPos: (o?.returnPct ?? 0) >= 0, pf: "·", dd: `−${(o?.maxDrawdownPct ?? 0).toFixed(1)} %` }
  }
  return {
    trades: String(o?.trades ?? 0),
    win: pct(o?.winRate),
    net: signedR(o?.netR),
    netPos: (o?.netR ?? 0) > 0,
    pf: o?.profitFactor !== undefined ? o.profitFactor.toFixed(2) : "·",
    dd: `−${(o?.maxDrawdownR ?? 0).toFixed(1)} R`,
  }
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3.5 flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-semibold tracking-wider text-text-secondary">{label}</span>
      <span className={`font-mono text-2xl font-semibold ${tone === "pos" ? "text-secondary" : tone === "neg" ? "text-error" : "text-text-primary"}`}>{value}</span>
      <span className="text-xs text-text-secondary">{note}</span>
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-text-secondary">{label}</span>
      <span className={`font-mono font-semibold ${tone === "pos" ? "text-secondary" : tone === "neg" ? "text-error" : ""}`}>{value}</span>
    </div>
  )
}

/** Equity curve (net R by exit time, out of sample) and per year results. */
function Detail({ run, name, defs, onTrades }: { run: RunRow; name: string; defs: Definitions | null; onTrades: () => void }) {
  const o = run.out_of_sample
  const eq = React.useMemo(() => o?.equity ?? [], [o])
  const isBh = run.rule_id === "BASE_BUYHOLD"
  const points = React.useMemo(() => {
    if (eq.length < 2) return ""
    const lo = Math.min(0, ...eq)
    const hi = Math.max(0, ...eq)
    const span = hi - lo || 1
    return eq.map((v, i) => `${((i / (eq.length - 1)) * 360).toFixed(1)},${(130 - ((v - lo) / span) * 120).toFixed(1)}`).join(" ")
  }, [eq])
  const zeroY = React.useMemo(() => {
    if (eq.length < 2) return 70
    const lo = Math.min(0, ...eq)
    const hi = Math.max(0, ...eq)
    return 130 - ((0 - lo) / (hi - lo || 1)) * 120
  }, [eq])
  const years = Object.entries(o?.perYear ?? {}).sort(([a], [b]) => a.localeCompare(b))
  const gate = o?.gate
  const g = defs?.gate

  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col gap-3">
      <div className="flex justify-between items-baseline gap-2">
        <h2 className="text-[15px] font-bold">
          {name} <span className="font-mono text-xs text-text-secondary">{run.symbol}</span>
        </h2>
        <GateBadge run={run} />
      </div>
      {!isBh && (
        <>
          <span className="text-xs text-text-secondary">Out of sample equity in net R, ordered by exit time</span>
          {points ? (
            <svg viewBox="0 0 360 140" role="img" aria-label={`Equity curve for ${name}`} className="w-full h-[140px] block">
              <line x1="0" y1={zeroY} x2="360" y2={zeroY} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
              <polyline points={points} fill="none" stroke={isBaseline(run.rule_id) ? "var(--color-outline)" : "var(--color-primary)"} strokeWidth="2" />
            </svg>
          ) : (
            <p className="text-xs text-text-secondary">No out of sample trades.</p>
          )}
        </>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-text-secondary">
            <th className="py-1 font-semibold">Year (OOS)</th>
            {!isBh && <th className="py-1 font-semibold text-right">Trades</th>}
            <th className="py-1 font-semibold text-right">{isBh ? "Return" : "Net R"}</th>
            <th className="py-1 font-semibold text-right">Sample</th>
          </tr>
        </thead>
        <tbody>
          {years.map(([y, s]) => {
            const v = (isBh ? s.returnPct : s.netR) ?? 0
            return (
              <tr key={y} className="border-t border-surface-high font-mono">
                <td className="py-1.5">{y}</td>
                {!isBh && <td className="py-1.5 text-right">{s.trades}</td>}
                <td className={`py-1.5 text-right font-semibold ${v > 0 ? "text-secondary" : "text-error"}`}>{isBh ? signedPct(v) : signedR(v)}</td>
                <td className="py-1.5 text-right font-sans text-text-secondary">{s.full ? "full" : "partial"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {o?.unavailable && (
        <div className="text-xs text-on-tertiary-fixed-variant bg-tertiary-fixed rounded-md p-2.5">{o.reason}</div>
      )}
      {gate && !gate.ok && g && !o?.unavailable && (gate.reasons?.length ?? 0) > 0 && (
        <div className="text-xs text-on-surface-variant bg-surface-bright rounded-md p-2.5">
          <span className="font-semibold">Why it failed on {run.symbol}: </span>
          {gate.reasons?.join(" · ")}
        </div>
      )}
      {!isBaseline(run.rule_id) && !o?.unavailable && <LiveToggle ruleId={run.rule_id} symbol={run.symbol} />}
      {!isBh && (
        <button type="button" onClick={onTrades} className="h-11 rounded-md border border-border-strong text-sm font-semibold text-primary">
          View all trades
        </button>
      )}
    </section>
  )
}

const COMMANDS = (ruleId: string) => [
  ["1 · Backfill history (5m + 1d)", "npm run backtest -- --backfill NIFTY,SENSEX"],
  ["2 · Run all rules + baselines", "npm run backtest -- --run all --symbols NIFTY,SENSEX"],
  ["3 · One rule only", `npm run backtest -- --run ${ruleId} --symbols NIFTY,SENSEX`],
  ["4 · Start the app and open this page", "npm run start:dev  →  /dashboard/backtest"],
]

/** The "Run from terminal" panel from the design: copyable CLI commands, run from apps/backend. */
function TerminalPanel({ ruleId }: { ruleId: string }) {
  const [copied, setCopied] = React.useState<number | null>(null)
  return (
    <section className="rounded-lg bg-on-surface text-primary-fixed p-4 flex flex-col gap-3">
      <div className="flex justify-between items-baseline gap-2">
        <h2 className="text-[15px] font-bold text-surface">Run from terminal</h2>
        <span className="text-[11px] font-semibold tracking-wider text-primary-fixed-dim">apps/backend</span>
      </div>
      <p className="text-xs text-primary-fixed-dim">Run these in order. Each one fills one part of this page.</p>
      {COMMANDS(ruleId).map(([step, cmd], i) => (
        <div key={step} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-secondary-fixed">{step}</span>
          <div className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 py-1.5 pl-3 pr-1.5">
            <code className="flex-1 min-w-0 font-mono text-xs text-surface whitespace-nowrap overflow-x-auto">{cmd}</code>
            <button
              type="button"
              aria-label={`Copy command: ${step}`}
              onClick={() => {
                void navigator.clipboard?.writeText(cmd).catch(() => undefined)
                setCopied(i)
              }}
              className="shrink-0 h-9 px-2.5 rounded border border-white/15 text-xs font-semibold text-primary-fixed-dim"
            >
              {copied === i ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

function DefinitionPanel({ text, version }: { text?: string; version?: string }) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col gap-2.5">
      <div className="flex justify-between items-baseline">
        <h2 className="text-[15px] font-bold">Definitions {version ?? "v1"}</h2>
        <span className="text-[11px] font-semibold text-text-secondary">READ ONLY · LOCKED</span>
      </div>
      <p className="text-[13px] leading-relaxed text-on-surface-variant">{text ?? "…"}</p>
      <div className="flex flex-wrap gap-1.5">
        {["Exit 15:15 IST", "No entries after 14:45", "Same bar = stop", "Slip 1 pt / 3 pt"].map((c) => (
          <span key={c} className="font-mono text-[11px] px-2 py-1 rounded bg-surface-high">
            {c}
          </span>
        ))}
      </div>
    </section>
  )
}

function EmptyHistory({ onBackfill }: { onBackfill: () => void }) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-8 flex flex-col items-center text-center gap-3.5 max-w-lg mx-auto">
      <span className="material-symbols-outlined text-primary text-[44px]" aria-hidden="true">monitoring</span>
      <h2 className="text-base font-bold">No history yet</h2>
      <p className="text-sm text-text-secondary">Backfill NIFTY and SENSEX first. It fetches as far back as Angel One allows and can take a while.</p>
      <button type="button" onClick={onBackfill} className="h-11 px-4 rounded-md bg-primary text-on-primary text-sm font-semibold">
        Backfill history
      </button>
      <code className="font-mono text-[11px] text-on-surface-variant bg-surface-high px-2 py-1.5 rounded">npm run backtest -- --backfill NIFTY,SENSEX</code>
    </section>
  )
}

function BackfillPanel({ state, history }: { state: BackfillState; history: HistoryCounts | null }) {
  const series = Object.entries(state.series)
  const stored = history ? Object.values(history).reduce((a, h) => a + h.count, 0) : null
  const tag = state.status === "running" ? "RUNNING" : state.status === "failed" ? "FAILED" : "BASELINE"
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="text-base font-bold">{state.status === "running" ? "Backfilling history" : state.status === "failed" ? "Backfill failed" : "Backfill complete"}</h2>
          <p className="text-xs text-text-secondary">Angel One historical API · rate limited · resumes from the last stored candle</p>
        </div>
        <Badge kind={tag}>{state.status.toUpperCase()}</Badge>
      </div>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {series.map(([name, s]) => {
        const p = s.done ? 100 : s.chunks ? Math.round((s.chunk / s.chunks) * 100) : 0
        return (
          <div key={name} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">{name}</span>
              <span className="font-mono text-text-secondary">{s.done ? "done" : `chunk ${s.chunk} / ${s.chunks}`}</span>
            </div>
            <div role="progressbar" aria-label={name} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="h-2 bg-surface-high rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${s.done ? "bg-secondary" : "bg-primary"}`} style={{ width: `${p}%` }} />
            </div>
          </div>
        )
      })}
      <div className="grid grid-cols-3 gap-2">
        <Mini label="ROWS THIS RUN" value={state.rows.toLocaleString("en-IN")} />
        <Mini label="RETRIES" value={String(state.retries)} />
        <Mini label="CANDLES STORED" value={stored === null ? "·" : stored.toLocaleString("en-IN")} />
      </div>
      {state.log.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold min-h-11 flex items-center">Chunk log ({state.log.length})</summary>
          <ul className="max-h-60 overflow-auto text-xs font-mono">
            {state.log.map((l, i) => (
              <li key={i} className="flex gap-3 py-1.5 border-t border-surface-high">
                <span className="text-text-secondary shrink-0">{new Date(l.at).toLocaleTimeString("en-IN", { hour12: false })}</span>
                <span className="flex-1 min-w-0">{l.message}</span>
                <span className="font-sans text-[10px] font-bold uppercase">{l.type}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function RunStatus({
  active,
  failures,
  nameOf,
  onRetry,
}: {
  active: RunRow[]
  failures: RunRow[]
  nameOf: (id: string) => string
  onRetry: (ruleIds: string[], symbols: string[]) => void
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col gap-2">
      <h2 className="text-sm font-bold">Run status</h2>
      <ul className="flex flex-col gap-1.5">
        {active.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {nameOf(r.rule_id)} <span className="font-mono text-xs text-text-secondary">{r.symbol}</span>
            </span>
            <Badge kind={r.status === "running" ? "RUNNING" : "QUEUED"}>{r.status === "running" ? `RUNNING ${Math.round(Number(r.progress ?? 0))}%` : "QUEUED"}</Badge>
          </li>
        ))}
        {failures.slice(0, 5).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-error-container/40 rounded-md p-2">
            <span className="min-w-0">
              {nameOf(r.rule_id)} <span className="font-mono text-xs text-text-secondary">{r.symbol}</span>
              <span className="block font-mono text-xs text-on-error-container">{r.error}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge kind="FAILED" />
              <button type="button" onClick={() => onRetry([r.rule_id], [r.symbol])} className="h-9 px-3 rounded-md border border-error text-error text-xs font-semibold">
                Run again
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-secondary">FAIL means a rule missed the gate. FAILED means the run itself broke.</p>
    </section>
  )
}

