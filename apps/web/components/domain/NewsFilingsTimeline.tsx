"use client"
import * as React from "react"
import Link from "next/link"
import type { NewsFilingItemContract } from "@/lib/contracts/intelligence"

const BY_LABEL: Record<NewsFilingItemContract["classifiedBy"], string> = { rules: "Rule", gemini: "AI", default: "Unclassified" }

function istClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "n/a"
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d)} IST`
}

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** Impact line from the stored classification (spec 0024 AC-6). */
function impactText(e: NewsFilingItemContract): string {
  if (e.classifiedBy === "default") return "Unclassified (Low / Neutral default)"
  return `${title(e.impactLevel)} impact, ${title(e.direction)} (${BY_LABEL[e.classifiedBy]})`
}

function impactTone(e: NewsFilingItemContract): string {
  if (e.classifiedBy === "default" || e.direction === "NEUTRAL" || e.direction === "MIXED") return "text-text-secondary"
  return e.direction === "BEARISH" ? "text-accent-danger" : "text-accent-bullish"
}

/**
 * The latest stored news on the Market Intelligence page (spec 0024 AC-7): real items only,
 * newest first, with a link to the full news page.
 */
export function NewsFilingsTimeline({
  events,
  isLoading = false,
  hasLoaded = true,
  error = null,
  limit = 6,
}: {
  events: NewsFilingItemContract[]
  isLoading?: boolean
  hasLoaded?: boolean
  error?: Error | null
  limit?: number
}) {
  const shown = events.slice(0, limit)
  const official = events.filter(e => e.isOfficialFiling).length
  const high = events.filter(e => e.impactLevel === "HIGH").length

  return (
    <div className="bg-surface rounded border border-border-subtle shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex items-center justify-between gap-space-sm flex-wrap">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">newspaper</span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
            News &amp; Regulatory Filings
          </span>
        </div>
        <span className="font-label-code text-body-xs text-text-secondary tabular-nums">
          {hasLoaded ? `${events.length} stored · ${official} official · ${high} high impact` : "Loading"}
        </span>
      </div>

      {/* States */}
      {error && !events.length ? (
        <div className="p-space-md text-body-sm text-accent-danger">Could not load news: {error.message}</div>
      ) : !hasLoaded && isLoading ? (
        <div className="p-space-md text-body-sm text-text-secondary">Loading the latest news…</div>
      ) : !shown.length ? (
        <div className="p-space-md text-body-sm text-text-secondary">
          No news fetched yet. An admin can fetch it from the{" "}
          <Link href="/dashboard/news" className="text-accent-primary hover:underline">News page</Link>.
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {shown.map((item) => {
            const isHigh = item.impactLevel === "HIGH" && item.classifiedBy !== "default"
            return (
              <div
                key={item.id}
                className={`p-space-md hover:bg-surface-bright transition-colors flex flex-col gap-space-xs ${isHigh ? "bg-status-disconnected-bg/40" : ""}`}
              >
                {/* Top Tag Row */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className={`font-label-code text-metric-sm font-bold px-1.5 py-0.5 rounded border ${
                      isHigh ? "text-accent-danger bg-status-disconnected-bg border-accent-danger/30" : "text-text-primary bg-surface border-border-subtle"
                    }`}>
                      {item.isMacro ? "Market wide" : item.symbol}
                    </span>

                    {item.isOfficialFiling ? (
                      <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text border border-accent-bullish/30 font-label-code text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Official filing
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-text-secondary border border-border-subtle font-label-code text-[10px] font-bold">
                        {item.source}
                      </span>
                    )}

                    {isHigh && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-danger text-on-error font-label-code text-[10px] font-bold">
                        High impact
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-space-sm font-label-code text-[11px] text-text-secondary">
                    <span>Pub: <strong className="text-text-primary">{istClock(item.publishedAt)}</strong></span>
                    <span>•</span>
                    <span>Ingested: <strong className="text-text-primary">{istClock(item.ingestedAt)}</strong></span>
                  </div>
                </div>

                {/* Headline */}
                <div className="font-body-md text-text-primary font-semibold mt-1">{item.headline}</div>

                {/* Details & Link */}
                <div className="flex items-center justify-between font-label-code text-body-xs text-text-secondary flex-wrap gap-1 mt-1">
                  <span>Impact: <strong className={impactTone(item)}>{impactText(item)}</strong></span>
                  {item.sourceUrl && (
                    <a className="text-accent-primary hover:underline flex items-center gap-0.5" href={item.sourceUrl} target="_blank" rel="noreferrer">
                      <span>Source</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {events.length > shown.length && (
        <div className="px-space-md py-space-sm border-t border-border-subtle bg-surface-bright text-body-xs">
          <Link href="/dashboard/news" className="text-accent-primary hover:underline">
            View all {events.length} items on the News page
          </Link>
        </div>
      )}
    </div>
  )
}
