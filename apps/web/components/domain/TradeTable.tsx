"use client"
import * as React from "react"
import { type Trade } from "@/mock/trades"
import { format } from "date-fns"
import Link from "next/link"
import { useTrades } from "@/lib/contexts/TradeContext"

export function TradeTable({ trades, onAuditClick }: { trades: Trade[], onAuditClick?: (trade: Trade) => void }) {
  const { addTradeLeg } = useTrades()
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

  const handleBulkClose = () => {
    let successCount = 0
    let failedCount = 0
    const failedIds: string[] = []

    selectedTradeIds.forEach(id => {
      const trade = trades.find(t => t.id === id)
      if (trade && trade.status === "OPEN") {
        try {
          const ltp = trade.entryPrice * 1.01 // Mock LTP
          addTradeLeg(id, "EXIT", ltp, trade.quantity)
          successCount++
        } catch (error) {
          failedCount++
          failedIds.push(id)
        }
      }
    })

    setSelectedTradeIds(failedIds)
    
    if (failedCount > 0) {
      setToast({ message: `Closed ${successCount} trades. ${failedCount} failed.`, type: "error" })
    } else {
      setToast({ message: `Successfully closed ${successCount} trades.`, type: "success" })
    }
    
    setTimeout(() => setToast(null), 3000)
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border rounded-lg bg-surface-muted/30 text-center">
        <span className="text-text-muted text-sm font-medium">No open trades recorded yet</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto relative pb-16">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-muted text-text-muted text-xs uppercase tracking-wider font-bold">
            <th className="py-3 px-4 rounded-l-md font-bold">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer" 
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
        <tbody className="divide-y divide-border/50 text-sm">
          {trades.map((trade) => {
            const isLong = trade.direction === "LONG";
            const ltp = trade.entryPrice * 1.01; // Mock LTP based on entry
            const unrealizedPnl = (ltp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1);
            const unrealizedPnlPercent = (unrealizedPnl / (trade.entryPrice * trade.quantity)) * 100;
            const pnlColor = unrealizedPnl >= 0 ? "text-long" : "text-risk";
            const pnlSign = unrealizedPnl > 0 ? "+" : "";
            const isSelected = selectedTradeIds.includes(trade.id);
            const isOpen = trade.status === "OPEN";

            return (
              <tr key={trade.id} className={`transition-colors group ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-muted/30'}`}>
                <td className="py-3 px-4">
                  {isOpen ? (
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer" 
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(trade.id, e.target.checked)}
                    />
                  ) : null}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text">{trade.symbol}</span>
                    <span className="text-xs text-text-muted font-medium">
                      NSE Cash · {trade.notes ? "Has Notes" : "Standard Setup"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isLong ? "bg-long-soft text-long" : "bg-short-soft text-short"}`}>
                    {isLong ? "↑ Long" : "↓ Short"}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-text font-medium">
                  {trade.quantity}
                </td>
                <td className="py-3 px-3 text-right font-mono text-text-muted">
                  ₹{trade.entryPrice.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-text">
                  ₹{ltp.toFixed(2)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-risk font-bold">
                      SL: ₹{(trade.entryPrice * (isLong ? 0.99 : 1.01)).toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  {isOpen ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary border border-primary bg-primary-soft px-1.5 py-0.5 rounded">Open</span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted border border-border bg-surface-muted px-1.5 py-0.5 rounded">Closed</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
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
                      <span className={`font-mono text-sm font-bold ${trade.netPnl! >= 0 ? 'text-long' : 'text-risk'}`}>
                        {trade.netPnl! > 0 ? "+" : ""}₹{(trade.netPnl || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-text-muted font-medium">Realized</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onAuditClick && (
                      <button 
                        onClick={() => onAuditClick(trade)}
                        className="h-8 px-3 rounded-md bg-surface border border-border hover:bg-surface-muted text-text text-xs font-bold transition-colors">
                        Audit
                      </button>
                    )}
                    {isOpen ? (
                      <Link 
                        href={`/dashboard/trades/${trade.id}`}
                        className="h-8 px-3 rounded-md flex items-center bg-primary/10 text-primary hover:bg-primary hover:text-surface text-xs font-bold transition-colors">
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

      {selectedTradeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-bold text-text">
            {selectedTradeIds.length} trade{selectedTradeIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedTradeIds([])}
              className="text-sm font-bold text-text-muted hover:text-text px-3 py-1.5 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button 
              onClick={handleBulkClose}
              className="text-sm font-bold bg-primary text-surface px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Close Selected
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-20 right-6 px-4 py-3 rounded-md shadow-lg border z-50 animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success' ? 'bg-long-soft border-long/20 text-long' : 'bg-risk-soft border-risk/20 text-risk'}`}>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
