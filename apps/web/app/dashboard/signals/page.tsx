"use client"

import * as React from "react"
import { useSignals } from "@/lib/contexts/SignalContext"
import { SignalCard } from "@/components/domain/SignalCard"
import { Bell, Inbox } from "lucide-react"

export default function SignalsPage() {
  const { activeSignals, expiredSignals } = useSignals()
  const [activeTab, setActiveTab] = React.useState<"all" | "long" | "short">("all")

  const longSignals = activeSignals.filter(s => s.direction === "LONG")
  const shortSignals = activeSignals.filter(s => s.direction === "SHORT")

  const signalsToRender = activeTab === "long" ? longSignals : activeTab === "short" ? shortSignals : activeSignals

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Alert History & Signals Directory
              </h1>
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-label-code text-label-code font-bold uppercase">
                {activeSignals.length} Active
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Chronological archive of all qualified setup notifications and historical lifespans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-border-subtle">
          <button 
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded font-label-code text-label-code font-semibold transition-all ${
              activeTab === 'all' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All ({activeSignals.length})
          </button>
          <button 
            onClick={() => setActiveTab("long")}
            className={`px-3 py-1 rounded font-label-code text-label-code font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'long' ? 'bg-surface text-accent-bullish shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            ▲ Long ({longSignals.length})
          </button>
          <button 
            onClick={() => setActiveTab("short")}
            className={`px-3 py-1 rounded font-label-code text-label-code font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'short' ? 'bg-surface text-accent-danger shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            ▼ Short ({shortSignals.length})
          </button>
        </div>
      </div>

      {/* Active Signals Section */}
      <div className="flex flex-col gap-space-md bg-surface p-space-md rounded-xl border border-border-subtle shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-space-xs">
          <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Active Priority Signals ({signalsToRender.length})
          </h2>
          <span className="font-label-code text-body-xs text-text-secondary">
            Automatic invalidation upon stop-loss breach
          </span>
        </div>
        
        {signalsToRender.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-text-secondary mb-2">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">No active signals match the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {signalsToRender.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {/* Expired Signals Section */}
      {expiredSignals.length > 0 && (
        <div className="flex flex-col gap-space-md bg-surface p-space-md rounded-xl border border-border-subtle shadow-sm opacity-85">
          <div className="flex items-center justify-between border-b border-border-subtle pb-space-xs">
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Expired & Settled Signals ({expiredSignals.length})
            </h2>
            <span className="font-label-code text-body-xs text-text-secondary">
              Lifespan elapsed or target achieved
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {expiredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
