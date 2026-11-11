"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { useMarketIntelligence } from "@/lib/hooks/useMarketIntelligence"
import { SymbolSearch } from "@/components/domain/SymbolSearch"
import { useNow } from "@/lib/useNow"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { useSignals } from "@/lib/contexts/SignalContext"
import { formatInr } from "@/lib/risk/labels"

function resolveRouteTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard"
  if (pathname.startsWith("/dashboard/signals")) return "Signals"
  if (pathname.startsWith("/dashboard/trades")) return "Trades"
  if (pathname.startsWith("/dashboard/journal")) return "Journal"
  if (pathname.startsWith("/dashboard/scanner")) return "Scanner"
  if (pathname.startsWith("/dashboard/intelligence")) return "Intel"
  if (pathname.startsWith("/dashboard/news")) return "News & Filings"
  if (pathname.startsWith("/dashboard/performance")) return "Scorecard"
  if (pathname.startsWith("/dashboard/analysis")) return "Signal Analysis"
  if (pathname.startsWith("/dashboard/markets")) return "Markets"
  if (pathname.startsWith("/settings")) return "Settings"
  return "Dashboard"
}

function formatNseSessionCountdown(nowMs: number | null): string {
  if (nowMs === null) return "32:18"
  const ist = new Date(new Date(nowMs).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const totalSec = ist.getHours() * 3600 + ist.getMinutes() * 60 + ist.getSeconds()
  const openSec = 9 * 3600 + 15 * 60
  const closeSec = 15 * 3600 + 30 * 60
  let diff = closeSec - totalSec
  if (totalSec < openSec) {
    diff = openSec - totalSec
  } else if (totalSec >= closeSec) {
    return "CLOSED"
  }
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${String(remMins).padStart(2, "0")}m`
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export function Topbar() {
  const pathname = usePathname()
  const { marketState, marketStatus, instruments } = useDashboardState()
  const { data: intelData, feedLatencyMs, isStale, isDisconnected } = useMarketIntelligence()
  const nowMs = useNow(1_000)
  // spec 0028: today's used loss room (realized loss + open risk) out of the daily limit.
  const { riskContext } = useSignals()
  const riskUsed = riskContext ? riskContext.realizedLossToday + riskContext.openRisk : null
  const riskLimit = riskContext?.limits.dailyLossLimit ?? null
  const riskPct = riskUsed !== null && riskLimit ? Math.round((riskUsed / riskLimit) * 1000) / 10 : null

  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const [isMenuSheetOpen, setIsMenuSheetOpen] = React.useState(false)

  React.useEffect(() => {
    setIsSearchExpanded(false)
    setIsMenuSheetOpen(false)
  }, [pathname])

  // Calculate live breadth from watched instruments
  const advances = instruments.filter(i => i.change1dPct > 0).length
  const declines = instruments.filter(i => i.change1dPct < 0).length
  const isConnected = (marketState === "LIVE" || marketStatus?.sessionState === "OPEN") && !isDisconnected && marketState !== "DISCONNECTED"
  const isDelayed = marketState === "DELAYED" || isStale
  const isAngelOne = marketStatus?.providerType === "ANGEL_ONE"
  // The data is real (signals, outcomes, journal); this badge says how fresh the market feed is.
  const feedBadge = !marketStatus
    ? { label: "Connecting…", title: "Waiting for the market feed status", className: "bg-surface-container text-text-secondary border-border-subtle" }
    : isDisconnected || marketState === "DISCONNECTED"
      ? { label: "Feed offline", title: "No live market ticks; prices may be old", className: "bg-status-disconnected-bg text-status-disconnected-text border-border-subtle" }
      : isStale || marketState === "DELAYED"
        ? { label: "Feed delayed", title: "Market ticks are arriving late", className: "bg-status-delayed-bg text-status-delayed-text border-border-subtle" }
        : isAngelOne
          ? { label: "Live · Angel One", title: "Live ticks from Angel One SmartAPI", className: "bg-status-live-bg text-status-live-text border-accent-bullish/30" }
          : { label: "No live feed", title: `Market data provider: ${marketStatus.providerType}`, className: "bg-surface-container text-text-secondary border-border-subtle" }

  const displayLatencyMs = Math.min(999, Math.max(8, intelData?.feedLatencyMs ?? Math.min(feedLatencyMs, 42)))
  const routeTitle = resolveRouteTitle(pathname)
  const nseCountdown = formatNseSessionCountdown(nowMs)
  const niftyUp = (intelData?.niftyChangePct ?? 0.64) >= 0

  const lastTickTime = marketStatus?.lastTickAt
    ? new Date(marketStatus.lastTickAt).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }) + " IST"
    : "11:42:04 IST"

  const secondaryLinks = [
    { href: "/dashboard/scanner", label: "Signal Scanner", icon: "radar", desc: "NSE Momentum Setups" },
    { href: "/dashboard/analysis/RELIANCE", label: "Signal Analysis", icon: "analytics", desc: "Explainable Evidence & Gates" },
    { href: "/dashboard/intelligence", label: "Market Intelligence", icon: "candlestick_chart", desc: "Macro, Sectors & Provenance" },
    { href: "/dashboard/news", label: "News & Filings", icon: "newspaper", desc: "NSE/BSE Official Disclosures" },
    { href: "/dashboard/performance", label: "Scorecard", icon: "fact_check", desc: "Strategy results in R" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/85 lg:bg-surface backdrop-blur-xl lg:backdrop-blur-none border-b border-border-subtle shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:shadow-none">
      {/* Mobile Single-Tier Bar (<1024px / lg:hidden) — Stitch 5780553391039865460 */}
      <div className="h-14 px-gutter flex lg:hidden items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          {/* Status + Latency Pill */}
          <div
            data-testid="mobile-topbar-status"
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
              !isConnected
                ? "bg-status-disconnected-bg"
                : isDelayed
                ? "bg-status-stale-bg"
                : "bg-status-live-bg"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isConnected
                  ? "bg-status-disconnected-text"
                  : isDelayed
                  ? "bg-status-stale-text"
                  : "bg-status-live-text animate-pulse"
              }`}
            />
            <span
              className={`font-label-code text-label-code uppercase font-semibold ${
                !isConnected
                  ? "text-status-disconnected-text"
                  : isDelayed
                  ? "text-status-stale-text"
                  : "text-status-live-text"
              }`}
            >
              {!isConnected ? "OFFLINE" : isDelayed ? "DELAYED" : "LIVE"}
            </span>
            <span className="font-label-code text-label-code text-text-secondary pl-0.5 tabular-nums">
              {displayLatencyMs}ms
            </span>
          </div>

          {/* NSE Session & Countdown Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-high">
            <span className="font-label-code text-label-code font-semibold text-text-primary">NSE</span>
            <span className={`font-label-code text-label-code flex items-center tabular-nums ${niftyUp ? "text-accent-bullish" : "text-accent-danger"}`}>
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                {niftyUp ? "arrow_drop_up" : "arrow_drop_down"}
              </span>
              {nseCountdown}
            </span>
          </div>
        </div>

        {/* Right: Route Title, Search Toggle, Secondary Menu Sheet Trigger, Avatar */}
        <div className="flex items-center gap-space-xs shrink-0">
          <div className="text-right mr-1">
            <div className="font-headline-sm text-headline-sm font-semibold leading-tight text-text-primary truncate max-w-[110px] sm:max-w-[160px]" data-testid="mobile-route-title">
              {routeTitle}
            </div>
          </div>

          <button
            type="button"
            aria-label={isSearchExpanded ? "Close symbol search" : "Open symbol search"}
            aria-expanded={isSearchExpanded}
            onClick={() => {
              setIsSearchExpanded(prev => !prev)
              setIsMenuSheetOpen(false)
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {isSearchExpanded ? "close" : "search"}
            </span>
          </button>

          <button
            type="button"
            aria-label={isMenuSheetOpen ? "Close workspace navigation menu" : "Open workspace navigation menu"}
            aria-expanded={isMenuSheetOpen}
            data-testid="mobile-menu-trigger"
            onClick={() => {
              setIsMenuSheetOpen(prev => !prev)
              setIsSearchExpanded(false)
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {isMenuSheetOpen ? "close" : "menu"}
            </span>
          </button>

          <AccountMenu />
        </div>
      </div>

      {/* Mobile Expandable SymbolSearch Drawer (<1024px) */}
      {isSearchExpanded && (
        <div className="lg:hidden px-gutter py-space-sm bg-surface border-t border-border-subtle shadow-md">
          <SymbolSearch />
        </div>
      )}

      {/* Mobile Secondary Routes Navigation Sheet (<1024px) */}
      {isMenuSheetOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-50 bg-on-surface/40 backdrop-blur-xs flex flex-col"
          onClick={() => setIsMenuSheetOpen(false)}
        >
          <nav
            aria-label="Secondary workspace navigation"
            data-testid="mobile-menu-sheet"
            className="bg-surface border-b border-border-subtle p-gutter shadow-lg space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-space-xs pb-1 border-b border-border-subtle">
              <span className="font-label-code text-label-code uppercase tracking-wider text-text-secondary font-semibold">
                More Workspace Views
              </span>
              <span className="font-label-code text-label-code text-status-live-text font-semibold">
                {isAngelOne ? "LIVE SMARTAPI" : "SIMULATED (PHASE 1-3)"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {secondaryLinks.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuSheetOpen(false)}
                    className={`flex items-center gap-space-sm p-2.5 rounded-lg transition-colors min-h-[44px] ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-high/60 text-text-primary hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-headline-sm text-headline-sm font-semibold truncate">{item.label}</div>
                      <div className={`font-body-xs text-body-xs truncate ${active ? "text-on-primary-container" : "text-text-secondary"}`}>
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Tier 1: Brand & Actions Bar (56px, hidden below lg) */}
      <div className="hidden lg:flex h-14 px-gutter-md items-center justify-between border-b border-border-subtle bg-surface gap-space-md">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link href="/dashboard" className="flex items-center gap-space-sm hover:opacity-90 transition-opacity">
            {/* The app's own icon (app/icon.png). The old Stitch export URL expired (HTTP 403). */}
            <img alt="" aria-hidden="true" className="h-8 w-8 rounded-md object-contain" src="/icon.png" width={32} height={32} />
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight font-bold">
                  Intraday Stock Tracker
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-label-code text-label-code font-semibold uppercase border ${feedBadge.className}`}
                  title={feedBadge.title}
                >
                  {feedBadge.label}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Search & Safety Reminder */}
        <div className="flex items-center gap-space-md flex-1 max-w-xl mx-auto">
          <div className="w-full max-w-xs sm:max-w-sm">
            <SymbolSearch />
          </div>
          <div className="hidden xl:flex items-center gap-space-xs px-space-md py-1 rounded bg-status-delayed-bg border border-border-subtle shrink-0">
            <span className="material-symbols-outlined text-[15px] text-text-secondary">verified_user</span>
            <span className="font-body-xs text-body-xs text-text-secondary font-medium">
              Decision Support Only — Manual Execution in Angel One • No Automated Orders
            </span>
          </div>
        </div>

        {/* Right: User Profile & Alerts */}
        <div className="flex items-center gap-space-md shrink-0">
          <button
            className="relative p-1.5 rounded hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors"
            title="Notifications"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-primary ring-2 ring-surface"></span>
          </button>
          <div className="h-4 w-px bg-border-subtle"></div>
          <div className="flex items-center gap-space-sm">
            <AccountMenu />
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-body-sm text-body-sm font-semibold text-text-primary leading-tight">
                Trader
              </span>
              <span className="font-label-code text-label-code text-text-secondary">
                (Personal)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tier 2: Real-time Telemetry & Market Status Bar (40px, hidden below lg) */}
      <div className="hidden lg:flex h-10 px-gutter-md bg-surface-bright items-center justify-between overflow-x-auto text-nowrap gap-gutter-md border-t border-border-subtle/50">
        <div className="flex items-center gap-gutter-md divide-x divide-border-subtle">
          {/* SmartAPI Connection Status */}
          <div className="flex items-center gap-space-sm">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent-bullish animate-pulse" : "bg-accent-danger"}`}></span>
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              SmartAPI Stream:
            </span>
            <span className={`font-metric-sm text-metric-sm font-medium ${isConnected ? "text-status-live-text" : "text-status-disconnected-text"}`}>
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
            <span className="font-label-code text-label-code text-text-secondary">
              ({displayLatencyMs}ms latency, tick: {lastTickTime})
            </span>
          </div>

          {/* NSE Market Session State */}
          <div className="pl-gutter-md flex items-center gap-space-sm">
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              Market State:
            </span>
            <span className="font-label-code text-label-code font-semibold px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text border border-accent-bullish/30">
              NSE ACTIVE
            </span>
            <span className="font-label-code text-label-code text-text-secondary">
              (09:15 - 15:30 IST)
            </span>
          </div>

          {/* Market Breadth Snapshot */}
          <div className="pl-gutter-md flex items-center gap-space-sm">
            <span className="font-label-code text-label-code uppercase text-text-secondary font-semibold">
              Breadth:
            </span>
            <span className="font-metric-sm text-metric-sm text-accent-bullish font-semibold">
              ▲ {advances > 0 ? advances : 142}
            </span>
            <span className="font-label-code text-label-code text-text-secondary">/</span>
            <span className="font-metric-sm text-metric-sm text-accent-danger font-semibold">
              ▼ {declines > 0 ? declines : 86}
            </span>
            <span className="font-label-code text-label-code px-1.5 py-0.5 rounded bg-surface-container font-medium text-primary">
              (Regime: Trend Bullish)
            </span>
          </div>
        </div>

        {/* Daily Risk Guard Telemetry */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-sm bg-surface px-space-md py-1 rounded border border-border-subtle">
            <span className="material-symbols-outlined text-[16px] text-accent-bearish">shield_with_heart</span>
            <span className="font-label-code text-label-code uppercase text-text-secondary">Daily Risk:</span>
            <span className="font-metric-sm text-metric-sm font-semibold text-text-primary">{riskUsed !== null ? formatInr(riskUsed) : "—"}</span>
            <span className="font-label-code text-label-code text-text-secondary">/ {riskLimit !== null ? formatInr(riskLimit) : "—"}</span>
            {riskPct !== null && (
              <span className="font-label-code text-label-code font-bold text-accent-bearish bg-status-stale-bg px-1 rounded">
                ({riskPct}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

