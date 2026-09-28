"use client"

import * as React from "react"
import { notFound } from "next/navigation"
import { mockSignals } from "@/mock/signals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpiryTimer } from "@/components/domain/ExpiryTimer"
import { CandlestickChart } from "@/components/domain/CandlestickChart"
import { ArrowUp, ArrowDown, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

import { TradeEntryModal } from "@/components/domain/TradeEntryModal"

export default function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const signal = mockSignals.find((s) => s.id === id)
  
  const [isEntryModalOpen, setIsEntryModalOpen] = React.useState(false)

  if (!signal) {
    notFound()
  }

  const isLong = signal.direction === "LONG"

  const handleTradeEntrySubmit = (quantity: number, entryPrice: number) => {
    console.log("Mock Trade Entered", { quantity, entryPrice })
    // In a real app, this would mutate global state or call an API
    alert(`Trade recorded: ${quantity} shares of ${signal.symbol} at ₹${entryPrice}`)
  }

  const validateRisk = (qty: number) => {
    const riskPerShare = Math.abs(signal.price - signal.stop)
    const calculatedRisk = qty * riskPerShare
    const budget = 3000
    if (calculatedRisk > budget) {
      return { valid: false, calculatedRisk, safeQuantity: Math.floor(budget / riskPerShare) }
    }
    return { valid: true, calculatedRisk, safeQuantity: qty }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2 text-text-muted">
          <Link href="/dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center space-x-3">
            <h1 className="text-display font-display tracking-tight leading-none">{signal.symbol}</h1>
            <Badge variant={isLong ? "long" : "short"} className="flex items-center space-x-1">
              {isLong ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span>{isLong ? "Long" : "Short"}</span>
            </Badge>
            <ExpiryTimer status={signal.status} expiresAt={signal.expiresAt} />
          </div>
          <div className="text-body text-text-muted mt-1">
            {signal.setup} • {signal.confidenceBand === "HIGH" ? "High confidence" : signal.confidenceBand === "MEDIUM" ? "Medium confidence" : "Low confidence"}
          </div>
        </div>
      </div>

      {(signal.status === "EXPIRED" || signal.status === "INVALIDATED") && (
        <div className="w-full bg-surface-muted/50 border border-border p-4 rounded-md flex items-center space-x-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-risk" />
          <div className="text-sm">
            <span className="font-medium text-risk">Signal {signal.status === "EXPIRED" ? "Expired" : "Invalidated"}</span>
            <span className="text-text-muted ml-2">
              This signal is no longer active. No new entries should be recorded.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-surface shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-text-muted flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>1m · NSE</span>
                </div>
                <div className="text-heading font-number tabular-nums">
                  ₹{signal.price.toFixed(2)}
                </div>
              </div>
              <CandlestickChart signal={signal} />
            </CardContent>
          </Card>
          
          <Card className="border-border bg-surface shadow-sm">
            <CardHeader>
              <CardTitle>Strategy Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-body mb-6">{signal.rationale}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                <div>
                  <div className="text-label text-text-muted mb-1">Relative Volume</div>
                  <div className="text-sm font-medium">{signal.metrics.relativeVolume}</div>
                </div>
                <div>
                  <div className="text-label text-text-muted mb-1">Trend Alignment</div>
                  <div className="text-sm font-medium">{signal.metrics.trendAlignment}</div>
                </div>
                <div>
                  <div className="text-label text-text-muted mb-1">Volatility</div>
                  <div className="text-sm font-medium">{signal.metrics.volatility}</div>
                </div>
                <div>
                  <div className="text-label text-text-muted mb-1">Liquidity</div>
                  <div className="text-sm font-medium">{signal.metrics.liquidity}</div>
                </div>
                <div>
                  <div className="text-label text-text-muted mb-1">Risk / Reward</div>
                  <div className="text-sm font-medium">{signal.metrics.riskReward}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="border-border bg-surface shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>Trade Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-muted">Entry Zone</span>
                <span className="text-sm font-number font-medium">₹{signal.entryZone.low.toFixed(2)} – ₹{signal.entryZone.high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-risk font-medium">Stop / Invalidation</span>
                <span className="text-sm font-number text-risk font-medium">₹{signal.stop.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-long font-medium">Target 1</span>
                <span className="text-sm font-number font-medium">₹{signal.targets.t1.toFixed(2)}</span>
              </div>
              {signal.targets.t2 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Target 2</span>
                  <span className="text-sm font-number font-medium">₹{signal.targets.t2.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 text-xs text-text-muted">
                Trailing guidance: Trail stop to entry once T1 is reached.
              </div>
            </CardContent>
            <div className="p-4 border-t border-border bg-surface-muted/30 flex flex-col space-y-3">
              <Button 
                variant="journalEnter" 
                size="lg" 
                className="w-full"
                disabled={signal.status !== "ACTIVE" && signal.status !== "EXPIRING"}
                onClick={() => setIsEntryModalOpen(true)}
              >
                I entered
              </Button>
              <div className="flex space-x-3">
                <Button variant="secondary" className="flex-1">Skip</Button>
                <Button variant="secondary" className="flex-1">Watch</Button>
              </div>
              <div className="text-[10px] text-center text-text-muted uppercase tracking-wider mt-2">
                Records your journal only • No broker order is placed
              </div>
            </div>
          </Card>
        </div>
      </div>

      <TradeEntryModal 
        signal={signal} 
        isOpen={isEntryModalOpen} 
        onClose={() => setIsEntryModalOpen(false)} 
        onSubmit={handleTradeEntrySubmit}
        onValidateRisk={validateRisk}
      />
    </div>
  )
}
