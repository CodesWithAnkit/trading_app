"use client"
import * as React from "react"
import { type Trade } from "@/mock/trades"
import Link from "next/link"
import { MobilePositionCard } from "./MobilePositionCard"

export function TradeTable({
  trades,
  onAuditClick,
  onCloseClick,
  isLocked = false,
}: {
  trades: Trade[]
  onAuditClick?: (trade: Trade) => void
  /** spec 0028: opens the close dialog (real exit price, server side P&L). */
  onCloseClick?: (trade: Trade) => void
  isLocked?: boolean
}) {
  const [selectedTradeIds, setSelectedTradeIds] = React.useState<string[]>([])
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null)

  const openTrades = trades.filter(t => t.status === "OPEN")
  const allOpenIds = openTrades.map(t => t.id)
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTradeIds(allOpenIds)
    } else {
      setSelectedTradeIds([])
    }
  }

  const handleSelectOne = (tradeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTradeIds(prev => [...prev, tradeId])
    } else {
      setSelectedTradeIds(prev => prev.filter(id => id !== tradeId))
    }
  }

  // spec 0028: every close needs the real exit price, so a bulk close can no longer invent one
  // (it used entry × 1.01). Close each selected trade with its own exit price instead.
  const handleBulkClose = () => {
    setToast({
      message: `Close each trade with its real exit price (${selectedTradeIds.length} selected). Use the Close button on each row.`,
      type: "error",
    })
    setTimeout(() => setToast(null), 4000)
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border-subtle rounded-lg bg-surface-high/30 text-center">
        <span className="text-text-secondary text-sm font-medium">No open trades recorded yet</span>
      </div>
    )
  }

  return (
    <div className="relative pb-16">
      {/* Mobile Stacked Position Cards (<768px / md:hidden) */}
      <div className="md:hidden space-y-2.5" data-testid="mobile-trade-cards">
        {allOpenIds.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1.5 bg-surface-high rounded-lg font-label-code text-label-code text-text-secondary">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary accent-primary cursor-pointer"
                checked={selectedTradeIds.length > 0 && selectedTradeIds.length === allOpenIds.length}
                onChange={handleSelectAll}
              />
              <span>Select all open positions ({allOpenIds.length})</span>
            </label>
            {selectedTradeIds.length > 0 && (
              <span className="text-accent-primary font-semibold">{selectedTradeIds.length} selected</span>
            )}
          </div>
        )}
        {trades.map(trade => (
          <MobilePositionCard
            key={trade.id}
            trade={trade}
            isSelected={selectedTradeIds.includes(trade.id)}
            onSelectChange={handleSelectOne}
            onAuditClick={onAuditClick}
            isLocked={isLocked}
          />
        ))}
      </div>

      {/* Desktop & Tablet Table (>=768px / hidden md:block) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-high text-text-secondary text-xs uppercase tracking-wider font-bold">
              <th className="py-3 px-4 rounded-l-md font-bold">
                <input 
                  type="checkbox" 
                  aria-label="Select all open trades"
                  className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary accent-primary cursor-pointer" 
                  checked={selectedTradeIds.length > 0 && selectedTradeIds.length === allOpenIds.length}
                  onChange={handleSelectAll}
                  disabled={allOpenIds.length === 0}
                />
              </th>
              <th className="py-3 px-4 font-bold">Symbol & Setup</th>
              <th className="py-3 px-3 text-center font-bold">Bias</th>
              <th className="py-3 px-3 text-right font-bold">Qty</th>
              <th className="py-3 px-3 text-right font-bold">Avg Entry</th>
              <th className="py-3 px-3 text-right font-bold">LTP (₹)</th>
              <th className="py-3 px-3 font-bold">Trailed Stop</th>
              <th className="py-3 px-3 font-bold">Status</th>
              <th className="py-3 px-3 text-right font-bold">Unrealized P&L</th>
              <th className="py-3 px-4 text-right rounded-r-md font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-sm">
            {trades.map((trade) => {
              const isLong = trade.direction === "LONG";
              const ltp = trade.entryPrice * 1.01; // Mock LTP based on entry
              const unrealizedPnl = (ltp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1);
              const unrealizedPnlPercent = (unrealizedPnl / (trade.entryPrice * trade.quantity)) * 100;
              const pnlColor = unrealizedPnl >= 0 ? "text-accent-bullish" : "text-accent-danger";
              const pnlSign = unrealizedPnl > 0 ? "+" : "";
              const isSelected = selectedTradeIds.includes(trade.id);
              const isOpen = trade.status === "OPEN";

              return (
                <tr key={trade.id} className={`transition-colors group ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-high/40'}`}>
                  <td className="py-3 px-4">
                    {isOpen ? (
                      <input 
                        type="checkbox" 
                        aria-label={`Select trade ${trade.symbol}`}
                        className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary accent-primary cursor-pointer" 
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(trade.id, e.target.checked)}
                      />
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary">{trade.symbol}</span>
                      <span className="text-xs text-text-secondary font-medium">
                        NSE Cash · {trade.notes ? "Has Notes" : "Standard Setup"}
                      </span>
                      {(trade.flags ?? []).map(f => (
                        <span key={f} className="mt-1 self-start rounded-full border border-status-stale-text/40 bg-status-stale-bg px-2 py-0.5 text-[11px] font-semibold text-status-stale-text">
                          {f === "NO_QUANTITY" ? "No quantity" : "Check direction"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"}`}>
                      {isLong ? "↑ Long" : "↓ Short"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-text-primary font-medium tabular-nums">
                    {trade.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary tabular-nums">
                    ₹{trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-text-primary tabular-nums">
                    ₹{ltp.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-accent-danger font-bold tabular-nums">
                        SL: ₹{(trade.stopLoss ?? trade.entryPrice * (isLong ? 0.99 : 1.01)).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {isOpen ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary border border-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded">Open</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary border border-border-subtle bg-surface-high px-1.5 py-0.5 rounded">
                        {trade.journalStatus === "WON" ? "Won" : trade.journalStatus === "LOST" ? "Lost" : trade.journalStatus === "CANCELLED" ? "Cancelled" : "Closed"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {isOpen ? (
                      <div className="flex flex-col items-end">
                        <span className={`font-mono text-sm font-bold ${pnlColor}`}>
                          {pnlSign}₹{unrealizedPnl.toFixed(2)}
                        </span>
                        <span className={`font-mono text-xs font-semibold ${pnlColor}`}>
                          {pnlSign}{unrealizedPnlPercent.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={`font-mono text-sm font-bold ${(trade.netPnl || 0) >= 0 ? 'text-accent-bullish' : 'text-accent-danger'}`}>
                          {(trade.netPnl || 0) > 0 ? "+" : ""}₹{(trade.netPnl || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-text-secondary font-medium">Realized</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onAuditClick && (
                        <button 
                          type="button"
                          onClick={() => onAuditClick(trade)}
                          className="h-8 px-3 rounded-md bg-surface border border-border-subtle hover:bg-surface-high text-text-primary text-xs font-bold transition-colors">
                          Audit
                        </button>
                      )}
 {isOpen && onCloseClick && (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => onCloseClick(trade)}
                          className="h-8 px-3 rounded-md bg-surface border border-border-subtle hover:bg-surface-high text-text-primary text-xs font-bold transition-colors disabled:opacity-50">
                          Close
                        </button>
                      )}
                      {isOpen ? (
                        <Link 
                          href={`/dashboard/trades/${trade.id}`}
                          className="h-8 px-3 rounded-md flex items-center bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-xs font-bold transition-colors">
                          Manage
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedTradeIds.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border-subtle shadow-lg rounded-full px-5 sm:px-6 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 z-50 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-bold text-text-primary whitespace-nowrap">
            {selectedTradeIds.length} trade{selectedTradeIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setSelectedTradeIds([])}
              className="text-sm font-bold text-text-secondary hover:text-text-primary px-3 py-1.5 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button 
              type="button"
              disabled={isLocked}
              onClick={handleBulkClose}
              className="text-sm font-bold bg-primary text-on-primary px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer shadow-sm whitespace-nowrap disabled:opacity-50"
            >
              Close Selected
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-24 lg:bottom-20 right-4 sm:right-6 px-4 py-3 rounded-md shadow-lg border z-50 animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success' ? 'bg-status-live-bg border-accent-bullish/30 text-status-live-text' : 'bg-status-disconnected-bg border-accent-danger/30 text-status-disconnected-text'}`}>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

