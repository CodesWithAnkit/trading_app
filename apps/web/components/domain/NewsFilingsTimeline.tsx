"use client"
import * as React from "react"

export interface NewsFilingItem {
  id: string
  symbol: string
  headline: string
  pubTime: string
  ingestTime: string
  isOfficial: boolean
  impactText: string
  sourceUrl?: string
  isRiskEmbargo?: boolean
  embargoDetails?: string
}

export function NewsFilingsTimeline({
  items = [
    {
      id: "news-1",
      symbol: "TATASTEEL",
      headline: "Tata Steel signs MoU for clean energy supply at Kalinganagar facility",
      pubTime: "10:15:00 IST",
      ingestTime: "10:16:12 IST",
      isOfficial: true,
      impactText: "Low-to-Medium Positive (Energy Cost Efficiency)",
      sourceUrl: "#",
      isRiskEmbargo: false
    },
    {
      id: "news-2",
      symbol: "ZEEL",
      headline: "Earnings Dislocation Notice — Board Meeting Scheduled for Q3 Audit at 12:30 IST.",
      pubTime: "11:05:00 IST",
      ingestTime: "11:06:14 IST",
      isOfficial: true,
      impactText: "High Impact (Binary Risk Window)",
      sourceUrl: "#",
      isRiskEmbargo: true,
      embargoDetails: "Risk Gate Active: Symbol Suppressed in Scanner (No-Trade Window +/- 60m of results board meeting)"
    }
  ]
}: {
  items?: NewsFilingItem[]
}) {
  return (
    <div className="bg-surface rounded border border-border-subtle shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">newspaper</span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
            News &amp; Regulatory Filings
          </span>
        </div>
        <span className="font-label-code text-body-xs text-text-secondary">
          Exchange Verified Primary Sources
        </span>
      </div>

      {/* Feed Items */}
      <div className="divide-y divide-border-subtle">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-space-md hover:bg-surface-bright transition-colors flex flex-col gap-space-xs ${
              item.isRiskEmbargo ? "bg-status-disconnected-bg/40" : ""
            }`}
          >
            {/* Top Tag Row */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className={`font-label-code text-metric-sm font-bold px-1.5 py-0.5 rounded border ${
                  item.isRiskEmbargo
                    ? "text-accent-danger bg-status-disconnected-bg border-accent-danger/30"
                    : "text-text-primary bg-surface border-border-subtle"
                }`}>
                  {item.symbol}
                </span>

                {item.isOfficial && (
                  <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text border border-accent-bullish/30 font-label-code text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Official Exchange Notice
                  </span>
                )}

                {item.isRiskEmbargo && (
                  <span className="px-1.5 py-0.5 rounded bg-accent-danger text-on-error font-label-code text-[10px] font-bold tracking-wider">
                    RISK EMBARGO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-space-sm font-label-code text-[11px] text-text-secondary">
                <span>Pub: <strong className="text-text-primary">{item.pubTime}</strong></span>
                <span>•</span>
                <span>Ingested: <strong className="text-text-primary">{item.ingestTime}</strong></span>
              </div>
            </div>

            {/* Headline */}
            <div className="font-body-md text-text-primary font-semibold mt-1">
              {item.headline}
            </div>

            {/* Details & Link */}
            <div className="flex items-center justify-between font-label-code text-body-xs text-text-secondary flex-wrap gap-1 mt-1">
              <span>Impact: <strong className={item.isRiskEmbargo ? "text-accent-danger" : "text-accent-bullish"}>{item.impactText}</strong></span>
              {item.sourceUrl && (
                <a className="text-accent-primary hover:underline flex items-center gap-0.5" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  <span>Source Document</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              )}
            </div>

            {/* Risk Embargo Suppression Banner */}
            {item.isRiskEmbargo && item.embargoDetails && (
              <div className="mt-space-xs p-space-sm rounded bg-status-disconnected-bg border border-accent-danger/30 flex items-center justify-between gap-space-sm flex-wrap">
                <div className="flex items-center gap-space-sm text-status-disconnected-text font-label-code text-body-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  <span>{item.embargoDetails}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-text-primary text-surface font-label-code text-[10px] font-bold shrink-0">
                  NO-TRADE LOCK
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
