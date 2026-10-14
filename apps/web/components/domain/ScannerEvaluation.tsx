"use client"
import * as React from "react"
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react"

export function ScannerEvaluation({ signal }: { signal?: any }) {
  const criteria = [
    { id: "eligibility", label: "Universe Eligibility", group: "Filtering" },
    { id: "spread", label: "Bid/Ask Spread", group: "Filtering" },
    { id: "rvol", label: "RVOL (>1.2)", group: "Context" },
    { id: "trend", label: "Trend Bias", group: "Context" },
    { id: "setup", label: "Setup Pattern", group: "Structure" },
    { id: "rr", label: "Risk/Reward (>1.5)", group: "Structure" }
  ]

  // If there's a signal, everything passed. If no signal, we don't have the granular metrics yet (spec 0007 says they show "Not evaluated" until backend provides it)
  // But wait, the backend doesn't save failed signals in `signals` table yet, so if there's no signal, we only know it didn't pass *something*.
  // For now, we use the signal object's presence.
  
  const getStatus = (id: string): string => {
    if (!signal) return "PENDING"
    // For now if signal exists, it passed everything.
    return "PASS"
  }

  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
      <div className="flex flex-col">
        <h3 className="text-base font-bold text-text tracking-tight">Scanner Criteria Matrix</h3>
        <span className="text-xs text-text-muted">Real-time evaluation rules</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {criteria.map(c => {
          const status = getStatus(c.id)
          return (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-muted/30 border border-border">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">{c.group}</span>
                <span className="text-sm font-semibold text-text">{c.label}</span>
              </div>
              <div>
                {status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-long" />}
                {status === 'FAIL' && <XCircle className="w-5 h-5 text-short" />}
                {status === 'PENDING' && <HelpCircle className="w-5 h-5 text-text-muted opacity-50" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
