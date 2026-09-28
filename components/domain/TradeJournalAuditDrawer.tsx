import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Trade } from "@/mock/trades"
import { type Signal } from "@/mock/signals"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

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
      {/* Custom classes to make it a right-side drawer */}
      <DialogContent className="fixed right-0 top-0 bottom-0 left-auto mt-0 mb-0 h-full w-full max-w-md rounded-none translate-x-0 data-[state=closed]:translate-x-full duration-300 transition-transform overflow-y-auto sm:max-w-md">
        <DialogHeader className="mb-6">
          <div className="flex items-center space-x-3">
            <DialogTitle className="text-display font-display tracking-tight leading-none">{trade.symbol}</DialogTitle>
            <Badge variant={isLong ? "long" : "short"}>
              {isLong ? "Long" : "Short"}
            </Badge>
          </div>
          <div className="text-sm text-text-muted mt-1">
            {format(new Date(trade.createdAt), "dd MMM yyyy, HH:mm")}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-subheading font-heading">Audit Timeline</h3>
            <div className="relative pl-6 space-y-6 border-l-2 border-border ml-2">
              {trade.legs.map((leg, index) => (
                <div key={leg.id || index} className="relative">
                  <div className="absolute -left-7.75 top-1 h-3 w-3 rounded-full bg-surface border-2 border-primary" />
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">
                        {leg.action === "ENTRY" ? "Entry" : leg.action === "PARTIAL_EXIT" ? "Partial Exit" : "Full Exit"}
                      </div>
                      <div className="text-xs text-text-muted">
                        {format(new Date(leg.timestamp), "HH:mm:ss")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-number font-medium">
                        ₹{leg.price.toFixed(2)}
                      </div>
                      <div className="text-xs text-text-muted">
                        Qty: {leg.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {signal && (
            <section className="space-y-3 pt-6 border-t border-border">
              <h3 className="text-subheading font-heading">Original Plan</h3>
              <div className="bg-surface-muted/30 p-4 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Setup</span>
                  <span className="font-medium">{signal.setup}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Entry Zone</span>
                  <span className="font-number font-medium">₹{signal.entryZone.low.toFixed(2)} - ₹{signal.entryZone.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Stop Loss</span>
                  <span className="font-number font-medium text-risk">₹{signal.stop.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Target 1</span>
                  <span className="font-number font-medium text-long">₹{signal.targets.t1.toFixed(2)}</span>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-3 pt-6 border-t border-border">
            <h3 className="text-subheading font-heading">Execution Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Avg Entry</span>
                <span className="font-number font-medium">₹{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Avg Exit</span>
                <span className="font-number font-medium">{trade.exitPrice ? `₹${trade.exitPrice.toFixed(2)}` : "—"}</span>
              </div>
              {trade.status === "CLOSED" && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="font-medium">Net P&L</span>
                  <span className={`font-number font-medium ${trade.netPnl! >= 0 ? "text-long" : "text-risk"}`}>
                    {trade.netPnl! >= 0 ? "+" : ""}₹{(trade.netPnl || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {trade.notes && (
            <section className="space-y-3 pt-6 border-t border-border pb-6">
              <h3 className="text-subheading font-heading">Notes</h3>
              <p className="text-sm text-text-muted whitespace-pre-wrap">{trade.notes}</p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
