"use client"
import * as React from "react"

export interface FrictionFactor {
  id: string
  title: string
  description: string
  icon?: string
}

export function ContradictoryFactorsCard({
  factors = [
    {
      id: "factor-1",
      title: "Overhead Supply Zone: ₹157.00 - ₹157.50",
      description: "NSE Daily Pivot R1 rests at ₹157.10. Sellers defended this pivot in previous 3 consecutive sessions.",
      icon: "report_problem"
    },
    {
      id: "factor-2",
      title: "Global Asian Steel Weakness",
      description: "Shanghai rebar futures slipped -0.4% during early morning hours, creating slight macro commodity drag.",
      icon: "trending_down"
    },
    {
      id: "factor-3",
      title: "Derivative Call Concentration at ₹160.00",
      description: "Highest open interest cluster (12.4M shares) at 160 strike. May stall momentum ahead of Target 2.",
      icon: "call_received"
    }
  ]
}: {
  factors?: FrictionFactor[]
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded shadow-sm">
      {/* Header */}
      <div className="px-space-md py-space-sm bg-status-stale-bg border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-accent-bearish text-[18px]">
            warning
          </span>
          <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">
            Contradictory / Friction Factors
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-surface border border-border-subtle font-label-code text-body-xs font-semibold text-accent-bearish">
          {factors.length} FLAGS
        </span>
      </div>

      {/* Flag Items */}
      <div className="p-space-md flex flex-col gap-space-sm text-body-xs">
        {factors.map((factor) => (
          <div
            key={factor.id}
            className="p-2.5 rounded bg-status-stale-bg/60 border border-border-subtle flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-accent-bearish text-[16px] shrink-0 mt-0.5">
              {factor.icon ?? "report_problem"}
            </span>
            <div>
              <span className="font-semibold text-text-primary">{factor.title}</span>
              <p className="text-text-secondary mt-0.5 leading-relaxed">{factor.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
