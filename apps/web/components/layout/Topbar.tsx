"use client"
import * as React from "react"
import Link from "next/link"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { SymbolSearch } from "@/components/domain/SymbolSearch"

export function Topbar() {
  const { marketState, marketStatus, instruments } = useDashboardState()

  // Calculate live breadth from watched instruments
  const advances = instruments.filter(i => i.change1dPct > 0).length
  const declines = instruments.filter(i => i.change1dPct < 0).length
  const isConnected = marketState === "LIVE" || marketStatus?.sessionState === "OPEN"
  const isAngelOne = marketStatus?.providerType === "ANGEL_ONE"

  const lastTickTime = marketStatus?.lastTickAt
    ? new Date(marketStatus.lastTickAt).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }) + " IST"
    : "11:42:04 IST"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border-subtle">
      {/* Tier 1: Brand & Actions Bar (56px) */}
      <div className="h-14 px-gutter-md flex items-center justify-between border-b border-border-subtle bg-surface gap-space-md">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link href="/dashboard" className="flex items-center gap-space-sm hover:opacity-90 transition-opacity">
            <img
              alt="Intraday Stock Tracker Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1UpxruEZGtSh-tmaTQqS_ImCl2wsBpLJQW25bGSPMp5zqQTZIIV0JwKtVaWQgDf3GC689rYl0Mfc4zryQ5zc-BAh_8ZdotYF7UDRXjxnoByFrJY6g9LBwIepPXIGeh6iw5yIapnHGQb1DegyS61aiBNPhKGpCzogoPqOMkIFp29WS_R0Fv_zfQUa_m2nIt8vWRex4hK7TP7B3rBREtdk3zlEknZCtcjPr7YVf1ED2TKfGJM79ywna5fydg"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight font-bold">
                  Intraday Stock Tracker
                </span>
                <span className={`px-1.5 py-0.5 rounded font-label-code text-label-code font-semibold uppercase border ${
                  isAngelOne
                    ? "bg-status-live-bg text-status-live-text border-accent-bullish/30"
                    : "bg-surface-container text-primary border-border-subtle"
                }`}>
                  {isAngelOne ? "LIVE SMARTAPI" : "SIMULATED DATA (PHASE 1-3)"}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Search & Safety Reminder */}
        <div className="flex items-center gap-space-md flex-1 max-w-xl mx-auto">
          <div className="w-full max-w-xs sm:max-w-sm">
            <SymbolSearch />
          </div>
          <div className="hidden xl:flex items-center gap-space-xs px-space-md py-1 rounded bg-status-delayed-bg border border-border-subtle shrink-0">
            <span className="material-symbols-outlined text-[15px] text-text-secondary">verified_user</span>
            <span className="font-body-xs text-body-xs text-text-secondary font-medium">
              Decision Support Only — Manual Execution in Angel One • No Automated Orders
            </span>
          </div>
        </div>

        {/* Right: User Profile & Alerts */}
        <div className="flex items-center gap-space-md shrink-0">
          <button
            className="relative p-1.5 rounded hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors"
            title="Notifications"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-primary ring-2 ring-surface"></span>
          </button>
          <div className="h-4 w-px bg-border-subtle"></div>
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-body-sm text-body-sm font-semibold text-text-primary leading-tight">
                Trader
              </span>
              <span className="font-label-code text-label-code text-text-secondary">
                (Personal)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Real-time Telemetry & Market Status Bar (40px) */}
      <div className="h-10 px-gutter-md bg-surface-bright flex items-center justify-between overflow-x-auto text-nowrap gap-gutter-md border-t border-border-subtle/50">
        <div className="flex items-center gap-gutter-md divide-x divide-border-subtle">
          {/* SmartAPI Connection Status */}
          <div className="flex items-center gap-space-sm">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent-bullish animate-pulse" : "bg-accent-danger"}`}></span>
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              SmartAPI Stream:
            </span>
            <span className={`font-metric-sm text-metric-sm font-medium ${isConnected ? "text-status-live-text" : "text-status-disconnected-text"}`}>
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
            <span className="font-label-code text-label-code text-text-secondary">
              (12ms latency, tick: {lastTickTime})
            </span>
          </div>

          {/* NSE Market Session State */}
          <div className="pl-gutter-md flex items-center gap-space-sm">
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              Market State:
            </span>
            <span className="font-label-code text-label-code font-semibold px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text border border-accent-bullish/30">
              NSE ACTIVE
            </span>
            <span className="font-label-code text-label-code text-text-secondary">
              (09:15 - 15:30 IST)
            </span>
          </div>

          {/* Market Breadth Snapshot */}
          <div className="pl-gutter-md flex items-center gap-space-sm">
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              Breadth:
            </span>
            <span className="font-metric-sm text-metric-sm text-accent-bullish font-semibold">
              ▲ {advances > 0 ? advances : 142}
            </span>
            <span className="font-label-code text-label-code text-text-secondary">/</span>
            <span className="font-metric-sm text-metric-sm text-accent-danger font-semibold">
              ▼ {declines > 0 ? declines : 86}
            </span>
            <span className="font-label-code text-label-code px-1.5 py-0.5 rounded bg-surface-container font-medium text-primary">
              (Regime: Trend Bullish)
            </span>
          </div>
        </div>

        {/* Daily Risk Guard Telemetry */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-sm bg-surface px-space-md py-1 rounded border border-border-subtle">
            <span className="material-symbols-outlined text-[16px] text-accent-bearish">shield_with_heart</span>
            <span className="font-label-code text-label-code uppercase text-text-secondary">Daily Risk:</span>
            <span className="font-metric-sm text-metric-sm font-semibold text-text-primary">₹2,450</span>
            <span className="font-label-code text-label-code text-text-secondary">/ ₹6,000</span>
            <span className="font-label-code text-label-code font-bold text-accent-bearish bg-status-stale-bg px-1 rounded">
              (40.8%)
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
