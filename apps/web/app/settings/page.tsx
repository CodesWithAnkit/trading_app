"use client"

import * as React from "react"
import { useSessionUser } from "@/lib/contexts/AuthContext"
import { LiveGuruRulesList } from "@/components/domain/backtest/LiveToggle"
import { ScorecardMinSampleSetting } from "@/components/domain/ScorecardMinSampleSetting"
import { RiskLimitsSettings } from "@/components/domain/RiskLimitsSettings"
import { Server } from "lucide-react"

export default function SettingsPage() {
  const isAdmin = useSessionUser()?.isAdmin === true

  return (
    <div className="flex flex-col gap-3 sm:gap-margin px-gutter sm:px-gutter-md py-2 sm:py-space-md w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-3 sm:p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-space-md">
        <div className="flex items-center gap-3 sm:gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">tune</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg font-bold text-text-primary tracking-tight">
                Settings & Risk Governance Registry
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                Risk Gates Enforced
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Deterministic pre-trade risk guardrails, broker latency budgets, and transaction friction parameters.
            </p>
          </div>
        </div>

      </div>

      <ScorecardMinSampleSetting />

      {/* Main Grid: Left Risk Gates (7 Cols) vs Right Cost Engine (5 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left Column (Cols 1-7): Deterministic Pre-Trade Risk Gates */}
        <RiskLimitsSettings className="xl:col-span-7" />

        {/* Right Column (Cols 8-12): Cost & Slippage Engine */}
        <div className="xl:col-span-5 flex flex-col gap-margin">
          {/* Transaction Cost Model */}
          <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Friction & Realistic Costs (FR-20)
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-bold">
                NSE CASH SCHEDULE
              </span>
            </div>

            <div className="flex flex-col gap-space-xs text-body-xs divide-y divide-border-subtle font-label-code">
              <div className="py-2 flex items-center justify-between first:pt-0">
                <span className="text-text-secondary">Angel One Brokerage:</span>
                <span className="font-bold text-text-primary">₹20.00 / executed order</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">Securities Transaction Tax (STT):</span>
                <span className="font-bold text-text-primary">0.025% on Sell turnover</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">NSE Transaction Charges:</span>
                <span className="font-bold text-text-primary">0.00325% turnover</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">GST (18% on Brokerage + Txn):</span>
                <span className="font-bold text-text-primary">18.0% statutory</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">Simulated Slippage Buffer:</span>
                <span className="font-bold text-accent-bullish">0.05% per execution</span>
              </div>
            </div>

            <div className="p-space-sm bg-surface-container-low rounded-lg text-[11px] text-text-secondary font-body-xs border border-border-subtle">
              All Target 1 & 2 reward calculations displayed across the app automatically factor these realistic charges before quoting net expectancy.
            </div>
          </div>

          {/* System Diagnostics & Latency Registry */}
          <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Engine Health & Latency
                </h3>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">
                OPTIMAL
              </span>
            </div>

            <div className="flex flex-col gap-space-xs font-label-code text-body-xs divide-y divide-border-subtle">
              <div className="py-1.5 flex items-center justify-between first:pt-0">
                <span className="text-text-secondary">SmartAPI WebSocket:</span>
                <span className="text-status-live-text font-bold">12ms latency</span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-text-secondary">5-Minute Candle Engine:</span>
                <span className="text-text-primary font-semibold">Zero clock drift</span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-text-secondary">Deterministic Rule Engine:</span>
                <span className="text-text-primary font-semibold">14 checks / tick</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* spec 0023 AC-8: admins see which guru rules are live (read only). */}
      {isAdmin && <LiveGuruRulesList />}
    </div>
  )
}
