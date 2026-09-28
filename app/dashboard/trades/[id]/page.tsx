"use client"

import * as React from "react"
import { notFound } from "next/navigation"
import { mockTrades } from "@/mock/trades"
import { mockSignals } from "@/mock/signals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SignalPlan } from "@/components/domain/SignalPlan"
import { ArrowLeft, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

import { TradeExitModal } from "@/components/domain/TradeExitModal"

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const trade = mockTrades.find(t => t.id === id)
  
  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false)

  if (!trade) {
    notFound()
  }

  const signal = trade.signalId ? mockSignals.find(s => s.id === trade.signalId) : null
  const isLong = trade.direction === "LONG"

  const handleExitSubmit = (quantity: number, exitPrice: number, isFullExit: boolean) => {
    console.log("Mock Exit Recorded", { quantity, exitPrice, isFullExit })
    alert(`Exit recorded: ${isFullExit ? 'Full' : 'Partial'} exit of ${quantity} shares at ₹${exitPrice}`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2 text-text-muted">
            <Link href="/dashboard/journal">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center space-x-3">
              <h1 className="text-display font-display tracking-tight leading-none">{trade.symbol}</h1>
              <Badge variant={isLong ? "long" : "short"} className="flex items-center space-x-1">
                {isLong ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                <span>{isLong ? "Long" : "Short"}</span>
              </Badge>
              <Badge variant={trade.status === "OPEN" ? "primary" : "default"}>
                {trade.status === "OPEN" ? "Open" : "Closed"}
              </Badge>
            </div>
            <div className="text-body text-text-muted mt-1">
              Entered {format(new Date(trade.createdAt), "dd MMM yyyy, HH:mm")}
            </div>
          </div>
        </div>
        {trade.status === "OPEN" && (
          <Button variant="journalExit" onClick={() => setIsExitModalOpen(true)}>I exited</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-surface shadow-sm">
            <CardHeader>
              <CardTitle>Trade Leg Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6 border-l-2 border-border ml-2">
                {trade.legs.map((leg) => (
                  <div key={leg.id} className="relative">
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
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-sm">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted whitespace-pre-wrap">{trade.notes}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-surface shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-muted">Avg Entry</span>
                <span className="text-sm font-number font-medium">₹{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-muted">Avg Exit</span>
                <span className="text-sm font-number font-medium">{trade.exitPrice ? `₹${trade.exitPrice.toFixed(2)}` : "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-muted">Quantity</span>
                <span className="text-sm font-number font-medium">{trade.quantity}</span>
              </div>
              {trade.status === "CLOSED" && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Gross P&L</span>
                    <span className="text-sm font-number font-medium">₹{(trade.grossPnl || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Estimated Charges</span>
                    <span className="text-sm font-number font-medium">₹{((trade.grossPnl || 0) - (trade.netPnl || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">Net P&L</span>
                    <span className={`text-sm font-number font-medium ${trade.netPnl! >= 0 ? "text-long" : "text-risk"}`}>
                      {trade.netPnl! >= 0 ? "+" : ""}₹{(trade.netPnl || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {signal && (
            <Card className="border-border bg-surface shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Original Signal Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <SignalPlan signal={signal} />
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href={`/dashboard/signals/${signal.id}`}>View Signal Details</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TradeExitModal 
        trade={trade} 
        isOpen={isExitModalOpen} 
        onClose={() => setIsExitModalOpen(false)} 
        onSubmit={handleExitSubmit} 
      />
    </div>
  )
}
