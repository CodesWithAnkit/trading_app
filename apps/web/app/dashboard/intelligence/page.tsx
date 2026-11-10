"use client"
import * as React from "react"
import { SectorAlphaTable, type SectorRow } from "@/components/domain/SectorAlphaTable"
import { InstitutionalFlowCard, toInstitutionalFlowData } from "@/components/domain/InstitutionalFlowCard"
import { apiFetch } from "@/lib/api/apiFetch"
import type { InstitutionalContextContract } from "@/lib/contracts/intelligence"
import { NewsFilingsTimeline } from "@/components/domain/NewsFilingsTimeline"
import { MarketRegimeStrip } from "@/components/domain/MarketRegimeStrip"
import { 
  TrendingUp, 
  Layers, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  RefreshCw,
  Server
} from "lucide-react"

import { useMarketIntelligence } from "@/lib/hooks/useMarketIntelligence"
import { useNewsFilings } from "@/lib/hooks/useNewsFilings"

export default function MarketIntelligencePage() {
  const [selectedSource, setSelectedSource] = React.useState<"ALL" | "FILINGS" | "ACTIONS" | "MACRO">("ALL")
  const { data: context, refresh, isStale, feedLatencyMs, isLoading } = useMarketIntelligence()
  const news = useNewsFilings()
  // spec 0026 AC-7: the real institutional answer (empty until a source writes rows).
  const [institutional, setInstitutional] = React.useState<InstitutionalContextContract | null>(null)
  React.useEffect(() => {
    let live = true
    apiFetch("/api/v1/intelligence/institutional")
      .then(r => (r.ok ? r.json() : null))
      .then(j => live && setInstitutional(j))
      .catch(() => live && setInstitutional(null))
    return () => { live = false }
  }, [])

  // spec 0026: real sectors only (live, or today's last reading); never a sample list.
  const sectors: SectorRow[] = context?.sectors ?? []

  // spec 0026 AC-3, AC-4: every value is real or a dash; `asOf` labels a last known reading.
  const DASH = "–"
  const adv = context?.advanceCount ?? null
  const dec = context?.declineCount ?? null
  const unch = context?.unchangedCount ?? null
  const totalBreadth = adv !== null && dec !== null && unch !== null ? adv + dec + unch : 0
  const share = (n: number | null) => (n !== null && totalBreadth > 0 ? ((n / totalBreadth) * 100).toFixed(1) : null)
  const advPct = share(adv)
  const decPct = share(dec)
  const unchPct = share(unch)
  const signedPct = (n: number | null | undefined) => (n === null || n === undefined ? DASH : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`)
  const asOfClock = context?.asOf
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(context.asOf))
    : null
  const freshness =
    !context || context.source === "NONE" ? "No live data" : context.source === "LIVE" ? "Live" : `As of ${asOfClock} IST (last real reading today)`
  const vixNote =
    context?.vixStatus === "EXTREME_VOLATILE" ? "Volatility is extreme: expect wide swings and failed breakouts."
    : context?.vixStatus === "ELEVATED" ? "Volatility is elevated: size down and allow wider stops."
    : context?.vixStatus === "LOW_NORMAL" ? "Volatility is in the normal band."
    : "No live VIX reading yet."
  const prov = context?.provenance
  const istTime = (iso: string | null | undefined) =>
    iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(iso)) : DASH

  return (
    <div className="flex flex-col gap-3 sm:gap-margin px-gutter sm:px-gutter-md lg:px-margin-lg py-2 sm:py-space-md lg:py-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">candlestick_chart</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Market Intelligence & Macro Environment
              </h1>
              <span className={`px-2 py-0.5 rounded font-label-code text-label-code font-bold uppercase ${
                isStale ? "bg-accent-danger/20 text-accent-danger" : "bg-status-live-bg text-status-live-text"
              }`}>
                {isStale ? "STALE FEED (>5s)" : "NSE Cash Active"}
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Sector rotation alpha, verified exchange disclosures, and institutional context for intraday execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="font-label-code text-label-code text-text-secondary hidden lg:inline">
            Feed Latency: <strong className="text-text-primary">{feedLatencyMs}ms</strong>
          </span>
          <button
            type="button"
            onClick={() => refresh()}
            className="flex items-center gap-1 font-label-code text-label-code text-primary bg-surface shadow-xs px-space-md py-1.5 rounded font-semibold hover:bg-surface-container transition-colors border border-border-subtle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Alpha Matrix
          </button>
        </div>
      </div>

      {/* Top 4 Macro Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        <p className="sm:col-span-2 xl:col-span-4 -mb-2 font-label-code text-[11px] text-text-secondary" data-testid="market-freshness">
          Market data: <strong className="text-text-primary">{freshness}</strong>
        </p>

        {/* Tile 1: Market Regime */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Broad Market Regime</span>
            <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">
              {context?.regime ?? DASH}
            </span>
          </div>
          <div className="py-space-sm">
            <span className="font-headline-md text-headline-md font-bold text-text-primary">
              {context?.regimeLabel ?? "No live data"}
            </span>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              {context?.regimeDescription ?? "The regime appears once breadth ticks arrive."}
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between text-body-xs text-text-secondary">
            <span>Trend Bias:</span>
            <span className={`font-label-code font-bold ${
              context?.regime === "BEARISH_TREND_DAY" ? "text-accent-danger" : "text-accent-bullish"
            }`}>
              {context?.regime == null ? DASH : context.regime === "BEARISH_TREND_DAY" ? "Short Setups Preferred" : "Long Setups Preferred"}
            </span>
          </div>
        </div>

        {/* Tile 2: Advance / Decline */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">NSE Market Breadth</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-semibold">ALL CASH</span>
          </div>
          <div className="py-space-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="font-metric-lg text-metric-lg text-accent-bullish font-bold">{adv ?? DASH}</span>
                {advPct && <span className="font-label-code text-label-code text-accent-bullish">({advPct}%)</span>}
              </div>
              <span className="font-body-xs text-body-xs text-text-secondary">Advances</span>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <span className="font-metric-lg text-metric-lg text-accent-danger font-bold">{dec ?? DASH}</span>
                {decPct && <span className="font-label-code text-label-code text-accent-danger">({decPct}%)</span>}
              </div>
              <span className="font-body-xs text-body-xs text-text-secondary">Declines</span>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle">
            <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden flex">
              <div className="bg-accent-bullish h-full" style={{ width: `${advPct ?? 0}%` }}></div>
              <div className="bg-border-strong h-full" style={{ width: `${unchPct ?? 0}%` }}></div>
              <div className="bg-accent-danger h-full" style={{ width: `${decPct ?? 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tile 3: Contextual Benchmark (Nifty 50 Non-Tradable) */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Contextual Benchmark</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-semibold">INDEX REF</span>
          </div>
          <div className="py-space-sm">
            <div className="flex items-baseline gap-space-sm">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">
                {context?.niftyLtp != null ? context.niftyLtp.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : DASH}
              </span>
              <span className={`font-metric-md text-metric-md font-bold ${
                (context?.niftyChangePct || 0) >= 0 ? "text-accent-bullish" : "text-accent-danger"
              }`}>
                {signedPct(context?.niftyChangePct)}
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              {context?.pctAboveVwap != null ? `${context.pctAboveVwap}% of watched components holding above session VWAP` : "No live breadth data"}
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-[10px] text-text-secondary">
            <span>Non-Tradable Cash Index</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Tile 4: Volatility Gauge (India VIX) */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">NSE India VIX</span>
            <span className={`px-1.5 py-0.5 rounded font-label-code text-[10px] font-bold ${
              context?.vixStatus === "EXTREME_VOLATILE" ? "bg-accent-danger/20 text-accent-danger" : "bg-status-live-bg text-status-live-text"
            }`}>
              {context?.vixStatus ?? DASH}
            </span>
          </div>
          <div className="py-space-sm">
            <div className="flex items-baseline gap-space-sm">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">
                {context?.vixLtp != null ? context.vixLtp.toFixed(2) : DASH}
              </span>
              <span className={`font-metric-md text-metric-md font-bold ${
                (context?.vixChangePct || 0) <= 0 ? "text-accent-bullish" : "text-accent-danger"
              }`}>
                {signedPct(context?.vixChangePct)}
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              {vixNote}
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-label-code text-text-secondary">
            <span>Range: {context?.vixDayLow != null && context?.vixDayHigh != null ? `${context.vixDayLow.toFixed(2)} – ${context.vixDayHigh.toFixed(2)}` : DASH}</span>
            <span title="Status bands used by the backend">Normal &lt; 16 · Elevated 16 to 22 · Extreme &gt; 22</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Sector Strength Matrix & News Timeline (Cols 1-8) vs Institutional Flow & Provenance (Cols 9-12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left 8 Columns */}
        <div className="xl:col-span-8 flex flex-col gap-margin">
          {/* Panel A: Sector Relative Strength Matrix */}
          <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                  Sector strength vs NIFTY
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary text-body-xs font-semibold tabular-nums">
                  {sectors.length} sectors
                </span>
              </div>
              <span className="text-body-xs text-text-secondary">Sorted by alpha, strongest first</span>
            </div>

            <SectorAlphaTable rows={sectors} />
          </div>

          {/* Panel B: News & Corporate Event Intelligence Timeline */}
          <NewsFilingsTimeline events={news.events} isLoading={news.isLoading} hasLoaded={news.hasLoaded} error={news.error} />
        </div>

        {/* Right 4 Columns */}
        <div className="xl:col-span-4 flex flex-col gap-margin">
          {/* Institutional Flow Context */}
          <InstitutionalFlowCard data={toInstitutionalFlowData(institutional)} />

          {/* Data Pipeline Ingestion Status & Provenance */}
          <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">Data Provenance Registry</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-text-secondary font-label-code text-[10px] font-bold">
                {freshness}
              </span>
            </div>

            <div className="flex flex-col gap-space-xs text-body-xs divide-y divide-border-subtle">
              <div className="py-2 flex items-center justify-between first:pt-0">
                <span className="text-text-secondary">SmartAPI WebSocket:</span>
                <span className={`font-label-code font-bold ${prov?.feed.status === "CONNECTED" ? "text-status-live-text" : "text-text-secondary"}`}>
                  {prov ? `${prov.feed.status}${prov.feed.latencyMs != null ? ` (last tick ${Math.round(prov.feed.latencyMs / 1000)}s ago, ${istTime(prov.feed.lastTickAt)})` : ", no ticks"}` : DASH}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">News fetch:</span>
                <span className={`font-label-code font-semibold ${prov?.news?.status === "failed" ? "text-accent-danger" : "text-text-primary"}`}>
                  {prov?.news ? `Last run ${prov.news.status}${prov.news.finishedAt ? ` at ${istTime(prov.news.finishedAt)}` : ""}` : "No fetch yet"}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">FII/DII EOD Disclosures:</span>
                <span className="font-label-code text-text-secondary font-semibold">Not connected</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">Social Media Policy:</span>
                <span className="font-label-code text-accent-bullish font-bold">STRICTLY EXCLUDED</span>
              </div>
            </div>

            <div className="p-space-sm bg-surface-container-low rounded-lg text-[11px] text-text-secondary font-body-xs mt-1 border border-border-subtle">
              Decision Support Only — Orders must be manually checked and placed in the official Angel One SmartAPI terminal.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
