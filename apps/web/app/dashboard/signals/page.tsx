"use client"

import * as React from "react"
import { useSignals } from "@/lib/contexts/SignalContext"
import { SignalCard } from "@/components/domain/SignalCard"

export default function SignalsPage() {
  const { activeSignals, expiredSignals } = useSignals()
  const [activeTab, setActiveTab] = React.useState("all")

  const longSignals = activeSignals.filter(s => s.direction === "LONG")
  const shortSignals = activeSignals.filter(s => s.direction === "SHORT")

  const signalsToRender = activeTab === "long" ? longSignals : activeTab === "short" ? shortSignals : activeSignals

  return (
    <div className="px-space-md sm:px-space-xl py-space-md sm:py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Signals Directory
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Active and expired setups from the scanner
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Active Signals</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1 bg-surface-container p-1 rounded-lg text-body-sm">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded text-body-sm transition-all ${activeTab === 'all' ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              All ({activeSignals.length})
            </button>
            <button 
              onClick={() => setActiveTab("long")}
              className={`px-3 py-1 rounded text-body-sm transition-all flex items-center gap-1 ${activeTab === 'long' ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className="text-secondary font-bold">↑ Long</span> ({longSignals.length})
            </button>
            <button 
              onClick={() => setActiveTab("short")}
              className={`px-3 py-1 rounded text-body-sm transition-all flex items-center gap-1 ${activeTab === 'short' ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className="text-tertiary-container font-bold">↓ Short</span> ({shortSignals.length})
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md mt-space-xs">
          {signalsToRender.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
          {signalsToRender.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p>No active signals available for this filter.</p>
            </div>
          )}
        </div>
      </div>

      {expiredSignals.length > 0 && (
        <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-lg rounded-xl shadow-sm opacity-80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
            <div className="flex items-center gap-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">history</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Expired Signals</h2>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md mt-space-xs">
            {expiredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
