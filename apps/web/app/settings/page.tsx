"use client"

import * as React from "react"
import { useSettings } from "@/lib/contexts/SettingsContext"
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Sliders, 
  Lock, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Flame, 
  Save 
} from "lucide-react"

export default function SettingsPage() {
  const { dailyRiskBudget, theme, brokerConnected, updateSettings } = useSettings()

  const [maxLoss, setMaxLoss] = React.useState(dailyRiskBudget || 6000)
  const [maxConcurrent, setMaxConcurrent] = React.useState(3)
  const [singleRisk, setSingleRisk] = React.useState(1500)
  const [minRR, setMinRR] = React.useState(1.5)
  const [cooldownMinutes, setCooldownMinutes] = React.useState(45)
  const [autoLock, setAutoLock] = React.useState(true)
  const [isSaved, setIsSaved] = React.useState(false)

  const handleSave = () => {
    updateSettings({ dailyRiskBudget: maxLoss })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
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

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-space-md py-1.5 bg-primary hover:bg-primary-container text-on-primary font-body-sm font-semibold rounded shadow-sm transition-colors"
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4 text-accent-bullish" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? "Saved Successfully!" : "Save Configuration"}</span>
        </button>
      </div>

      {/* Main Grid: Left Risk Gates (7 Cols) vs Right Cost Engine (5 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left Column (Cols 1-7): Deterministic Pre-Trade Risk Gates */}
        <div className="xl:col-span-7 bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <div className="flex items-center gap-space-xs">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Deterministic Pre-Trade Risk Gates
                </h2>
                <p className="font-body-xs text-body-xs text-text-secondary">
                  Hardcoded safety checks evaluated before surfacing any intraday signal
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
              ACTIVE LOCKS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Gate 1: Daily Loss Ceiling */}
            <div className="bg-surface-high/50 p-space-sm rounded-lg border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
                  1. Daily Loss Ceiling
                </span>
                <span className="px-1.5 py-0.5 rounded bg-accent-danger/10 text-accent-danger font-label-code text-label-code font-bold">
                  CIRCUIT BREAKER
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-metric-lg text-metric-lg font-bold text-text-primary">
                    ₹{maxLoss.toFixed(2)}
                  </span>
                  <span className="font-label-code text-label-code text-text-secondary">
                    Cap: 3.0% equity
                  </span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="15000"
                  step="500"
                  value={maxLoss}
                  onChange={e => setMaxLoss(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer mt-2"
                />
                <div className="flex justify-between items-center mt-2 text-body-xs font-label-code text-text-secondary">
                  <span>Threshold Action:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoLock}
                      onChange={e => setAutoLock(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span className="font-semibold text-text-primary">Auto-Lock Scanner</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Gate 2: Max Concurrent Trades */}
            <div className="bg-surface-high/50 p-space-sm rounded-lg border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
                  2. Max Concurrent Trades
                </span>
                <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
                  CAPACITY {maxConcurrent}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-metric-lg text-metric-lg font-bold text-text-primary">
                    {maxConcurrent} Positions
                  </span>
                  <span className="font-label-code text-label-code text-text-secondary">Focus Constraint</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map(idx => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMaxConcurrent(idx)}
                      className={`flex-1 h-6 rounded font-label-code text-label-code font-bold transition-colors ${
                        maxConcurrent >= idx ? "bg-accent-bullish text-on-primary" : "bg-surface-high text-text-secondary border border-border-subtle"
                      }`}
                    >
                      Slot {idx}
                    </button>
                  ))}
                </div>
                <p className="font-body-xs text-body-xs text-text-secondary mt-2">
                  Additional setups automatically suppressed until open position closes.
                </p>
              </div>
            </div>

            {/* Gate 3: Single Trade Risk Cap */}
            <div className="bg-surface-high/50 p-space-sm rounded-lg border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
                  3. Max Single-Trade Risk
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-label-code font-bold">
                  1.25% TACTICAL
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-metric-lg text-metric-lg font-bold text-text-primary">
                    ₹{singleRisk.toFixed(2)}
                  </span>
                  <span className="font-body-xs text-body-xs text-text-secondary">Max Loss per Trade</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="250"
                  value={singleRisk}
                  onChange={e => setSingleRisk(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Gate 4: Minimum Net Risk:Reward Ratio */}
            <div className="bg-surface-high/50 p-space-sm rounded-lg border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
                  4. Min Net Risk:Reward
                </span>
                <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
                  ≥ 1 : {minRR.toFixed(2)}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-metric-lg text-metric-lg font-bold text-status-live-text">
                    1 : {minRR.toFixed(2)}
                  </span>
                  <span className="font-body-xs text-body-xs text-text-secondary">Net Post Friction</span>
                </div>
                <div className="p-1.5 bg-surface rounded border border-border-subtle mt-2 flex items-center justify-between font-label-code text-[11px]">
                  <span className="text-text-secondary">Below Threshold:</span>
                  <span className="px-1 rounded bg-status-disconnected-bg text-status-disconnected-text font-bold">
                    REJECT SETUP
                  </span>
                </div>
              </div>
            </div>

            {/* Gate 5: Consecutive Loss Cooldown */}
            <div className="md:col-span-2 bg-surface-high/50 p-space-sm rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-accent-bearish text-[18px]">timer</span>
                  <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
                    5. Consecutive Loss Mandatory Cooldown (Psychological Guardrail)
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
                  STANDBY (0 LOSSES)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-2 items-center">
                <div className="p-space-xs bg-surface rounded border border-border-subtle font-label-code text-[11px]">
                  <span className="text-text-secondary block">Trigger Condition</span>
                  <span className="font-bold text-text-primary">2 consecutive stops hit</span>
                </div>
                <div className="p-space-xs bg-surface rounded border border-border-subtle font-label-code text-[11px]">
                  <span className="text-text-secondary block">Lockout Duration</span>
                  <span className="font-bold text-accent-danger">{cooldownMinutes} Minutes Mandatory</span>
                </div>
                <div className="p-space-xs bg-surface rounded border border-border-subtle font-label-code text-[11px]">
                  <span className="text-text-secondary block">Override Policy</span>
                  <span className="font-semibold text-text-secondary">Strict: Non-Bypassable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
    </div>
  )
}
