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

  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "OPEN" | "CLOSED">("ALL")
  const [dateFilter, setDateFilter] = React.useState<"ALL" | "TODAY" | "WEEK">("ALL")

  const filteredTrades = React.useMemo(() => {
    return trades.filter(t => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false
      if (dateFilter !== "ALL") {
        const tradeDate = new Date(t.createdAt)
        const today = new Date()
        if (dateFilter === "TODAY") {
          if (tradeDate.toDateString() !== today.toDateString()) return false
        } else if (dateFilter === "WEEK") {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (tradeDate < weekAgo) return false
        }
      }
      return true
    })
  }, [trades, statusFilter, dateFilter])

  const closedTrades = trades.filter(t => t.status === "CLOSED")
  const openTrades = trades.filter(t => t.status === "OPEN")

  const totalNet = closedTrades.reduce((acc, trade) => acc + (trade.netPnl || 0), 0)
  const winningTrades = closedTrades.filter(t => (t.netPnl || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  const handleExport = () => {
    alert("Exporting journal to CSV...")
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-md text-on-surface hover:bg-surface-container-high transition-colors font-medium text-body-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
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

      <div className="bg-surface-container-lowest p-space-lg rounded-md shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-space-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary w-5 h-5" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Journal Entries</h2>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-surface-container border border-outline-variant rounded-md px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="bg-surface-container border border-outline-variant rounded-md px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Past Week</option>
            </select>
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
