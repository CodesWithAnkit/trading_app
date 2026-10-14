"use client"
import * as React from "react"

export interface MarketRegimeData {
  regimeNumber?: string
  regimeName?: string
  volatilityLabel?: string
  vixValue?: number
  vixChangePct?: number
  benchmarkName?: string
  benchmarkPrice?: number
  benchmarkChangePct?: number
  advancesCount?: number
  declinesCount?: number
  advancesPct?: number
  declinesPct?: number
  outperformingSectors?: string
  pullbackSectors?: string
}

export function MarketRegimeStrip({
  data = {
    regimeNumber: "REGIME 01",
    regimeName: "Bullish Trend Day",
    volatilityLabel: "Moderate Volatility",
    vixValue: 13.42,
    vixChangePct: -2.1,
    benchmarkName: "Nifty 50 Reference",
    benchmarkPrice: 24482.10,
    benchmarkChangePct: 0.64,
    advancesCount: 1482,
    declinesCount: 988,
    advancesPct: 60,
    declinesPct: 40,
    outperformingSectors: "Metals (+1.8%), Auto (+1.2%) Outperforming",
    pullbackSectors: "IT (-0.4%), Realty (-1.1%) In Corrective Pullback"
  }
}: {
  data?: MarketRegimeData
}) {
  const isVixDown = (data.vixChangePct ?? 0) <= 0
  const isBenchmarkUp = (data.benchmarkChangePct ?? 0) >= 0

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-space-lg flex flex-col justify-between relative overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-accent-bullish/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Regime Title and VIX Chip */}
        <div className="flex items-center justify-between gap-space-sm mb-space-sm flex-wrap">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-sm py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase tracking-wider">
              {data.regimeNumber}
            </span>
            <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {data.regimeName}
            </span>
            <span className="font-body-xs text-body-xs text-text-secondary">
              — {data.volatilityLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container px-2 py-0.5 rounded">
            <span className="font-label-code text-label-code text-text-secondary uppercase">
              India VIX
            </span>
            <span className={`font-metric-sm text-metric-sm font-semibold ${isVixDown ? "text-accent-bullish" : "text-accent-danger"}`}>
              {data.vixValue?.toFixed(2)}
            </span>
            <span className={`font-label-code text-label-code ${isVixDown ? "text-accent-bullish" : "text-accent-danger"}`}>
              ({data.vixChangePct && data.vixChangePct > 0 ? "+" : ""}{data.vixChangePct?.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Benchmark Reference */}
        <div className="flex flex-wrap items-center gap-space-md text-body-sm text-text-secondary mb-space-md">
          <div className="flex items-center gap-1">
            <span className="font-medium text-text-primary">{data.benchmarkName}:</span>
            <span className={`font-metric-sm text-metric-sm font-bold ${isBenchmarkUp ? "text-accent-bullish" : "text-accent-danger"}`}>
              {data.benchmarkPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({isBenchmarkUp ? "+" : ""}{data.benchmarkChangePct?.toFixed(2)}%)
            </span>
            <span className="font-body-xs text-body-xs text-text-secondary ml-1">
              (Contextual Only — Not Tradable)
            </span>
          </div>
        </div>
      </div>

      {/* Advance / Decline Visual Ratio Bar */}
      <div className="flex flex-col gap-1.5 pt-space-xs">
        <div className="flex items-center justify-between font-label-code text-label-code font-semibold">
          <span className="text-status-live-text flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
            Advances: {data.advancesCount?.toLocaleString("en-IN")} ({data.advancesPct}%)
          </span>
          <span className="text-accent-danger flex items-center gap-1">
            Declines: {data.declinesCount?.toLocaleString("en-IN")} ({data.declinesPct}%)
            <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
          </span>
        </div>

        <div className="h-2 w-full bg-surface-high rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-accent-bullish transition-all duration-500"
            style={{ width: `${data.advancesPct ?? 60}%` }}
          />
          <div
            className="h-full bg-accent-danger transition-all duration-500"
            style={{ width: `${data.declinesPct ?? 40}%` }}
          />
        </div>

        <div className="flex justify-between font-body-xs text-body-xs text-text-secondary flex-wrap gap-1">
          <span>{data.outperformingSectors}</span>
          <span>{data.pullbackSectors}</span>
        </div>
      </div>
    </div>
  )
}
