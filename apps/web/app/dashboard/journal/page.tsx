"use client"
import * as React from "react"
import { TradeTable } from "@/components/domain/TradeTable"
import { type Trade } from "@/mock/trades"
import { TradeJournalAuditDrawer } from "@/components/domain/TradeJournalAuditDrawer"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { 
  Download, 
  PlusCircle, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  Copy,
  Check
} from "lucide-react"

export default function JournalPage() {
  const { trades, openTrades } = useTrades()
  const { signals } = useSignals()
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "OPEN" | "CLOSED">("ALL")
  const [dateFilter, setDateFilter] = React.useState<"ALL" | "TODAY" | "WEEK">("ALL")
  const [copiedText, setCopiedText] = React.useState(false)

  // Quick Risk Calculator State
  const [calcSymbol, setCalcSymbol] = React.useState("TATASTEEL")
  const [calcEntry, setCalcEntry] = React.useState(156.40)
  const [calcStop, setCalcStop] = React.useState(155.20)
  const [calcRiskBudget, setCalcRiskBudget] = React.useState(1500)

  const riskPerShare = Math.max(0.1, Math.abs(calcEntry - calcStop))
  const suggestedQty = Math.floor(calcRiskBudget / riskPerShare)
  const totalTradeCapital = (suggestedQty * calcEntry).toFixed(2)

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
  const totalNet = closedTrades.reduce((acc, trade) => acc + (trade.netPnl || 0), 0)
  const winningTrades = closedTrades.filter(t => (t.netPnl || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

  const handleCopyParams = () => {
    navigator.clipboard.writeText(`NSE CASH | ${calcSymbol} | BUY Qty: ${suggestedQty} @ ₹${calcEntry} | SL: ₹${calcStop}`)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleAuditClick = (trade: Trade) => {
    setSelectedTrade(trade)
  }

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["ID,Symbol,Direction,Entry,Exit,Qty,NetPnL,Status,Date"]
        .concat(trades.map(t => `${t.id},${t.symbol},${t.direction},${t.entryPrice},${t.exitPrice || ""},${t.quantity},${t.netPnl || ""},${t.status},${t.createdAt}`))
        .join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `trade_journal_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">history_edu</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Trade Journal & Position Surveillance
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                {openTrades.length} Active Positions
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Live surveillance of manual executions placed in Angel One with deterministic audit trails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-space-md py-1.5 bg-surface border border-border-subtle rounded font-body-sm text-body-sm font-semibold text-text-primary hover:bg-surface-high transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-text-secondary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 5 Top Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-gutter">
        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Realized P&L</span>
          <span className={`font-metric-lg text-metric-lg font-bold ${totalNet >= 0 ? "text-accent-bullish" : "text-accent-danger"}`}>
            {totalNet >= 0 ? "+" : ""}₹{totalNet.toFixed(2)}
          </span>
          <span className="font-body-xs text-body-xs text-text-secondary">{closedTrades.length} trades settled</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Unrealized P&L</span>
          <span className="font-metric-lg text-metric-lg font-bold text-accent-bullish">+₹840.00</span>
          <span className="font-body-xs text-body-xs text-text-secondary">{openTrades.length} open in Angel One</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Win Rate</span>
          <span className="font-metric-lg text-metric-lg font-bold text-text-primary">{winRate.toFixed(1)}%</span>
          <span className="font-body-xs text-body-xs text-accent-bullish">{winningTrades.length} of {closedTrades.length} profitable</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Session Quota</span>
          <span className="font-metric-lg text-metric-lg font-bold text-text-primary">3 / 6 Used</span>
          <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-accent-primary h-full" style={{ width: "50%" }}></div>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Risk Guard</span>
            <span className="px-1.5 py-0.2 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">SAFE</span>
          </div>
          <span className="font-metric-lg text-metric-lg font-bold text-text-primary">₹0.00 drawn</span>
          <span className="font-body-xs text-body-xs text-text-secondary">Limit: ₹6,000.00 max loss</span>
        </div>
      </div>

      {/* Main Grid: Left Deck (8 Cols) vs Right Calculator & Risk Deck (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left Deck (Cols 1-8): Active Positions & Historical Ledger */}
        <div className="xl:col-span-8 flex flex-col gap-margin">
          {/* Active Open Positions Card */}
          <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-accent-bullish text-[20px]">swap_horizontal_circle</span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold">Live Position Surveillance</h2>
              </div>
              <span className="font-label-code text-label-code text-text-secondary">Mandatory square-off @ 15:15 IST</span>
            </div>

            {openTrades.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">No open positions currently under surveillance.</p>
            ) : (
              openTrades.map(trade => {
                const isLong = trade.direction === "LONG"
                const currentLtp = trade.entryPrice * (isLong ? 1.011 : 0.989)
                const pnl = (currentLtp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1)

                return (
                  <div key={trade.id} className="rounded-lg p-space-md bg-surface-container-low border border-border-subtle flex flex-col gap-space-sm relative overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm">
                        <span className="font-headline-sm text-headline-sm font-bold text-text-primary">{trade.symbol}</span>
                        <span className={`px-1.5 py-0.5 rounded font-label-code text-label-code font-semibold ${
                          isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
                        }`}>
                          {isLong ? "▲ LONG" : "▼ SHORT"}
                        </span>
                        <span className="font-label-code text-label-code text-text-secondary">Qty: {trade.quantity}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
                        Trailing Stop Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm py-space-xs px-space-sm rounded bg-surface border border-border-subtle font-label-code text-label-code">
                      <div>
                        <span className="text-text-secondary uppercase block">Entry</span>
                        <span className="font-bold text-text-primary">₹{trade.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary uppercase block">LTP</span>
                        <span className="font-bold text-accent-bullish">₹{currentLtp.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary uppercase block">Stop Loss</span>
                        <span className="font-bold text-status-live-text">
                          ₹{(isLong ? trade.entryPrice * 0.995 : trade.entryPrice * 1.005).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary uppercase block">Unrealized</span>
                        <span className="font-bold text-accent-bullish">+₹{pnl.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-label-code text-[11px] text-text-secondary">
                        Exits must be executed manually in Angel One
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="h-7 px-2.5 rounded bg-surface shadow-xs font-body-xs font-semibold text-text-primary hover:bg-surface-high transition-colors border border-border-subtle">
                          Partial Exit (50%)
                        </button>
                        <button className="h-7 px-2.5 rounded bg-error-container text-on-error-container font-body-xs font-semibold hover:bg-opacity-90 transition-colors">
                          Full Exit
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Historical Closed Ledger */}
          <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold">Execution Ledger</h2>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-surface border border-border-subtle rounded px-2.5 py-1 text-label-code font-label-code text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value as any)}
                  className="bg-surface border border-border-subtle rounded px-2.5 py-1 text-label-code font-label-code text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">Past Week</option>
                </select>
              </div>
            </div>

            <TradeTable trades={filteredTrades} onAuditClick={handleAuditClick} />
          </div>
        </div>

        {/* Right Deck (Cols 9-12): Angel One Order Replicator & Risk Calculator */}
        <div className="xl:col-span-4 flex flex-col gap-margin">
          {/* Quick Risk Calculator */}
          <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Order Sizing Calculator
                </h3>
              </div>
              <span className="font-label-code text-body-xs text-text-secondary">Fixed-Risk</span>
            </div>

            <div className="flex flex-col gap-space-sm font-label-code text-label-code">
              <div>
                <label className="text-text-secondary text-[11px] block uppercase mb-1">Target Instrument</label>
                <input
                  type="text"
                  value={calcSymbol}
                  onChange={e => setCalcSymbol(e.target.value.toUpperCase())}
                  className="w-full h-8 px-2.5 bg-canvas border border-border-subtle rounded font-bold text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="text-text-secondary text-[11px] block uppercase mb-1">Entry Price (₹)</label>
                  <input
                    type="number"
                    value={calcEntry}
                    onChange={e => setCalcEntry(parseFloat(e.target.value) || 0)}
                    step="0.05"
                    className="w-full h-8 px-2.5 bg-canvas border border-border-subtle rounded font-mono font-semibold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block uppercase mb-1">Stop Loss (₹)</label>
                  <input
                    type="number"
                    value={calcStop}
                    onChange={e => setCalcStop(parseFloat(e.target.value) || 0)}
                    step="0.05"
                    className="w-full h-8 px-2.5 bg-canvas border border-border-subtle rounded font-mono font-semibold text-accent-danger focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary text-[11px] block uppercase mb-1">Risk Budget (₹)</label>
                <input
                  type="number"
                  value={calcRiskBudget}
                  onChange={e => setCalcRiskBudget(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 bg-canvas border border-border-subtle rounded font-mono font-semibold text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Calculated Outputs */}
              <div className="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-1 border border-border-subtle">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Per-Share Risk:</span>
                  <span className="font-bold text-text-primary">₹{riskPerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Suggested Quantity:</span>
                  <span className="font-bold text-accent-bullish text-metric-md">{suggestedQty} Shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Estimated Capital:</span>
                  <span className="font-mono text-text-primary">₹{totalTradeCapital}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyParams}
                className="w-full h-9 rounded bg-primary hover:bg-primary-container text-on-primary font-body-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? "Copied Order Parameters!" : "Copy Order For Angel One"}</span>
              </button>
            </div>
          </div>
        </div>
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
