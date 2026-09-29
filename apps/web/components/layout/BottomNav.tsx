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
    { href: "/dashboard", label: "Home", icon: "grid_view" },
    { href: "/dashboard/signals", label: "Signals", icon: "bolt", badge: activeSignals.length > 0 ? activeSignals.length : undefined },
    { href: "/dashboard/trades", label: "Trades", icon: "stacked_line_chart", badge: openTrades.length > 0 ? openTrades.length : undefined },
    { href: "/dashboard/journal", label: "Journal", icon: "menu_book" },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center justify-around px-2 pb-safe z-50">
      {links.map((link) => {
        const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/")
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive ? "text-primary font-medium" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <div className={`flex items-center justify-center w-12 h-8 rounded-full mb-1 transition-colors ${isActive ? "bg-secondary-container text-on-secondary-container" : ""}`}>
              <span className="material-symbols-outlined text-[24px]">{link.icon}</span>
            </div>
            <span className="text-[10px] leading-none tracking-wide">{link.label}</span>
            {link.badge && (
              <span className="absolute top-1 right-3 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold px-1">
                {link.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
