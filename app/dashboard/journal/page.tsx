"use client"
import * as React from "react"
import { TradeTable } from "@/components/domain/TradeTable"
import { type Trade } from "@/mock/trades"
import { MetricCard } from "@/components/domain/MetricCard"
import { TradeJournalAuditDrawer } from "@/components/domain/TradeJournalAuditDrawer"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { BookOpen } from "lucide-react"

export default function JournalPage() {
  const { trades } = useTrades()
  const { signals } = useSignals()
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)

  const closedTrades = trades.filter(t => t.status === "CLOSED")
  const openTrades = trades.filter(t => t.status === "OPEN")
  
  const totalNet = closedTrades.reduce((acc, trade) => acc + (trade.netPnl || 0), 0)
  const winningTrades = closedTrades.filter(t => (t.netPnl || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            Trade Journal
          </h1>
          <p className="text-sm text-text-muted flex items-center gap-2 mt-1 font-medium">
            Detailed ledger of all executions and audits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

      <div className="bg-surface border border-border p-6 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary w-5 h-5" />
            <h2 className="text-lg font-bold text-text tracking-tight">All Trades</h2>
          </div>
        </div>
        <TradeTable trades={trades} onAuditClick={handleAuditClick} />
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
