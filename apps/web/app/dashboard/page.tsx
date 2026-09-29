"use client"
import * as React from "react"
import { SignalCard } from "@/components/domain/SignalCard"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { ShieldCheck, Radar, TrendingUp, History, AlertTriangle, Inbox, Edit, ArrowUpRight, ArrowDownRight, BadgeInfo, Signal, CheckCircle2, ChevronRight } from "lucide-react"

export default function DashboardPage() {
  const { activeSignals } = useSignals()
  const { openTrades } = useTrades()
  const { marketState, setMarketState } = useDashboardState()

  const longSignalsCount = activeSignals.filter(s => s.direction === "LONG").length
  const shortSignalsCount = activeSignals.filter(s => s.direction === "SHORT").length

  return (
    <div className="px-space-md sm:px-space-xl py-space-md sm:py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      {/* Top Greeting & State Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-text flex items-center gap-2 tracking-tight">
            Good morning, Ankit
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-surface uppercase tracking-wider ml-1">
              Verified Plan
            </span>
          </h1>
          <p className="text-sm text-text-muted flex items-center gap-2 mt-1">
            <span>Tuesday, 24 Oct 2023</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span>IST Market Session 09:15 – 15:30</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span className="font-mono text-xs font-semibold text-primary">Session Elapsed: 2h 09m</span>
          </p>
        </div>
      </div>

      {/* Disconnected / Delayed States Warning Banner */}
      {(marketState === 'DELAYED' || marketState === 'DISCONNECTED') && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${marketState === 'DELAYED' ? 'bg-warning-soft border-warning/30' : 'bg-risk-soft border-risk/30'}`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 ${marketState === 'DELAYED' ? 'text-warning' : 'text-risk'}`} />
            <div className="flex flex-col">
              <span className={`text-sm font-bold ${marketState === 'DELAYED' ? 'text-warning' : 'text-risk'}`}>
                {marketState === 'DELAYED' ? 'Market Data Feed is Delayed' : 'Data Feed Disconnected'}
              </span>
              <span className="text-sm text-text-muted mt-0.5">
                {marketState === 'DELAYED'
                  ? 'Quotes are running 15 minutes behind. Scanner is paused. Do not use for live trading decisions until feed catches up.'
                  : 'Connection to the quotes server has dropped. The scanner is halted. Attempting to reconnect...'}
              </span>
            </div>
          </div>
        )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Today&apos;s Net P&L</span>
            <span className="text-xs text-text-muted mt-1 truncate">Calculated from manual journal</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-long tracking-tight">₹+18,450.00</span>
            <span className="text-[10px] uppercase font-bold text-long bg-long-soft px-1.5 py-0.5 rounded">
              3 closed
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Active Signals</span>
            <span className="text-xs text-text-muted mt-1 truncate">{longSignalsCount} Long · {shortSignalsCount} Short</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-text tracking-tight">{activeSignals.length}</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-6 rounded-full bg-long"></span>
              <span className="h-1.5 w-4 rounded-full bg-short"></span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Open Trades</span>
            <span className="text-xs text-primary font-medium mt-1 truncate">Risk safely placed</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-long tracking-tight">₹+6,820.00</span>
            <span className="text-[10px] uppercase font-bold text-text-muted">
              Unrealized
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase text-text-muted font-bold tracking-wider">Session Win Rate</span>
            <span className="text-xs text-text-muted mt-1 truncate">5 Wins / 2 Losses</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-text tracking-tight">71.4%</span>
            <span className="text-[10px] uppercase font-bold text-primary bg-surface-muted px-1.5 py-0.5 rounded border border-border">
              Avg R:R 1:2.4
            </span>
          </div>
        </div>
      </div>

      {/* Active Signals Section */}
      <div className="flex flex-col gap-4 bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Radar className="text-primary w-6 h-6" />
            <h2 className="text-lg font-bold text-text tracking-tight">Active Signals</h2>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-surface-muted rounded border border-border text-text-muted font-bold ml-2 hidden sm:inline-block">
              Rule version 3.2
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-md text-sm border border-border">
            <button className="px-3 py-1 rounded font-semibold bg-surface text-text shadow-sm">All ({activeSignals.length})</button>
            <button className="px-3 py-1 rounded text-text-muted hover:text-text font-medium">Long ({longSignalsCount})</button>
            <button className="px-3 py-1 rounded text-text-muted hover:text-text font-medium">Short ({shortSignalsCount})</button>
          </div>
        </div>

        {activeSignals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4 border border-border">
              <Inbox className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text">No active signals</h3>
            <p className="text-sm text-text-muted max-w-md mt-1">
              The scanner is monitoring the market but no setups have met your criteria yet. Wait for the next scan cycle or adjust your parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {/* Trades & Journal Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Open Trades Matrix */}
        <div className="xl:col-span-2 bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-primary w-6 h-6" />
              <h2 className="text-lg font-bold text-text tracking-tight">Open Journaled Trades ({openTrades.length})</h2>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-surface-muted border border-border text-text-muted font-bold hidden sm:inline-block">
                Manual Journal
              </span>
            </div>
          </div>

          {openTrades.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <span className="text-text-muted text-sm">No open trades currently journaled.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-muted text-[10px] uppercase tracking-wider font-bold">
                    <th className="py-3 px-2">Symbol</th>
                    <th className="py-3 px-2 text-center">Bias</th>
                    <th className="py-3 px-2 text-right">Qty</th>
                    <th className="py-3 px-2 text-right">Avg Entry</th>
                    <th className="py-3 px-2 text-right">LTP</th>
                    <th className="py-3 px-2">Risk/Target</th>
                    <th className="py-3 px-2 text-right">Unrealized</th>
                    <th className="py-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {openTrades.map(trade => (
                    <tr key={trade.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-text">{trade.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${trade.direction === 'LONG' ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-medium text-text">{trade.quantity}</td>
                      <td className="py-3 px-2 text-right font-mono text-text-muted">₹{trade.entryPrice.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-text">₹{(trade.entryPrice * 1.01).toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1 text-[11px] font-mono">
                          {(() => {
                            const linkedSignal = activeSignals.find(s => s.id === trade.signalId)
                            const stopPrice = linkedSignal ? linkedSignal.stop : (trade.direction === 'LONG' ? trade.entryPrice * 0.99 : trade.entryPrice * 1.01)
                            const t1Price = linkedSignal ? linkedSignal.targets.t1 : (trade.direction === 'LONG' ? trade.entryPrice * 1.02 : trade.entryPrice * 0.98)

                            return (
                              <>
                                <span className="text-risk font-medium">SL: ₹{stopPrice.toFixed(2)}</span>
                                <span className="text-text-muted">T1: ₹{t1Price.toFixed(2)}</span>
                              </>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-long">+₹{(trade.entryPrice * 0.01 * trade.quantity).toFixed(2)}</span>
                          <span className="font-mono text-[10px] text-long font-semibold">+1.00%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button className="px-3 py-1.5 rounded-md bg-surface border border-border hover:bg-surface-muted text-text font-medium text-xs transition-colors flex items-center gap-1 ml-auto">
                          <Edit className="w-3 h-3" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Timeline Widget */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <History className="text-primary w-5 h-5" />
              <h3 className="text-base font-bold text-text tracking-tight">Today&apos;s Trade Log</h3>
            </div>
            <a className="text-[10px] uppercase text-primary font-bold hover:underline" href="/dashboard/journal">Full Journal</a>
          </div>

          <div className="relative pl-5 space-y-5 before:absolute before:left-1.75 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            <div className="relative">
              <div className="absolute left-[-1.25rem] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-surface"></div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-text-muted mb-0.5">10:42 AM IST</span>
                <span className="text-sm font-semibold text-text">Entered HDFCBANK @ ₹1,520.00</span>
                <p className="text-xs text-text-muted mt-0.5">300 Shares · 5-min ORB setup</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-[-1.25rem] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-surface"></div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-text-muted mb-0.5">10:15 AM IST</span>
                <span className="text-sm font-semibold text-text">Entered ICICIBANK @ ₹942.00</span>
                <p className="text-xs text-text-muted mt-0.5">250 Shares · Pullback to VWAP</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-[-1.25rem] top-1.5 w-2 h-2 rounded-full bg-long ring-4 ring-surface"></div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-text-muted mb-0.5">09:55 AM IST</span>
                <span className="text-sm font-semibold text-text">Exited SBIN Target 2 @ ₹582.40</span>
                <p className="text-xs text-text-muted mt-0.5">100 Shares · +₹1,240.00 P&L Locked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      )
}
