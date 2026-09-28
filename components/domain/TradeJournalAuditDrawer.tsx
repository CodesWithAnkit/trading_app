import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Trade } from "@/mock/trades"
import { type Signal } from "@/mock/signals"
import { format } from "date-fns"
import { ArrowUpRight, ArrowDownRight, Clock, Target, AlertTriangle } from "lucide-react"

interface TradeJournalAuditDrawerProps {
  trade: Trade | null
  signal: Signal | null
  isOpen: boolean
  onClose: () => void
}

export function TradeJournalAuditDrawer({ trade, signal, isOpen, onClose }: TradeJournalAuditDrawerProps) {
  if (!trade) return null

  const isLong = trade.direction === "LONG"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed right-0 top-0 bottom-0 left-auto mt-0 mb-0 h-full w-full max-w-md rounded-none translate-x-0 data-[state=closed]:translate-x-full duration-300 transition-transform overflow-y-auto sm:max-w-md bg-surface border-l border-border text-text shadow-2xl">
        <DialogHeader className="mb-6 border-b border-border pb-4">
          <div className="flex items-center space-x-3">
            <DialogTitle className="text-2xl font-bold tracking-tight leading-none text-text">{trade.symbol}</DialogTitle>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLong ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
              {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isLong ? "Long" : "Short"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(trade.createdAt), "dd MMM yyyy, HH:mm")}
          </div>
        </DialogHeader>

        <div className="space-y-8 pb-8">
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Audit Timeline
            </h3>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {trade.legs.map((leg, index) => (
                <div key={leg.id || index} className="relative">
                  <div className={`absolute -left-7 top-1.5 h-3 w-3 rounded-full border-2 ring-4 ring-surface ${leg.action === 'ENTRY' ? 'border-primary bg-primary-soft' : 'border-long bg-long-soft'}`} />
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-text">
                        {leg.action === "ENTRY" ? "Entry" : leg.action === "PARTIAL_EXIT" ? "Partial Exit" : "Full Exit"}
                      </div>
                      <div className="text-xs text-text-muted font-mono mt-0.5">
                        {format(new Date(leg.timestamp), "HH:mm:ss")}
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <div className="text-sm font-mono font-bold text-text">
                        ₹{leg.price.toFixed(2)}
                      </div>
                      <div className="text-xs text-text-muted font-mono mt-0.5">
                        Qty: {leg.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {signal && (
            <section className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-info" />
                Original Plan
              </h3>
              <div className="bg-surface-muted/30 border border-border p-4 rounded-lg space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-text-muted font-medium">Setup</span>
                  <span className="font-bold text-text bg-surface px-2 py-0.5 rounded border border-border">{signal.setup}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-text-muted font-medium">Entry Zone</span>
                  <span className="font-mono font-semibold text-text">₹{signal.entryZone.low.toFixed(2)} - ₹{signal.entryZone.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center pt-2 border-t border-border/50">
                  <span className="text-text-muted font-medium">Stop Loss</span>
                  <span className="font-mono font-bold text-risk">₹{signal.stop.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-text-muted font-medium">Target 1</span>
                  <span className={`font-mono font-bold ${isLong ? 'text-long' : 'text-short'}`}>₹{signal.targets.t1.toFixed(2)}</span>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <Target className="w-4 h-4 text-text-muted" />
              Execution Summary
            </h3>
            <div className="bg-surface-muted/10 border border-border p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm items-center">
                <span className="text-text-muted font-medium">Avg Entry</span>
                <span className="font-mono font-semibold text-text">₹{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-text-muted font-medium">Avg Exit</span>
                <span className="font-mono font-semibold text-text">{trade.exitPrice ? `₹${trade.exitPrice.toFixed(2)}` : "—"}</span>
              </div>
              {trade.status === "CLOSED" && (
                <div className="flex justify-between text-sm items-center pt-3 border-t border-border">
                  <span className="font-bold text-text">Net P&L</span>
                  <span className={`font-mono font-bold text-lg ${trade.netPnl! >= 0 ? "text-long bg-long-soft" : "text-risk bg-risk-soft"} px-2 py-0.5 rounded`}>
                    {trade.netPnl! >= 0 ? "+" : ""}₹{(trade.netPnl || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {trade.notes && (
            <section className="space-y-3 pt-6 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text">Journal Notes</h3>
              <p className="text-sm text-text-muted bg-surface-muted/50 p-4 rounded-lg border border-border leading-relaxed italic">
                "{trade.notes}"
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
