"use client"

import * as React from "react"
import { SignalCard } from "@/components/domain/SignalCard"
import { mockSignals } from "@/mock/signals"

export default function DashboardPage() {
  const activeSignals = mockSignals.filter(s => s.status === "ACTIVE" || s.status === "EXPIRING")

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      {/* Top Greeting & Realtime Feed Status Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Good morning, Ankit
            <span className="inline-flex items-center px-2 py-0.5 rounded text-label-caps font-label-caps bg-secondary-fixed text-on-secondary-fixed uppercase tracking-wider ml-2">Verified Plan</span>
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            <span className="">Tuesday, 24 Oct 2023</span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline"></span>
            <span className="">IST Market Session 09:15 – 15:30</span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline"></span>
            <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-medium">Session Elapsed: 2h 09m</span>
          </p>
        </div>

        {/* Data Freshness & State Switcher Cockpit */}
        <div className="flex items-center gap-space-sm bg-surface-container-lowest p-1.5 rounded-xl shadow-sm border-0">
          <div className="flex items-center gap-2 px-space-md py-1.5 rounded-lg bg-surface-container-low" id="status-badge-container">
            <span className="relative flex h-2.5 w-2.5" id="pulse-dot">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            <span className="font-body-sm text-body-sm font-semibold text-on-surface" id="status-label-text">Market status: SIMULATED</span>
            <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant" id="status-meta">· Market data is simulated · Updated 2s ago</span>
          </div>
          
          <div className="flex items-center gap-1 bg-surface-container-high/60 p-1 rounded-lg" id="feed-switcher">
            <button className="px-space-sm py-1 rounded text-label-caps font-label-caps tracking-wider uppercase transition-all bg-surface-container-lowest text-primary shadow-sm font-semibold" type="button">Simulated</button>
            <button className="px-space-sm py-1 rounded text-label-caps font-label-caps tracking-wider uppercase transition-all text-on-surface-variant hover:text-on-surface" type="button">Delayed</button>
            <button className="px-space-sm py-1 rounded text-label-caps font-label-caps tracking-wider uppercase transition-all text-on-surface-variant hover:text-on-surface" type="button">Disconnected</button>
          </div>
        </div>
      </div>

      {/* 4 Key Metric Cards (Clinical High-Density Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Metric 1: Today's Net P&L */}
        <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-secondary-fixed/20 pointer-events-none blur-xl"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">TODAY'S NET P&L</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant/80 mt-0.5">Calculated from manual journal records · Not broker-confirmed</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold uppercase tracking-wide">
              ↑ Profitable (3 closed)
            </span>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-label-numeric-lg text-[1.75rem] font-bold text-secondary tracking-tight">₹+18,450.00</span>
          </div>
        </div>

        {/* Metric 2: Active Signals */}
        <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">ACTIVE SIGNALS</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant/80 mt-0.5">4 Long · 2 Short</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps font-bold uppercase tracking-wide flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">schedule</span> 2 Expiring &lt; 15m
            </span>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-label-numeric-lg text-[1.75rem] font-bold text-on-surface tracking-tight">6</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Valid Setups</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-7 rounded-full bg-secondary"></span>
              <span className="h-2 w-7 rounded-full bg-secondary"></span>
              <span className="h-2 w-4 rounded-full bg-tertiary-container"></span>
            </div>
          </div>
        </div>

        {/* Metric 3: Open Trades */}
        <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">OPEN TRADES (JOURNALED)</span>
              <span className="font-body-sm text-body-sm text-secondary font-medium mt-0.5">Stop-loss safely placed</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-caps text-label-caps font-bold uppercase tracking-wide">
              2 Running
            </span>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="font-label-numeric-lg text-[1.75rem] font-bold text-secondary tracking-tight">₹+6,820.00</span>
            </div>
            <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant uppercase tracking-wider font-semibold">Unrealized P&L</span>
          </div>
        </div>

        {/* Metric 4: Win Rate */}
        <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">SESSION WIN RATE</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant/80 mt-0.5">5 Wins / 2 Losses today</span>
            </div>
            <span className="font-label-numeric-sm text-label-numeric-sm px-2 py-0.5 rounded bg-surface-container font-semibold text-primary">
              Avg R:R 1:2.4
            </span>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-label-numeric-lg text-[1.75rem] font-bold text-on-surface tracking-tight">71.4%</span>
            <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden flex">
              <div className="bg-secondary h-full" style={{ width: '71.4%' }}></div>
              <div className="bg-error h-full" style={{ width: '28.6%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Active High-Probability Signals Module */}
      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Active Signals</h2>
            </div>
            <span className="text-label-caps font-label-caps uppercase px-2 py-0.5 bg-surface-container-high rounded text-on-surface-variant font-bold">Rule version 3.2</span>
          </div>
          
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg text-body-sm">
            <button className="px-3 py-1 rounded text-body-sm font-semibold bg-surface-container-lowest text-primary shadow-xs transition-all">All (6)</button>
            <button className="px-3 py-1 rounded text-body-sm text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1">
              <span className="text-secondary font-bold">↑ Long</span> (4)
            </button>
            <button className="px-3 py-1 rounded text-body-sm text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1">
              <span className="text-tertiary-container font-bold">↓ Short</span> (2)
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md mt-space-xs">
          {activeSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      </div>

      {/* Dual Layout: Open Trades Matrix & Today's IST Journal Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg items-start">
        {/* Open Trades Execution Monitor */}
        <div className="xl:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">stacked_line_chart</span>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Open Journaled Trades (2)</h2>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">Manual Journal</span>
              </div>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Manual journal entries · User executed externally</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l">SYMBOL & SETUP</th>
                  <th className="py-2.5 px-2 text-center">BIAS</th>
                  <th className="py-2.5 px-3 text-right">QTY</th>
                  <th className="py-2.5 px-3 text-right">AVG ENTRY</th>
                  <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                  <th className="py-2.5 px-3">TRAILED STOP</th>
                  <th className="py-2.5 px-3">TARGET (T1/T2)</th>
                  <th className="py-2.5 px-3 text-right">UNREALIZED P&L</th>
                  <th className="py-2.5 px-3 text-right rounded-r">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y-0 text-body-sm">
                <tr className="hover:bg-surface-container-low/70 transition-colors group">
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md font-bold text-on-surface">HDFCBANK</span>
                      <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">NSE Cash · 5m ORB</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold">↑ Long</span>
                  </td>
                  <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md text-on-surface">300</td>
                  <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md text-on-surface-variant">₹1,520.00</td>
                  <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">₹1,534.20</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-label-numeric-sm text-label-numeric-sm text-error font-medium">SL: ₹1,508.00</span>
                      <span className="font-label-caps text-label-caps text-secondary font-semibold">Trailing +₹12 locked</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-medium">T1: ₹1,545.00</span>
                      <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">T2: ₹1,560.00</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-label-numeric-md text-label-numeric-md font-bold text-secondary">+₹4,260.00</span>
                      <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-semibold">+0.93%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="h-9 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors">Edit</button>
                      <button className="h-9 px-2.5 rounded bg-error-container text-error hover:bg-error hover:text-on-error font-body-sm font-semibold transition-colors">Journal / Exit</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant text-body-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
              <span className="">Configured Daily Risk Limit: [User Configured] · Personal decision-support and manual trade journal only. Does not place, modify, or cancel broker orders.</span>
            </div>
            <span className="font-label-numeric-sm text-label-numeric-sm">Market-close reminder: 15:15 IST</span>
          </div>
        </div>

        {/* Recent Journal Activity Timeline Widget */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Today's Trade Log</h3>
            </div>
            <a className="font-label-caps text-label-caps uppercase text-primary font-bold hover:underline" href="#">Full Journal</a>
          </div>
          
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
            <div className="relative group">
              <div className="absolute left-[-1.65rem] top-1 h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest"></div>
              <div className="flex flex-col">
                <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">10:42 AM IST</span>
                <span className="font-body-md text-body-md font-semibold text-on-surface">Entered HDFCBANK @ ₹1,520.00</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">300 Shares · 5-min ORB setup confirmed</p>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute left-[-1.65rem] top-1 h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest"></div>
              <div className="flex flex-col">
                <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">10:15 AM IST</span>
                <span className="font-body-md text-body-md font-semibold text-on-surface">Entered ICICIBANK @ ₹942.00</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">250 Shares · Pullback to VWAP tested</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute left-[-1.65rem] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-surface-container-lowest"></div>
              <div className="flex flex-col">
                <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">09:55 AM IST</span>
                <span className="font-body-md text-body-md font-semibold text-on-surface">Exited SBIN Target 2 @ ₹582.40</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">100 Shares · +₹1,240.00 P&L Locked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
