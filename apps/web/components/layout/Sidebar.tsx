"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"

export function Sidebar() {
  const pathname = usePathname()
  const { activeSignals } = useSignals()
  const { openTrades } = useTrades()

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
    { href: "/dashboard/signals", label: "Signals", icon: "bolt", badge: activeSignals.length > 0 ? `${activeSignals.length} active` : undefined, badgeClass: "bg-secondary-container text-on-secondary-container" },
    { href: "/dashboard/trades", label: "Trades", icon: "stacked_line_chart", badge: openTrades.length > 0 ? `${openTrades.length} open` : undefined, badgeClass: "bg-primary-fixed text-on-primary-fixed" },
    { href: "/dashboard/journal", label: "Journal", icon: "menu_book" },
    { href: "/dashboard/performance", label: "Performance", icon: "monitoring" },
    { href: "/settings", label: "Settings", icon: "tune" },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-[248px] bg-surface-container-lowest border-r border-outline-variant/40 z-50 hidden lg:flex flex-col justify-between select-none">
      <div className="flex flex-col">
        <div className="h-14 px-space-lg flex items-center gap-space-sm border-b border-outline-variant/30">
          <img
            alt="Intraday Stock Tracker Logo"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1UxFa8RRW4xfGiHV7iI7l2LxYdqev9pMB-L13Bem3d6LpuiYwf4Daj00kNk8RUnwQJAM_1JSx0WsedV2pkz4vNp1cDuFu7bp5BF-yu7-98fuaasD9CFM7PgizzF-dCwHYXipShIP3LDo9zMrHsOUiCI1lUrC4c_GOHS89fUjn1UdnnYaxbirC8bQpHLHSVewNYB2dRQ8nTK50v-J7DJf6H2nbY19QAOgkwuzNH7Th3KkJDCBcnnHXmuVQ"
          />
          <div className="flex flex-col min-w-0 leading-none">
            <span className="font-headline-sm text-body-lg text-on-surface font-semibold truncate tracking-tight">
              Intraday Tracker
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant truncate uppercase">
              NSE Cash Decision Support
            </span>
          </div>
        </div>
        <nav className="p-space-sm flex flex-col gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-space-md py-space-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-surface-container-high text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  <span className="font-body-md text-body-md truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full font-label-numeric-sm text-label-numeric-sm ${link.badgeClass}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="p-space-sm border-t border-outline-variant/30">
        <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/40 flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 shrink-0">
            verified_user
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-bold">
              Safe Execution Mode
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight truncate mt-0.5">
              Manual Journal Only • No Broker Connected
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
