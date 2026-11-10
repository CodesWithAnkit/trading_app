"use client"
import * as React from "react"
import Link from "next/link"
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  FileCheck, 
  BrainCircuit, 
  Lock, 
  ArrowRight,
  Filter,
  X
} from "lucide-react"

interface EventItem {
  id: string
  symbol: string
  source: string
  isOfficial: boolean
  isMacro: boolean
  sourceUrl?: string
  classifiedBy: "rules" | "gemini" | "default"
  sourceType: "OFFICIAL_FILING" | "MEDIA_WIRE" | "REGULATORY_CIRCULAR"
  factType: "CONFIRMED_FACT" | "INFERRED_INTERPRETATION"
  impact: "HIGH" | "MEDIUM" | "LOW"
  embargoed?: boolean
  linkedSetup?: boolean
  pubTime: string
  ingestTime: string
  clockSkew: string
  refId: string
  headline: string
  summary: string
  confirmedFacts: string
  inferredModel: string
  keyTerms: { label: string; value: string }[]
}

import { useNewsFilings } from "@/lib/hooks/useNewsFilings"
import { useSessionUser } from "@/lib/contexts/AuthContext"
import type { NewsFetchRunContract, NewsScheduleContract } from "@/lib/contracts/intelligence"

/** Spec 0024 AC-6: how each item's impact and direction were decided. */
const CLASSIFIED_LABEL: Record<EventItem["classifiedBy"], string> = { rules: "Rule", gemini: "AI", default: "Unclassified" }
const SOURCE_LABEL: Record<string, string> = { nse: "NSE", bse: "BSE", rss: "RSS", alphavantage: "Alpha Vantage" }

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

type FeedTone = "live" | "paused" | "busy" | "error" | "idle"

/** Spec 0024 AC-8, AC-10, AC-11: one plain status line for the news feed. */
function feedStatus(
  run: NewsFetchRunContract | null,
  schedule: NewsScheduleContract | null,
  fetchError: string | null,
  now: number,
): { tone: FeedTone; text: string } {
  if (fetchError) return { tone: "error", text: fetchError }
  if (run?.status === "running") return { tone: "busy", text: `Fetching now, started ${timeAgo(run.startedAt, now)}` }

  const parts: string[] = []
  if (run) {
    const results = Object.entries(run.perSource)
    const fresh = results.reduce((n, [, r]) => n + (r?.new ?? 0), 0)
    const label = (k: string) => SOURCE_LABEL[k] ?? k
    const failed = results.filter(([, r]) => r?.status === "error" || (!r?.status && r?.error)).map(([k]) => label(k))
    // AC-12: blocked or rate limited sources are named; ones not configured or disabled collapse to "N sources off".
    const skipped = results.filter(([, r]) => r?.status === "skipped")
    const refused = skipped.filter(([, r]) => /^(blocked|rate limited)/.test(r?.skipped ?? ""))
    const off = skipped.length - refused.length
    const when = timeAgo(run.finishedAt ?? run.startedAt, now)
    if (run.status === "cancelled") parts.push(`Last fetch cancelled ${when}`)
    else if (run.status === "failed") parts.push(`Last fetch failed ${when}`)
    else parts.push(`Last fetch ${when}, ${fresh} new`)
    if (failed.length && run.status !== "failed") parts.push(`${failed.join(" and ")} unavailable`)
    for (const [k, r] of refused) parts.push(`${label(k)} ${r?.skipped?.startsWith("rate") ? "rate limited" : "blocked"}`)
    if (off) parts.push(`${off} ${off === 1 ? "source" : "sources"} off`)
  } else {
    parts.push("No fetch has run yet")
  }

  if (schedule?.paused) {
    const since = schedule.pausedAt ? ` ${timeAgo(schedule.pausedAt, now)}` : ""
    return { tone: "paused", text: [`Schedule paused${since}`, ...parts].join(". ") }
  }
  if (run?.status === "failed") return { tone: "error", text: parts.join(". ") }
  return { tone: run ? "live" : "idle", text: ["Updates every 5 min in market hours", ...parts].join(". ") }
}

const TONE_DOT: Record<FeedTone, string> = {
  live: "bg-accent-bullish",
  paused: "bg-accent-bearish",
  busy: "bg-primary animate-pulse",
  error: "bg-accent-danger",
  idle: "bg-text-secondary",
}

interface FeedControlsProps {
  isAdmin: boolean
  running: boolean
  isFetching: boolean
  retryAfter: number | null
  fetchError: string | null
  latestRun: NewsFetchRunContract | null
  schedule: NewsScheduleContract | null
  now: number
  onFetch: () => void
  onCancel: () => void
  onTogglePause: () => void
}

/** Header cluster: status line for everyone, one non wrapping button group for admins. */
function FeedControls(p: FeedControlsProps) {
  const status = feedStatus(p.latestRun, p.schedule, p.fetchError, p.now)
  const paused = p.schedule?.paused === true
  const btn = "h-9 px-3 inline-flex items-center gap-1.5 font-label-code text-label-code font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed"

  return (
    <div className="flex flex-col items-start md:items-end gap-2 md:max-w-md">
      <p className="flex items-start gap-2 font-body-xs text-body-xs text-text-secondary md:text-right" aria-live="polite">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[status.tone]}`} aria-hidden="true" />
        <span>{status.text}</span>
      </p>

      {p.isAdmin && (
        <div className="flex flex-nowrap items-center gap-2">
          <div className="inline-flex rounded-lg overflow-hidden border border-primary shadow-xs" role="group" aria-label="Fetch news">
            <button
              type="button"
              onClick={p.onFetch}
              disabled={p.isFetching || p.retryAfter != null}
              aria-busy={p.isFetching}
              className={`${btn} bg-primary text-on-primary hover:bg-primary-container disabled:opacity-70`}
            >
              <span className={`material-symbols-outlined text-[18px] ${p.isFetching ? "animate-spin" : ""}`} aria-hidden="true">
                {p.isFetching ? "progress_activity" : "refresh"}
              </span>
              {p.isFetching ? "Fetching" : p.retryAfter != null ? `Wait ${p.retryAfter}s` : "Fetch now"}
            </button>
            {p.running && (
              <button
                type="button"
                onClick={p.onCancel}
                className={`${btn} border-l border-on-primary/30 bg-surface text-accent-danger hover:bg-status-disconnected-bg`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">stop</span>
                Cancel
              </button>
            )}
          </div>

          {p.schedule && (
            <button
              type="button"
              onClick={p.onTogglePause}
              aria-pressed={paused}
              title={paused ? "Resume the 5 minute schedule" : "Pause the 5 minute schedule"}
              className={`${btn} rounded-lg border ${
                paused
                  ? "border-accent-bearish/40 bg-status-stale-bg text-accent-bearish hover:bg-status-stale-bg/70"
                  : "border-border-subtle bg-surface text-text-primary hover:bg-surface-high"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{paused ? "play_arrow" : "pause"}</span>
              {paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const IST_TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" }

export default function NewsIntelligencePage() {
  const [filterType, setFilterType] = React.useState<"ALL" | "OFFICIAL" | "HIGH_IMPACT" | "LINKED">("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const {
    events: liveEvents, totalCount, officialCount, highImpactCount, hasLoaded,
    latestRun, isFetching, retryAfter, fetchError, fetchLatest, cancelFetch, schedule, setSchedulePaused,
  } = useNewsFilings()
  // Spec 0024 AC-1, AC-10, AC-11: fetch, cancel and pause are admin only.
  const isAdmin = useSessionUser()?.isAdmin === true
  const running = latestRun?.status === "running"
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  // Only real stored items (spec 0024 AC-7): no sample or invented entries.
  const combinedEvents = React.useMemo<EventItem[]>(() => {
    return liveEvents.map(e => ({
      id: e.id,
      symbol: e.symbol,
      source: e.source,
      isOfficial: e.isOfficialFiling,
      isMacro: e.isMacro,
      sourceUrl: e.sourceUrl,
      classifiedBy: e.classifiedBy ?? "default",
      sourceType: e.eventType === "OFFICIAL_FILING" ? "OFFICIAL_FILING" : e.eventType === "MACRO" ? "REGULATORY_CIRCULAR" : "MEDIA_WIRE",
      factType: e.isOfficialFiling ? "CONFIRMED_FACT" : "INFERRED_INTERPRETATION",
      impact: e.impactLevel,
      linkedSetup: false,
      pubTime: new Date(e.publishedAt).toLocaleTimeString("en-IN", IST_TIME) + " IST",
      ingestTime: new Date(e.ingestedAt).toLocaleTimeString("en-IN", IST_TIME) + " IST",
      clockSkew: `+${Math.round(e.clockSkewMs / 1000)}s lag`,
      refId: `#${e.source.substring(0, 3).toUpperCase()}-${e.symbol}-${e.id.substring(0, 6)}`,
      headline: e.headline,
      summary: e.excerpt,
      confirmedFacts: e.isOfficialFiling
        ? `Official ${e.source} exchange announcement. Read the linked document for the full filing.`
        : `General news from ${e.source}. Not an exchange filing.`,
      inferredModel:
        e.classifiedBy === "rules" ? `Keyword rule (${e.eventType}): ${e.direction}, ${e.impactLevel} impact.`
        : e.classifiedBy === "gemini" ? `AI classification: ${e.direction}, ${e.impactLevel} impact (confidence ${(e.confidence * 100).toFixed(0)}%).`
        : "Unclassified: no rule matched and AI was unavailable, so it defaults to Low / Neutral.",
      keyTerms: [
        { label: "Direction", value: e.direction },
        { label: "Impact", value: e.impactLevel },
        { label: "Classified by", value: CLASSIFIED_LABEL[e.classifiedBy ?? "default"] },
        { label: "Confidence", value: `${(e.confidence * 100).toFixed(0)}%` },
      ],
    }))
  }, [liveEvents])

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selectedEvent = combinedEvents.find(e => e.id === selectedId) ?? combinedEvents[0]
  const setSelectedEvent = (evt: EventItem) => setSelectedId(evt.id)

  const filteredEvents = combinedEvents.filter(evt => {
    if (filterType === "OFFICIAL" && evt.sourceType !== "OFFICIAL_FILING") return false
    if (filterType === "HIGH_IMPACT" && evt.impact !== "HIGH") return false
    if (filterType === "LINKED" && !evt.linkedSetup) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return evt.symbol.toLowerCase().includes(q) || evt.headline.toLowerCase().includes(q) || evt.summary.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-col gap-3 sm:gap-margin px-gutter sm:px-gutter-md lg:px-margin-lg py-2 sm:py-space-md lg:py-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">newspaper</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                News & Regulatory Disclosures
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                Zero Social Chatter
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              NSE and BSE announcements plus market news (RSS, Alpha Vantage) for watched F&amp;O stocks, fetched every 5 minutes in market hours.
            </p>
          </div>
        </div>

        <FeedControls
          isAdmin={isAdmin}
          running={running}
          isFetching={isFetching}
          retryAfter={retryAfter}
          fetchError={fetchError}
          latestRun={latestRun}
          schedule={schedule}
          now={now}
          onFetch={fetchLatest}
          onCancel={cancelFetch}
          onTogglePause={() => schedule && setSchedulePaused(!schedule.paused)}
        />
      </div>

      {/* 3 Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              Total Ingested Events
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">
                {totalCount || combinedEvents.length} Events
              </span>
              <span className="font-label-code text-label-code text-accent-bullish font-semibold bg-status-live-bg px-1 rounded">Today</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              {officialCount || combinedEvents.filter(e => e.sourceType === "OFFICIAL_FILING").length} Filings • Strict Provenance
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">feed</span>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              Official Disclosures
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">
                {officialCount || combinedEvents.filter(e => e.sourceType === "OFFICIAL_FILING").length} Verified
              </span>
              <span className="font-label-code text-label-code text-status-live-text font-semibold bg-status-live-bg px-1 rounded">100% Provenance</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">NSE NEAPS / BSE Digital Signature</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-status-live-bg text-status-live-text flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">policy</span>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              High-Impact Events
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-accent-danger font-bold">
                {highImpactCount || combinedEvents.filter(e => e.impact === "HIGH").length} Flagged
              </span>
              <span className="font-label-code text-label-code text-status-disconnected-text font-semibold bg-status-disconnected-bg px-1 rounded">Embargo Active</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">Event Dislocation Guard Active</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-status-disconnected-bg text-accent-danger flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">crisis_alert</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-1 overflow-x-auto text-nowrap">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-bold transition-all shadow-xs ${
              filterType === "ALL" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            All Events ({combinedEvents.length})
          </button>
          <button
            onClick={() => setFilterType("OFFICIAL")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all ${
              filterType === "OFFICIAL" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            Official Disclosures
          </button>
          <button
            onClick={() => setFilterType("HIGH_IMPACT")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all ${
              filterType === "HIGH_IMPACT" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            High Impact
          </button>
          <button
            onClick={() => setFilterType("LINKED")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all flex items-center gap-1 ${
              filterType === "LINKED" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            <span>Linked Setups</span>
          </button>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search symbol, headline, tag..."
              className="w-full h-8 pl-8 pr-3 bg-canvas border border-border-subtle rounded font-body-sm text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 rounded text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Stream (Cols 1-8) + Side Drawer (Cols 9-12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Event Cards Stream (Cols 1-8) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {hasLoaded && combinedEvents.length === 0 && (
            <div className="bg-surface border border-border-subtle rounded-xl p-margin flex flex-col items-center text-center gap-space-sm shadow-sm">
              <span className="material-symbols-outlined text-[32px] text-text-secondary" aria-hidden="true">inbox</span>
              <h2 className="font-headline-md text-headline-md text-text-primary font-bold">No news fetched yet</h2>
              <p className="font-body-sm text-body-sm text-text-secondary max-w-md">
                {isAdmin
                  ? "Fetch the latest exchange announcements and market news for your watched stocks."
                  : "News arrives every 5 minutes during market hours. An admin can also fetch it now."}
              </p>
              {isAdmin && <button
                type="button"
                onClick={fetchLatest}
                disabled={isFetching || retryAfter != null}
                className="h-9 px-4 rounded bg-primary text-on-primary font-label-code text-label-code font-bold disabled:opacity-60"
              >
                {isFetching ? "Fetching…" : "Fetch latest news"}
              </button>}
            </div>
          )}
          {filteredEvents.map(evt => {
            const isSelected = selectedEvent?.id === evt.id

            return (
              <article
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`bg-surface border rounded-xl p-space-md transition-all cursor-pointer flex flex-col gap-space-sm shadow-sm ${
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border-subtle hover:border-primary/40"
                }`}
              >
                {/* Badges Header */}
                <div className="flex flex-wrap items-center justify-between gap-space-xs border-b border-border-subtle pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-surface-container text-primary border border-primary/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      {evt.isOfficial ? `${evt.source} FILING` : evt.source}
                    </span>
                    <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-status-live-bg text-status-live-text border border-accent-bullish/30">
                      {evt.isOfficial ? "OFFICIAL FILING" : "GENERAL NEWS"}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-surface-high text-text-secondary border border-border-subtle"
                      title="How impact and direction were decided"
                    >
                      {CLASSIFIED_LABEL[evt.classifiedBy]}
                    </span>
                    {evt.impact === "HIGH" && (
                      <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-status-disconnected-bg text-status-disconnected-text border border-accent-danger/20">
                        HIGH IMPACT
                      </span>
                    )}
                    {evt.linkedSetup && (
                      <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-primary text-on-primary">
                        LINKED SETUP: {evt.symbol}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-label-code text-label-code text-text-secondary">
                    <span>Pub: <strong className="text-text-primary">{evt.pubTime}</strong></span>
                    <span>•</span>
                    <span>Ingest: <strong className="text-text-primary">{evt.ingestTime}</strong></span>
                    <span className="text-status-live-text">({evt.clockSkew})</span>
                  </div>
                </div>

                {/* Symbol & Headline */}
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-metric-md text-metric-md font-bold bg-surface-high text-text-primary">
                      {evt.symbol}
                    </span>
                    <span className="font-label-code text-label-code text-text-secondary">{evt.isMacro ? "Market wide" : "NSE Cash Equities"}</span>
                  </div>
                  {evt.sourceUrl ? (
                    <a
                      href={evt.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="font-label-code text-label-code text-primary hover:underline flex items-center gap-1"
                    >
                      Source <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="font-label-code text-[11px] text-text-secondary font-mono">Ref: {evt.refId}</span>
                  )}
                </div>

                <h2 className="font-headline-md text-headline-md text-text-primary leading-tight font-bold">
                  {evt.headline}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {evt.summary}
                </p>

                {/* Fact vs Inferred Segregation Callout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
                  <div className="bg-surface-high/60 border-l-2 border-primary/60 p-space-sm rounded-r">
                    <div className="flex items-center gap-1 font-label-code text-label-code text-primary uppercase font-bold mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmed Source Facts
                    </div>
                    <p className="font-body-xs text-body-xs text-text-primary leading-relaxed">
                      {evt.confirmedFacts}
                    </p>
                  </div>

                  <div className="bg-status-stale-bg/50 border-l-2 border-accent-bearish p-space-sm rounded-r">
                    <div className="flex items-center gap-1 font-label-code text-label-code text-accent-bearish uppercase font-bold mb-1">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      {CLASSIFIED_LABEL[evt.classifiedBy]} classification (fallible)
                    </div>
                    <p className="font-body-xs text-body-xs text-text-primary leading-relaxed">
                      {evt.inferredModel}
                    </p>
                  </div>
                </div>

                {/* Risk Lockout Banner if Embargoed */}
                {evt.embargoed && (
                  <div className="bg-status-disconnected-bg border border-accent-danger/30 rounded p-space-sm flex items-center justify-between text-body-xs text-status-disconnected-text mt-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0 text-accent-danger" />
                      <span>
                        <strong>Risk Embargo Active:</strong> High-volatility corporate action window. New intraday setups locked ±30m.
                      </span>
                    </div>
                    <span className="font-label-code text-label-code uppercase font-bold">LOCK APPLIED</span>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* Right Details Drawer (Cols 9-12) */}
        {selectedEvent && <aside className="xl:col-span-4 bg-surface border border-border-subtle rounded-xl p-space-md flex flex-col gap-space-md xl:sticky xl:top-28 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto shadow-sm">
          <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-metric-md text-metric-md font-bold bg-primary text-on-primary">
                {selectedEvent.symbol}
              </span>
              <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-semibold bg-surface-container text-primary">
                {selectedEvent.isOfficial ? `${selectedEvent.source} DISCLOSURE` : selectedEvent.source}
              </span>
            </div>
            <span className="font-label-code text-body-xs text-text-secondary">Detail Inspector</span>
          </div>

          {/* Provenance & Clock Skew */}
          <div className="bg-surface-high/60 rounded-lg p-space-sm flex flex-col gap-1.5 border border-border-subtle/50">
            <div className="font-label-code text-[11px] text-text-secondary uppercase font-bold tracking-wider mb-0.5">
              Ingestion & Clock Skew Telemetry
            </div>
            <div className="grid grid-cols-2 gap-2 text-label-code font-label-code text-[11px]">
              <div>
                <span className="text-text-secondary">Source Pub:</span>
                <div className="font-bold text-text-primary">{selectedEvent.pubTime}</div>
              </div>
              <div>
                <span className="text-text-secondary">System Ingest:</span>
                <div className="font-bold text-text-primary">{selectedEvent.ingestTime}</div>
              </div>
              <div>
                <span className="text-text-secondary">Clock Skew:</span>
                <div className="font-bold text-status-live-text">{selectedEvent.clockSkew}</div>
              </div>
              <div>
                <span className="text-text-secondary">Ref ID:</span>
                <div className="font-bold text-primary truncate font-mono">{selectedEvent.refId}</div>
              </div>
            </div>
          </div>

          {/* Headline & Material Terms */}
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold leading-tight">
              {selectedEvent.headline}
            </h3>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1 leading-relaxed">
              {selectedEvent.summary}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-code text-[11px] text-text-secondary uppercase font-bold tracking-wider">
              Extracted Material Terms
            </span>
            <div className="grid grid-cols-2 gap-space-xs font-label-code text-label-code">
              {selectedEvent.keyTerms.map((term, idx) => (
                <div key={`${term.label}-${term.value}-${idx}`} className="bg-canvas border border-border-subtle p-2 rounded">
                  <span className="text-text-secondary text-[10px] block">{term.label}:</span>
                  <span className="font-bold text-text-primary font-mono text-body-xs truncate block">{term.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Associated Setup Card if Linked */}
          {selectedEvent.linkedSetup && (
            <div className="bg-canvas border border-primary/30 rounded-lg p-space-sm flex flex-col gap-2">
              <div className="flex items-center justify-between font-label-code text-label-code">
                <span className="text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">radar</span>
                  Associated Active Setup
                </span>
                <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
              <p className="font-body-xs text-body-xs text-text-secondary">
                This filing directly supports the intraday technical setup for {selectedEvent.symbol}.
              </p>
              <Link
                href={`/dashboard/analysis/${selectedEvent.symbol}`}
                className="w-full mt-1 h-8 bg-primary hover:bg-primary-container text-on-primary font-label-code text-label-code font-bold rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Open Signal Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Statutory Mandate */}
          <div className="p-space-xs bg-surface-high/40 rounded border border-border-subtle/50 text-[10px] font-label-code text-text-secondary leading-tight flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-text-secondary shrink-0 mt-0.5">gavel</span>
            <span>
              <strong>SEBI Mandate:</strong> Disclosures are for decision support only. Zero automated trade placement. All orders must be evaluated and entered manually in Angel One.
            </span>
          </div>
        </aside>}
      </div>
    </div>
  )
}
