"use client"
import * as React from "react"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { Search, Bell } from "lucide-react"

export function Topbar() {
  const { marketState, updatedAt } = useDashboardState()
  
  // parse updated at to time string
  const timeString = new Date(updatedAt).toLocaleTimeString('en-US', { hour12: false })

  return (
    <header className="h-16 bg-surface border-b border-border z-40 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-info-soft border border-info">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
          </span>
          <span className="text-label text-info font-bold uppercase tracking-wider">
            {marketState}
          </span>
          <span className="text-label text-text border-l border-border pl-2">
            IST {timeString}
          </span>
          <span className="text-label text-text-muted">
            · Market data is {marketState.toLowerCase()}
          </span>
        </div>
        <div className="relative w-72 lg:w-96 hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            className="w-full h-8 pl-8 pr-8 rounded bg-canvas border border-border text-body text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            placeholder="Search NSE cash (e.g. RELIANCE, HDFCBANK)..."
            type="text"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-surface border border-border rounded">
            ⌘K
          </kbd>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button className="relative p-1.5 rounded-lg text-text-muted hover:bg-canvas hover:text-text transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-risk ring-2 ring-surface"></span>
        </button>
        <div className="h-4 w-px bg-border"></div>
        <div className="flex items-center gap-3">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-border"
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=trader"
          />
          <div className="flex flex-col text-left leading-tight hidden sm:flex">
            <span className="text-body font-semibold text-text truncate">
              Ankit Sharma
            </span>
            <span className="text-[10px] font-bold text-text-muted uppercase">
              Intraday Equity
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
