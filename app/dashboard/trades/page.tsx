"use client"

import * as React from "react"
import { TradeTable } from "@/components/domain/TradeTable"
import { mockTrades, type Trade } from "@/mock/trades"
import { mockSignals } from "@/mock/signals"
import { TradeJournalAuditDrawer } from "@/components/domain/TradeJournalAuditDrawer"

export default function TradesPage() {
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const openTrades = mockTrades.filter(t => t.status === "OPEN")

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Open Trades
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Manage your actively managed positions
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">stacked_line_chart</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              Active Positions ({openTrades.length})
            </h2>
          </div>
        </div>
        <TradeTable trades={openTrades} onAuditClick={handleAuditClick} />
      </div>
      
      <TradeJournalAuditDrawer 
        trade={selectedTrade}
        signal={selectedTrade ? mockSignals.find(s => s.id === selectedTrade.signalId) || null : null}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  )
}
