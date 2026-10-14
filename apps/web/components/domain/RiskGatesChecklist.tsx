"use client"
import * as React from "react"

export interface RiskGateItem {
  id: string
  name: string
  detail: string
  status: "PASS" | "REJECT" | "NO_TRADE"
}

export function RiskGatesChecklist({
  gates = [
    {
      id: "gate-1",
      name: "Gate 1: Liquidity & Free-Float",
      detail: "Turnover >₹150 Cr • Spread: ₹0.05 (0.03%)",
      status: "PASS"
    },
    {
      id: "gate-2",
      name: "Gate 2: SmartAPI Feed Latency",
      detail: "Latency: 12ms (<5,000ms threshold)",
      status: "PASS"
    },
    {
      id: "gate-3",
      name: "Gate 3: Net Risk/Reward Ratio",
      detail: "Target 2 Net R:R 1:2.10 (Min 1:1.50)",
      status: "PASS"
    },
    {
      id: "gate-4",
      name: "Gate 4: Daily Loss Limit Room",
      detail: "₹2,450 used of ₹6,000 (40.8% headroom)",
      status: "PASS"
    },
    {
      id: "gate-5",
      name: "Gate 5: Event Dislocation Guard",
      detail: "No earnings or board call within ±60m",
      status: "PASS"
    },
    {
      id: "gate-6",
      name: "Gate 6: Contradictory Evidence",
      detail: "Weighted counter-score: 22/100 (<35 gate)",
      status: "PASS"
    }
  ]
}: {
  gates?: RiskGateItem[]
}) {
  const allPass = gates.every(g => g.status === "PASS")
  const anyRejected = gates.some(g => g.status === "REJECT" || g.status === "NO_TRADE")

  return (
    <div className="bg-surface border border-border-subtle rounded shadow-sm">
      {/* Header */}
      <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className={`material-symbols-outlined text-[20px] ${allPass ? "text-accent-bullish" : "text-accent-danger"}`}>
            shield
          </span>
          <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">
            Pre-Setup Risk-Gate Matrix
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded font-label-code text-body-xs font-bold ${
          allPass
            ? "bg-status-live-bg text-status-live-text"
            : anyRejected
            ? "bg-status-disconnected-bg text-status-disconnected-text"
            : "bg-status-stale-bg text-status-stale-text"
        }`}>
          {allPass ? "ALL 6 GATES PASS" : "GATES REJECTED / NO TRADE"}
        </span>
      </div>

      {/* Checklist items */}
      <div className="p-space-md divide-y divide-border-subtle text-body-xs">
        {gates.map((gate) => (
          <div key={gate.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 gap-space-md">
            <div>
              <div className="font-body-sm font-semibold text-text-primary">
                {gate.name}
              </div>
              <div className="font-label-code text-body-xs text-text-secondary">
                {gate.detail}
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded font-label-code text-body-xs font-bold shrink-0 ${
              gate.status === "PASS"
                ? "bg-status-live-bg text-status-live-text"
                : gate.status === "REJECT"
                ? "bg-status-disconnected-bg text-status-disconnected-text"
                : "bg-surface-dim text-text-primary font-bold tracking-wider"
            }`}>
              {gate.status === "NO_TRADE" ? "NO TRADE" : gate.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
