"use client"

import * as React from "react"
import { MetricCard } from "@/components/domain/MetricCard"

export default function PerformancePage() {
  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Performance Analytics
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Key metrics and historical trading performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <MetricCard 
          title="TOTAL RETURN" 
          value="+₹14,500.00"
          highlightColor="secondary"
        />
        <MetricCard 
          title="PROFIT FACTOR" 
          value="2.4" 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="WIN RATE (ALL TIME)" 
          value="64.2%" 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="MAX DRAWDOWN" 
          value="-4.1%" 
          highlightColor="on-surface"
        />
      </div>

      <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col gap-space-md min-h-[400px]">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">monitoring</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Equity Curve</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-lg bg-surface-container/30">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[48px] opacity-50">show_chart</span>
            <p className="font-body-md">Performance chart visualization will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
