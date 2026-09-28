import * as React from "react"
import { type Trade } from "@/mock/trades"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function TradeTable({ trades, onAuditClick }: { trades: Trade[], onAuditClick?: (trade: Trade) => void }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-outline-variant/30 rounded-md bg-surface-container-lowest text-center">
        <span className="text-on-surface-variant text-body mb-4">No open trades recorded yet</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
            <th className="py-2.5 px-3 rounded-l">SYMBOL & SETUP</th>
            <th className="py-2.5 px-2 text-center">BIAS</th>
            <th className="py-2.5 px-3 text-right">QTY</th>
            <th className="py-2.5 px-3 text-right">AVG ENTRY</th>
            <th className="py-2.5 px-3 text-right">LTP (₹)</th>
            <th className="py-2.5 px-3">TRAILED STOP</th>
            <th className="py-2.5 px-3">TARGET (T1/T2)</th>
            <th className="py-2.5 px-3 text-right">UNREALIZED P&L</th>
            <th className="py-2.5 px-3 text-right rounded-r">ACTION</th>
          </tr>
        </thead>
        <tbody className="divide-y-0 text-body-sm">
          {trades.map((trade) => {
            const isLong = trade.direction === "LONG";
            const ltp = trade.entryPrice * 1.01; // Mock LTP based on entry
            const unrealizedPnl = (ltp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1);
            const unrealizedPnlPercent = (unrealizedPnl / (trade.entryPrice * trade.quantity)) * 100;
            const pnlColor = unrealizedPnl >= 0 ? "text-secondary" : "text-error";
            const pnlSign = unrealizedPnl > 0 ? "+" : "";

            return (
              <tr key={trade.id} className="hover:bg-surface-container-low/70 transition-colors group border-b border-outline-variant/20 last:border-0">
                <td className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md font-bold text-on-surface">{trade.symbol}</span>
                    <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                      NSE Cash · {trade.notes || "Setup"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full font-label-caps text-label-caps font-bold whitespace-nowrap",
                    isLong 
                      ? "bg-secondary-container text-on-secondary-container" 
                      : "bg-tertiary-container text-on-tertiary-container"
                  )}>
                    {isLong ? "↑ Long" : "↓ Short"}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md text-on-surface">
                  {trade.quantity}
                </td>
                <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md text-on-surface-variant">
                  ₹{trade.entryPrice.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                  ₹{ltp.toFixed(2)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-numeric-sm text-label-numeric-sm text-error font-medium">
                      SL: ₹{(trade.entryPrice * (isLong ? 0.99 : 1.01)).toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-medium">
                      T1: ₹{(trade.entryPrice * (isLong ? 1.02 : 0.98)).toFixed(2)}
                    </span>
                    <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                      T2: ₹{(trade.entryPrice * (isLong ? 1.03 : 0.97)).toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className={cn("font-label-numeric-md text-label-numeric-md font-bold", pnlColor)}>
                      {pnlSign}₹{unrealizedPnl.toFixed(2)}
                    </span>
                    <span className={cn("font-label-numeric-sm text-label-numeric-sm font-semibold", pnlColor)}>
                      {pnlSign}{unrealizedPnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="h-9 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors">
                      Edit
                    </button>
                    {onAuditClick && (
                      <button 
                        onClick={() => onAuditClick(trade)}
                        className="h-9 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold transition-colors">
                        Audit
                      </button>
                    )}
                    <button className="h-9 px-2.5 rounded bg-error-container text-error hover:bg-error hover:text-on-error font-body-sm font-semibold transition-colors">
                      Journal / Exit
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
