"use client"
import * as React from "react"
import Link from "next/link"
import { SignalCard } from "@/components/domain/SignalCard"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { AlertTriangle, Inbox, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink } from "lucide-react"
import { ApproachingCard } from "@/components/domain/ApproachingCard"
import { MomentumLeaders } from "@/components/domain/MomentumLeaders"
import { OutcomesComparison } from "@/components/domain/OutcomesComparison"
import { isAfterMarketHours, isBeforeMarketOpen } from "@/lib/scanner-types"
import { ClosedPlans } from "@/components/domain/ClosedPlans"
import { MarketRegimeStrip } from "@/components/domain/MarketRegimeStrip"
import { RiskCapitalGuard } from "@/components/domain/RiskCapitalGuard"

export default function DashboardPage() {
  const { activeSignals, closedSignals, approachingSignals, momentum, watchingCount, streamStatus, hydrated } = useSignals()
  const { openTrades } = useTrades()
  const { marketState, instruments } = useDashboardState()
  const watching = watchingCount || instruments.length

  const [filterDirection, setFilterDirection] = React.useState<"ALL" | "LONG" | "SHORT">("ALL")
  const [afterHours, setAfterHours] = React.useState(false)
  const [beforeOpen, setBeforeOpen] = React.useState(false)

  React.useEffect(() => {
    const check = () => {
      setAfterHours(isAfterMarketHours())
      setBeforeOpen(isBeforeMarketOpen())
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  const longSignalsCount = activeSignals.filter(s => s.direction === "LONG").length
  const shortSignalsCount = activeSignals.filter(s => s.direction === "SHORT").length

  const filteredSignals = activeSignals.filter(s => {
    if (filterDirection === "LONG") return s.direction === "LONG"
    if (filterDirection === "SHORT") return s.direction === "SHORT"
    return true
  })

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* TOP SECTION: Market Regime & Capital Discipline Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        <div className="xl:col-span-7">
          <MarketRegimeStrip />
        </div>
        <div className="xl:col-span-5">
          <RiskCapitalGuard />
        </div>
      </div>

      {/* NOTIFICATION & CORPORATE EVENT BANNER */}
      <div className="w-full bg-surface-container rounded-lg p-space-sm shadow-sm flex items-center justify-between gap-space-md border border-border-subtle">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="px-space-xs py-0.5 rounded bg-accent-primary text-on-primary font-label-code text-label-code font-bold uppercase tracking-wider shrink-0">
            NSE FILING
          </span>
          <div className="flex items-center gap-space-xs truncate text-body-sm font-body-sm text-text-primary">
            <span className="font-bold">RELIANCE</span>
            <span className="text-text-secondary">—</span>
            <span className="truncate">Board Meeting Scheduled on Oct 24 for Financial Results.</span>
            <span className="font-label-code text-label-code text-text-secondary shrink-0 hidden sm:inline">(Filing 11:30 IST • Ingested 11:32 IST)</span>
          </div>
        </div>
        <Link
          href="/dashboard/news"
          className="flex items-center gap-space-xs shrink-0 font-label-code text-label-code text-accent-primary font-semibold hover:underline"
        >
          <span>Details</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Disconnected / Delayed States Warning Banner */}
      {(marketState === 'DELAYED' || marketState === 'DISCONNECTED') && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${marketState === 'DELAYED' ? 'bg-status-stale-bg border-accent-bearish/30 text-status-stale-text' : 'bg-status-disconnected-bg border-accent-danger/30 text-status-disconnected-text'}`}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              {marketState === 'DELAYED' ? 'Market Data Feed is Delayed' : 'Data Feed Disconnected'}
            </span>
            <span className="text-sm opacity-90 mt-0.5">
              {marketState === 'DELAYED'
                ? 'Quotes are running 15 minutes behind. Scanner is paused. Do not use for live trading decisions until feed catches up.'
                : 'Connection to the quotes server has dropped. The scanner is halted. Attempting to reconnect...'}
            </span>
          </div>
        </div>
      )}

      {/* MAIN DECISION AREA: ACTIVE SIGNALS QUEUE */}
      <div className="flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-primary"></div>
            <h2 className="font-headline-md text-headline-md text-text-primary">Active Priority Intraday Signals</h2>
            <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-code text-label-code font-bold">
              {activeSignals.length} Qualified
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-border-subtle">
              <button
                type="button"
                onClick={() => setFilterDirection("ALL")}
                className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                  filterDirection === "ALL" ? "bg-surface text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                All ({activeSignals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterDirection("LONG")}
                className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                  filterDirection === "LONG" ? "bg-surface text-accent-bullish shadow-xs" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Long ({longSignalsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterDirection("SHORT")}
                className={`px-2.5 py-1 rounded font-label-code text-label-code font-semibold transition-colors ${
                  filterDirection === "SHORT" ? "bg-surface text-accent-danger shadow-xs" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Short ({shortSignalsCount})
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 font-label-code text-label-code text-primary bg-surface shadow-xs px-space-md py-1 rounded font-semibold hover:bg-surface-container transition-colors border border-border-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-scan Universe
            </button>
          </div>
        </div>

        {/* Signals Grid */}
        {filteredSignals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-surface rounded-xl border border-border-subtle p-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 border border-border-subtle">
              <Inbox className="w-8 h-8 text-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              {!hydrated ? "Connecting to scanner…" : afterHours ? "Market is closed" : beforeOpen ? "Waiting for the market to open" : watching === 0 ? "Scanner is connecting" : "No active signals"}
            </h3>
            <p className="text-sm text-text-secondary max-w-md mt-1">
              {afterHours
                ? "The session ended at 15:30 IST. See how today's calls played out below; the scanner resumes at 09:15."
                : watching === 0
                ? "The scanner streams every F&O stock from 09:15 IST and only lets the top 20 gainers raise signals. Signals appear here as soon as a strategy triggers."
                : `Scanner is watching ${watching} stocks. No strategy has triggered yet${approachingSignals.length > 0 ? `, but ${approachingSignals.length} ${approachingSignals.length === 1 ? "is" : "are"} approaching a trigger below` : ""}.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filteredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
        <ClosedPlans signals={closedSignals} />
      </div>

      {/* Approaching setups + momentum leaders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 flex flex-col gap-4 bg-surface p-6 rounded-xl border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary tracking-tight">Approaching Setups ({approachingSignals.length})</h2>
            </div>
            <span className="font-label-code text-label-code text-text-secondary flex items-center gap-1.5" data-testid="stream-status">
              <span className={`w-2 h-2 rounded-full ${streamStatus === "live" ? "bg-accent-bullish animate-pulse" : "bg-outline"}`} />
              {streamStatus === "live" ? "Live stream" : streamStatus === "reconnecting" ? "Reconnecting" : "Connecting"}
            </span>
          </div>
          {approachingSignals.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center font-body-sm">
              No stock is within 1% of a strategy trigger right now. Checked on every 5-minute candle close.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approachingSignals.map(setup => <ApproachingCard key={setup.symbol} setup={setup} />)}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2 bg-surface p-6 rounded-xl border border-border-subtle shadow-sm">
          <div className="flex flex-col gap-1 border-b border-border-subtle pb-4 mb-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-accent-bearish text-[22px]">local_fire_department</span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary tracking-tight">Momentum Leaders</h2>
            </div>
            <span className="text-xs text-text-secondary font-body-xs">% change × relative volume × 5m trend</span>
          </div>
          {momentum.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center font-body-sm">
              {watching === 0 ? (beforeOpen ? "Rankings start when the market opens at 09:15 IST." : "Waiting for the first ticks from the feed.") : `Watching ${watching} stocks. Rankings update on each 5-minute close.`}
            </p>
          ) : (
            <MomentumLeaders stocks={momentum} />
          )}
        </section>
      </div>

      {/* After hours: prediction vs actual */}
      {afterHours && <OutcomesComparison />}

      {/* ACTIVE MANUALLY LOGGED TRADES (TRACKER IN-PROGRESS) */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-accent-bullish">timeline</span>
            <h2 className="font-headline-md text-headline-md text-text-primary">Open Positions Under Surveillance</h2>
            <span className="px-space-xs py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
              {openTrades.length} Active
            </span>
          </div>
          <div className="flex items-center gap-space-sm font-label-code text-label-code text-text-secondary">
            <span className="hidden sm:inline">Execution Protocol:</span>
            <span className="font-semibold text-text-primary">Exits must be mirrored in Angel One terminal</span>
          </div>
        </div>

        {/* Modern Card Table Architecture */}
        <div className="bg-surface rounded-xl shadow-sm border border-border-subtle overflow-hidden">
          {openTrades.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-text-secondary text-sm">No open positions currently under surveillance.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-text-secondary font-label-code text-label-code uppercase tracking-wider">
                    <th className="py-space-sm px-space-md font-semibold">Instrument & Direction</th>
                    <th className="py-space-sm px-space-md font-semibold">Execution Details</th>
                    <th className="py-space-sm px-space-md font-semibold">Current LTP</th>
                    <th className="py-space-sm px-space-md font-semibold">Unrealized P&L</th>
                    <th className="py-space-sm px-space-md font-semibold">Stop Loss / Trailing</th>
                    <th className="py-space-sm px-space-md font-semibold">Lifecycle Status</th>
                    <th className="py-space-sm px-space-md font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm">
                  {openTrades.map(trade => {
                    const isLong = trade.direction === "LONG"
                    const currentLtp = trade.entryPrice * (isLong ? 1.008 : 0.992)
                    const pnlAmount = (currentLtp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1)
                    const pnlPct = ((currentLtp - trade.entryPrice) / trade.entryPrice) * 100 * (isLong ? 1 : -1)
                    const isProfitable = pnlAmount >= 0

                    return (
                      <tr key={trade.id} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-space-sm px-space-md">
                          <div className="flex items-center gap-space-sm">
                            <span className={`px-1.5 py-0.5 rounded font-label-code text-label-code font-bold ${
                              isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
                            }`}>
                              {isLong ? "▲ LONG" : "▼ SHORT"}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-headline-sm font-bold text-text-primary">{trade.symbol}</span>
                              <span className="font-label-code text-label-code text-text-secondary">NSE Cash</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <div className="flex flex-col font-label-code text-label-code">
                            <span className="text-text-primary font-semibold">₹{trade.entryPrice.toFixed(2)} (Qty: {trade.quantity})</span>
                            <span className="text-text-secondary">Manual Journal</span>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <span className="font-metric-md text-metric-md font-bold text-text-primary">₹{currentLtp.toFixed(2)}</span>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <div className="flex flex-col">
                            <span className={`font-metric-md text-metric-md font-bold ${isProfitable ? "text-accent-bullish" : "text-accent-danger"}`}>
                              {isProfitable ? "+" : ""}₹{pnlAmount.toFixed(2)}
                            </span>
                            <span className={`font-label-code text-label-code font-semibold ${isProfitable ? "text-accent-bullish" : "text-accent-danger"}`}>
                              {isProfitable ? "+" : ""}{pnlPct.toFixed(2)}% on capital
                            </span>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <div className="flex flex-col font-label-code text-label-code">
                            <span className="text-status-live-text font-bold">
                              ₹{(trade.direction === 'LONG' ? trade.entryPrice * 0.99 : trade.entryPrice * 1.01).toFixed(2)}
                            </span>
                            <span className="text-text-secondary">(Active Stop Loss)</span>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-md">
                          <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-code text-label-code font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish animate-pulse"></span>
                            Under Surveillance
                          </span>
                        </td>
                        <td className="py-space-sm px-space-md text-right">
                          <div className="inline-flex items-center gap-space-xs">
                            <button className="h-7 px-2.5 rounded bg-surface shadow-xs font-body-xs text-body-xs font-semibold text-text-primary hover:bg-surface-high transition-colors border border-border-subtle">
                              Adjust SL
                            </button>
                            <button className="h-7 px-2.5 rounded bg-error-container text-on-error-container font-body-xs text-body-xs font-semibold hover:bg-opacity-90 transition-colors">
                              Exit Trade
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
