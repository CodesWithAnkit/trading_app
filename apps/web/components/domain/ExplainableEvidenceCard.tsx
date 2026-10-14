"use client"
import * as React from "react"

export interface EvidenceCardProps {
  symbol: string
  sectorName?: string
  sectorChangePct?: number
  sectorRank?: string
  headline?: string
  filingSource?: string
  filingPubTime?: string
  filingIngestTime?: string
  filingImpact?: string
  filingUrl?: string
  sectorAdvances?: number
  sectorDeclines?: number
  sectorBreadthPct?: number
  fiiNetCr?: number
  diiNetCr?: number
  blockDealsStatus?: string
}

export function ExplainableEvidenceCard({
  symbol,
  sectorName = "Nifty Metal Index",
  sectorChangePct = 1.82,
  sectorRank = "Rank #1 of 11 sectors (+1.18% Alpha vs Nifty 50 benchmark)",
  headline = "Tata Steel signs MoU for clean energy supply at Kalinganagar facility",
  filingSource = "NSE Corporate Filing",
  filingPubTime = "10:15:00 IST",
  filingIngestTime = "10:16:12 IST (86m ago)",
  filingImpact = "Low-to-Medium Positive (Energy Cost Efficiency)",
  filingUrl = "#",
  sectorAdvances = 12,
  sectorDeclines = 3,
  sectorBreadthPct = 80,
  fiiNetCr = -410,
  diiNetCr = 1250,
  blockDealsStatus = "Session Clean — No block transactions (>0.5% equity) registered between 09:15 and 11:42 IST today."
}: EvidenceCardProps) {
  return (
    <div className="bg-surface border border-border-subtle rounded shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">
            Explainable Multi-Category Evidence Cards
          </span>
        </div>
        <span className="font-label-code text-body-xs text-text-secondary">
          No Opaque Aggregations • PRD 5.5 Spec
        </span>
      </div>

      <div className="p-space-md flex flex-col gap-space-lg">
        {/* Category A: Broad Market & Sector Context */}
        <div className="p-space-md rounded bg-surface-bright border border-border-subtle">
          <div className="flex items-center justify-between mb-space-sm flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-accent-bullish" />
              <span className="font-label-code text-body-xs uppercase font-bold text-text-primary tracking-wider">
                Category A: Broad Market &amp; Sector Context
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-body-xs font-semibold">
              ALIGNED BULLISH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="font-body-sm font-medium text-text-secondary">Nifty 50 Benchmark:</span>
                <span className="font-metric-sm font-bold text-text-primary">
                  24,482.10 <span className="text-accent-bullish">(+0.64%)</span>
                </span>
              </div>
              <div className="font-body-xs text-text-secondary mt-1">
                Regime: <strong className="text-accent-bullish">Bullish Trend Day</strong> (Trading &gt; VWAP &amp; Above Opening Range). Contextual only.
              </div>
            </div>

            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="font-body-sm font-medium text-text-secondary">{sectorName}:</span>
                <span className="font-metric-sm font-bold text-accent-bullish">
                  +{sectorChangePct.toFixed(2)}% today
                </span>
              </div>
              <div className="font-body-xs text-text-secondary mt-1">
                Relative Strength: <strong className="text-text-primary">{sectorRank}</strong>. Heavy sectoral tailwind.
              </div>
            </div>
          </div>
        </div>

        {/* Category B: News & Event Intelligence */}
        <div className="p-space-md rounded bg-surface-bright border border-border-subtle">
          <div className="flex items-center justify-between mb-space-sm flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-accent-primary" />
              <span className="font-label-code text-body-xs uppercase font-bold text-text-primary tracking-wider">
                Category B: News &amp; Event Intelligence
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-status-delayed-bg text-status-delayed-text font-label-code text-body-xs font-semibold">
              VERIFIED FILING
            </span>
          </div>

          <div className="space-y-space-sm">
            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-label-code text-[10px] font-bold uppercase">
                    {filingSource}
                  </span>
                  <span className="font-body-sm font-semibold text-text-primary">
                    {headline}
                  </span>
                </div>
                <span className="font-label-code text-[11px] text-text-secondary">
                  Pub: {filingPubTime} • Ingested: {filingIngestTime}
                </span>
              </div>
              <div className="flex items-center justify-between font-label-code text-body-xs text-text-secondary flex-wrap gap-1">
                <span>Impact Classifier: <strong className="text-accent-bullish">{filingImpact}</strong></span>
                <a className="text-accent-primary hover:underline flex items-center gap-0.5" href={filingUrl} target="_blank" rel="noreferrer">
                  <span>Source Doc (BSE/NSE Link)</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>
            </div>

            <div className="bg-surface p-space-sm rounded border border-border-subtle flex items-center justify-between font-body-xs">
              <span className="text-text-secondary">Macro Calendar &amp; Earnings Guard:</span>
              <span className="font-label-code text-text-primary font-medium">
                No RBI/MOSPI events scheduled today • Next Earnings: 28 days away (No binary dislocation)
              </span>
            </div>
          </div>
        </div>

        {/* Category C: Sentiment Proxies & Breadth */}
        <div className="p-space-md rounded bg-surface-bright border border-border-subtle">
          <div className="flex items-center justify-between mb-space-sm flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-accent-bullish" />
              <span className="font-label-code text-body-xs uppercase font-bold text-text-primary tracking-wider">
                Category C: Sentiment Proxies &amp; Breadth Participation
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-body-xs font-semibold">
              {sectorAdvances} ADV / {sectorDeclines} DEC
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md text-body-xs">
            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="font-label-code text-text-secondary uppercase text-[10px] mb-1">
                {sectorName} Sector Breadth
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-accent-danger/20 h-2 rounded overflow-hidden flex">
                  <div className="bg-accent-bullish h-full" style={{ width: `${sectorBreadthPct}%` }} />
                  <div className="bg-accent-danger h-full" style={{ width: `${100 - sectorBreadthPct}%` }} />
                </div>
                <span className="font-label-code font-bold text-text-primary">{sectorBreadthPct.toFixed(1)}%</span>
              </div>
              <div className="text-text-secondary">
                Broad-based participation: JSWSTEEL (+1.4%), HINDALCO (+1.6%), VEDL (+2.1%)
              </div>
            </div>

            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="font-label-code text-text-secondary uppercase text-[10px] mb-1">
                Strict Social Policy Safeguard
              </div>
              <div className="flex items-start gap-1.5 text-text-secondary">
                <span className="material-symbols-outlined text-[15px] text-text-secondary shrink-0">verified</span>
                <span>
                  Social chatter, Twitter/X noise, and unverified retail Telegram tips are strictly excluded by design policy (PRD Section 5.5 C). Only exchange verified disclosures analyzed.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category D: Institutional Flow Context */}
        <div className="p-space-md rounded bg-surface-bright border border-border-subtle">
          <div className="flex items-center justify-between mb-space-sm flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-text-secondary" />
              <span className="font-label-code text-body-xs uppercase font-bold text-text-primary tracking-wider">
                Category D: Institutional Flow Context
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-status-delayed-bg text-status-delayed-text font-label-code text-body-xs font-medium">
              HISTORICAL EOD CONTEXT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md text-body-xs">
            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-text-secondary">FII / DII Gross Activity (T-1 Close):</span>
                <span className="font-label-code text-[10px] text-text-secondary">SEBI EOD Report</span>
              </div>
              <div className="flex items-center justify-between font-label-code text-metric-sm">
                <span className="text-accent-danger">FII Net: {fiiNetCr > 0 ? "+" : ""}₹{fiiNetCr} Cr</span>
                <span className="text-accent-bullish">DII Net: +₹{diiNetCr} Cr</span>
              </div>
              <div className="text-[10px] text-status-stale-text mt-1">
                ⚠️ Stamped: Historical EOD Context — NOT real-time order book flow.
              </div>
            </div>

            <div className="bg-surface p-space-sm rounded border border-border-subtle">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-text-secondary">NSE Large Block / Bulk Deals:</span>
                <span className="font-label-code text-status-live-text font-semibold">Session Clean</span>
              </div>
              <div className="text-text-secondary">
                {blockDealsStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
