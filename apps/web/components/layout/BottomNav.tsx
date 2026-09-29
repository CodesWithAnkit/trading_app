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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest shadow-lg px-margin py-2 lg:hidden">
      <div className="max-w-[420px] mx-auto flex items-center justify-around">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative ${
                isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span 
                className="material-symbols-outlined text-[22px]" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {link.icon}
              </span>
              <span className={`font-label-caps text-label-caps ${isActive ? 'font-bold' : 'font-semibold'}`}>
                {link.label}
              </span>
              {link.showIndicator && !isActive && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-secondary"></span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
