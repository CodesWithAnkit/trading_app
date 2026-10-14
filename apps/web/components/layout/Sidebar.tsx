"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"

export function Sidebar() {
  const pathname = usePathname()
  const { activeSignals, approachingSignals } = useSignals()
  const { openTrades } = useTrades()

  const totalNewSignals = activeSignals.length + approachingSignals.length

  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: "terminal"
    },
    {
      href: "/dashboard/scanner",
      label: "Signal Scanner",
      icon: "radar",
      badge: totalNewSignals > 0 ? `${totalNewSignals} New` : "4 New",
      badgeClass: "bg-accent-primary text-on-primary font-bold"
    },
    {
      href: "/dashboard/analysis/RELIANCE",
      label: "Signal Analysis",
      icon: "analytics"
    },
    {
      href: "/dashboard/intelligence",
      label: "Market Intelligence",
      icon: "candlestick_chart"
    },
    {
      href: "/dashboard/news",
      label: "News & Filings",
      icon: "newspaper"
    },
    {
      href: "/dashboard/journal",
      label: "Trade Journal",
      icon: "history_edu",
      badge: openTrades.length > 0 ? `${openTrades.length} Open` : "2 Open",
      badgeClass: "bg-status-live-bg text-status-live-text border border-accent-bullish/30 font-bold"
    },
    {
      href: "/dashboard/performance",
      label: "Performance & Validation",
      icon: "fact_check"
    },
    {
      href: "/dashboard/signals",
      label: "Alert History",
      icon: "notifications"
    },
    {
      href: "/settings",
      label: "Settings & Risk",
      icon: "tune"
    },
  ]

  return (
    <aside className="fixed left-0 top-24 bottom-0 w-64 bg-surface border-r border-border-subtle z-40 hidden lg:flex flex-col justify-between overflow-y-auto">
      <div className="p-space-md">
        <div className="px-space-sm pb-space-sm text-label-code font-label-code text-text-secondary uppercase tracking-wider font-semibold">
          Workspace Navigation
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href)

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center justify-between px-space-md py-2 rounded transition-colors ${
                  isActive
                    ? "bg-primary text-on-primary font-semibold shadow-sm"
                    : "text-text-secondary hover:bg-surface-high hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-space-md min-w-0">
                  <span className="material-symbols-outlined text-[19px] shrink-0">
                    {link.icon}
                  </span>
                  <span className="font-body-sm text-body-sm truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`px-1.5 py-0.5 rounded font-label-code text-label-code ${link.badgeClass}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Engine Health & Telemetry Box */}
      <div className="p-space-md border-t border-border-subtle bg-surface-bright">
        <div className="rounded border border-border-subtle bg-surface p-space-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">
              Engine Status
            </span>
            <span className="font-label-code text-label-code text-status-live-text font-bold">
              NOMINAL
            </span>
          </div>
          <div className="flex items-center justify-between text-body-xs font-label-code text-text-secondary">
            <span>Feed Engine:</span>
            <span className="text-text-primary font-metric-sm">v2.4.1</span>
          </div>
          <div className="flex items-center justify-between text-body-xs font-label-code text-text-secondary">
            <span>Rule Engine:</span>
            <span className="text-text-primary font-metric-sm">v1.8.9</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
