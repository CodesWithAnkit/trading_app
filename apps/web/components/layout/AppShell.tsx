"use client"
import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { BottomNav } from "./BottomNav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas font-body-sm text-text-primary antialiased min-h-screen w-full">
      <Topbar />
      <Sidebar />
      <div className="lg:pl-64">
        <main className="relative pt-24 min-h-screen bg-canvas">
          <div className="flex flex-col w-full">
            {/* System Status & Data Freshness Utility Strip */}
            <div className="w-full bg-surface-container-low px-gutter-md py-space-xs flex flex-wrap items-center justify-between gap-space-md text-text-secondary border-b border-border-subtle">
              <div className="flex items-center flex-wrap gap-space-lg">
                <div className="flex items-center gap-space-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-bullish animate-ping"></span>
                  <span className="font-label-code text-label-code uppercase tracking-wider font-semibold text-text-primary">
                    Live Feed:
                  </span>
                  <span className="font-label-code text-label-code text-status-live-text font-bold">
                    SmartAPI (3s ago)
                  </span>
                </div>
                <span className="text-border-strong text-body-xs">•</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[14px] text-text-secondary">newspaper</span>
                  <span className="font-label-code text-label-code uppercase tracking-wider">
                    News Ingestion:
                  </span>
                  <span className="font-label-code text-label-code text-text-primary font-medium">
                    2m ago (NSE/BSE Filings)
                  </span>
                </div>
                <span className="text-border-strong text-body-xs">•</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[14px] text-accent-bearish">update</span>
                  <span className="font-label-code text-label-code uppercase tracking-wider">
                    Inst. Disclosures:
                  </span>
                  <span className="font-label-code text-label-code text-accent-bearish font-medium">
                    Delayed EOD (Yesterday)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm bg-surface-container px-space-sm py-0.5 rounded">
                <span className="material-symbols-outlined text-[14px] text-accent-primary">policy</span>
                <span className="font-label-code text-label-code text-accent-primary font-semibold uppercase tracking-wider">
                  Manual Order Placement In Angel One Required
                </span>
              </div>
            </div>

            {/* Page Content */}
            <div className="w-full pb-24 lg:pb-8">
              {children}
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
