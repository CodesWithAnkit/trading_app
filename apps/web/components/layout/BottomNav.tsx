"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"

export function BottomNav() {
  const pathname = usePathname()
  const { activeSignals } = useSignals()
  const { openTrades } = useTrades()

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
    { href: "/dashboard/signals", label: "Signals", icon: "bolt", showIndicator: activeSignals.length > 0 },
    { href: "/dashboard/trades", label: "Trades", icon: "stacked_line_chart", showIndicator: openTrades.length > 0 },
    { href: "/dashboard/journal", label: "Journal", icon: "menu_book" },
    { href: "/settings", label: "Settings", icon: "tune" },
  ]

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(19,34,56,0.05)] border-t border-border-subtle lg:hidden"
    >
      <div className="h-16 max-w-[480px] mx-auto px-gutter flex items-center justify-around">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors relative ${
                isActive ? "text-accent-primary font-semibold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {link.icon}
              </span>
              <span className={`font-body-xs text-body-xs tracking-tight ${isActive ? "font-semibold" : "font-normal"}`}>
                {link.label}
              </span>
              {link.showIndicator && !isActive && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-secondary" aria-label="Active items indicator"></span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
