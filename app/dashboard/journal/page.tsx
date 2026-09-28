"use client"

import * as React from "react"
import { TradeTable } from "@/components/domain/TradeTable"
import { mockTrades, type Trade } from "@/mock/trades"
import { mockSignals } from "@/mock/signals"
import { MetricCard } from "@/components/domain/MetricCard"
import { TradeJournalAuditDrawer } from "@/components/domain/TradeJournalAuditDrawer"

export default function JournalPage() {
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)

  const closedTrades = mockTrades.filter(t => t.status === "CLOSED")
  const openTrades = mockTrades.filter(t => t.status === "OPEN")
  
  const totalNet = closedTrades.reduce((acc, trade) => acc + (trade.netPnl || 0), 0)
  const winningTrades = closedTrades.filter(t => (t.netPnl || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Trade Journal
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Detailed ledger of all executions and audits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <MetricCard 
          title="TOTAL NET P&L" 
          value={`${totalNet >= 0 ? "+" : ""}₹${totalNet.toFixed(2)}`}
          highlightColor={totalNet >= 0 ? "secondary" : "on-surface"}
        />
        <MetricCard 
          title="CLOSED TRADES" 
          value={closedTrades.length.toString()} 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="WIN RATE" 
          value={`${winRate.toFixed(1)}%`} 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="OPEN TRADES" 
          value={openTrades.length.toString()} 
          highlightColor="primary"
        />
      </div>

      <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">history_edu</span>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">All Trades</h2>
            </div>
          </div>
        </div>
        <TradeTable trades={mockTrades} onAuditClick={handleAuditClick} />
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
