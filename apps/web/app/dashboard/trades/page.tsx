"use client"

import * as React from "react"
import { TradeTable } from "@/components/domain/TradeTable"
import { TradeJournalAuditDrawer } from "@/components/domain/TradeJournalAuditDrawer"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { Trade } from "@/mock/trades"

export default function TradesPage() {
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const { trades } = useTrades()
  const { signals } = useSignals()
  
  const [filter, setFilter] = React.useState<"ALL" | "OPEN" | "CLOSED">("ALL")

  const filteredTrades = React.useMemo(() => {
    if (filter === "ALL") return trades
    return trades.filter(t => t.status === filter)
  }, [trades, filter])

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Trades
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            View and manage all your trading positions
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">stacked_line_chart</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              Trade History ({filteredTrades.length})
            </h2>
          </div>
          
          <div className="flex gap-2">
            {(["ALL", "OPEN", "CLOSED"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-body-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        
        <TradeTable trades={filteredTrades} onAuditClick={handleAuditClick} />
      </div>
      
      <TradeJournalAuditDrawer 
        trade={selectedTrade}
        signal={selectedTrade ? signals.find(s => s.id === selectedTrade.signalId) || null : null}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  )
}
