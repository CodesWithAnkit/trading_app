"use client"
import * as React from "react"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { Activity, TrendingUp, TrendingDown, Clock } from "lucide-react"

import Link from "next/link"
import { useSignals } from "@/lib/contexts/SignalContext"

export function MarketWatch() {
  const { instruments } = useDashboardState()
  const { activeSignals } = useSignals()

  return (
    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-primary w-5 h-5" />
          <h3 className="text-base font-bold text-text tracking-tight">Market Watch</h3>
        </div>
        <Link href="/dashboard/markets">
          <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">
            View All Markets →
          </span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {instruments.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-text-muted text-sm">
            No instruments tracked currently.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2 text-right">LTP</th>
                  <th className="py-2 px-2 text-right">Day Chg</th>
                  <th className="py-2 px-2 text-right hidden lg:table-cell">1m Chg</th>
                  <th className="py-2 px-2 text-right hidden lg:table-cell">5m Chg</th>
                  <th className="py-2 px-2 text-right hidden sm:table-cell">Volume</th>
                  <th className="py-2 px-2 text-right hidden sm:table-cell">RVOL</th>
                  <th className="py-2 px-2 text-center">Scanner</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {instruments.map(inst => {
                  const signal = activeSignals.find(s => s.symbol === inst.symbol)
                  return (
                    <tr key={inst.symbol} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="py-2 px-2 font-bold text-text">
                        <Link href={`/dashboard/markets/${inst.symbol}`} className="hover:text-primary">
                          {inst.symbol}
                        </Link>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">₹{inst.ltp.toFixed(2)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold ${inst.change1dPct >= 0 ? 'text-long' : 'text-short'}`}>
                        {inst.change1dPct > 0 ? '+' : ''}{inst.change1dPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted hidden lg:table-cell">-</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted hidden lg:table-cell">-</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted hidden sm:table-cell">{inst.volume.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted hidden sm:table-cell">-</td>
                      <td className="py-2 px-2 text-center">
                        {signal ? (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${signal.direction === 'LONG' ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
                            {signal.direction}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-muted text-text-muted border border-border">
                            Monitoring
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Link href={`/dashboard/markets/${inst.symbol}`}>
                          <button className="px-2 py-1 rounded bg-surface hover:bg-surface-muted border border-border text-xs font-medium text-text transition-colors">
                            View
                          </button>
                        </Link>
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
  )
}
