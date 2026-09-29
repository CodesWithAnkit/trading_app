"use client"
import * as React from "react"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { MarketStatusBadge } from "@/components/domain/MarketStatusBadge"

export function Topbar() {

  return (
    <header className="fixed top-0 left-0 lg:left-[248px] right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/40 z-40 px-space-lg flex items-center justify-between gap-space-md shrink-0">
      <div className="flex items-center gap-space-md min-w-0">
        <MarketStatusBadge />
        <div className="relative w-72 lg:w-96">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full h-8 pl-8 pr-10 rounded bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            placeholder="Search NSE cash (e.g. RELIANCE, HDFCBANK)..."
            type="text"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-label-numeric-sm text-on-surface-variant bg-surface-container border border-outline-variant/40 rounded">
            ⌘K
          </kbd>
        </div>
      </div>
      <div className="flex items-center gap-space-md shrink-0">
        <button className="relative p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest"></span>
        </button>
        <div className="h-4 w-px bg-outline-variant/40"></div>
        <div className="flex items-center gap-space-sm">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40"
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=trader"
          />
          <div className="flex flex-col text-left leading-tight hidden sm:flex">
            <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
              Ankit Sharma
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Intraday Equity
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
