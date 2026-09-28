"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, LayoutDashboard, Zap, TrendingUp, BookOpen, BarChart2, Settings, ShieldCheck } from "lucide-react"
import { useSignals } from "@/lib/contexts/SignalContext"
import { useTrades } from "@/lib/contexts/TradeContext"

export function Sidebar() {
  const pathname = usePathname()
  const { activeSignals } = useSignals()
  const { openTrades } = useTrades()

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/signals", label: "Signals", icon: Zap, badge: activeSignals.length > 0 ? `${activeSignals.length} active` : undefined, badgeClass: "bg-info-soft text-info" },
    { href: "/dashboard/trades", label: "Trades", icon: TrendingUp, badge: openTrades.length > 0 ? `${openTrades.length} open` : undefined, badgeClass: "bg-primary text-surface" },
    { href: "/dashboard/journal", label: "Journal", icon: BookOpen },
    { href: "/dashboard/performance", label: "Performance", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <aside className="w-18 lg:w-62 h-full hidden md:flex flex-col border-r border-border bg-surface shrink-0 transition-all">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="h-16 px-4 flex items-center gap-3 border-b border-border shrink-0">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shrink-0">
             <Activity className="w-5 h-5 text-surface" />
          </div>
          <div className="hidden lg:flex flex-col min-w-0 leading-none">
            <span className="text-body font-semibold text-text truncate tracking-tight">
              Intraday
            </span>
            <span className="text-[10px] font-bold text-text-muted truncate uppercase tracking-wider mt-1">
              Decision Support
            </span>
          </div>
        </div>
        <nav className="p-2 flex flex-col gap-1 mt-2">
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/settings")

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-canvas text-primary font-semibold"
                    : "text-text-muted hover:bg-canvas hover:text-text"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <link.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                  <span className="text-sm truncate hidden lg:block">{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`hidden lg:block px-1.5 py-0.5 rounded font-mono text-[10px] font-medium ${link.badgeClass}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-border hidden lg:block shrink-0">
        <div className="p-3 rounded-md bg-canvas border border-border flex items-start gap-2">
          <ShieldCheck className="text-info w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-text uppercase tracking-wider font-bold">
              Safe Execution Mode
            </span>
            <span className="text-xs text-text-muted leading-tight mt-1">
              Manual Journal Only • No Broker Connected
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
