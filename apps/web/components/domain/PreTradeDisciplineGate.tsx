"use client"
import * as React from "react"

export interface PreTradeDisciplineGateProps {
  maxDailyLoss?: number
  lossDrawn?: number
  brokerConnected?: boolean
  providerLabel?: string
  positionSizingLabel?: string
}

export function PreTradeDisciplineGate({
  maxDailyLoss = 6000,
  lossDrawn = 0,
  brokerConnected = true,
  providerLabel = "Angel One SmartAPI connected",
  positionSizingLabel = "Restricted to 1.0% to 1.5% equity",
}: PreTradeDisciplineGateProps) {
  const lossLimitHealthy = lossDrawn < maxDailyLoss

  return (
    <section className="pb-2" data-testid="pre-trade-discipline-gate">
      <div className="bg-surface rounded-xl p-3 border border-border-subtle shadow-sm space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-accent-primary" aria-hidden="true">
            verified
          </span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Pre-Trade Discipline Gate
          </h3>
        </div>

        <div className="space-y-1.5 font-label-code text-label-code text-text-secondary">
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-[16px] ${
                lossLimitHealthy ? "text-accent-bullish" : "text-accent-danger"
              }`}
              aria-hidden="true"
            >
              {lossLimitHealthy ? "check_circle" : "cancel"}
            </span>
            <span>
              Max Loss Guard: ₹{maxDailyLoss.toLocaleString("en-IN")} threshold strictly active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-[16px] ${
                brokerConnected ? "text-accent-bullish" : "text-accent-bearish"
              }`}
              aria-hidden="true"
            >
              {brokerConnected ? "check_circle" : "warning"}
            </span>
            <span>Broker Session: {providerLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-accent-bullish" aria-hidden="true">
              check_circle
            </span>
            <span>Position Sizing: {positionSizingLabel}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border-subtle/50">
          <p className="font-body-xs text-body-xs text-text-secondary leading-snug">
            Decision Support System for analytical and contextual review only. Per SEBI regulatory guidance, all execution decisions remain discretionary and manually placed by the account holder.
          </p>
        </div>
      </div>
    </section>
  )
}
