"use client"
import * as React from "react"
import { notFound } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { ExpiryTimer } from "@/components/domain/ExpiryTimer"
import { CandlestickChart } from "@/components/domain/CandlestickChart"
import { ArrowUpRight, ArrowDownRight, ArrowLeft, Clock, ShieldAlert, BookOpen, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { TradeEntryModal } from "@/components/domain/TradeEntryModal"

export default function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { signals } = useSignals()
  const signal = signals.find((s) => s.id === id)
  
  const [isEntryModalOpen, setIsEntryModalOpen] = React.useState(false)

  if (!signal) {
    notFound()
  }

  const isLong = signal.direction === "LONG"
  const isExpiredOrInvalidated = signal.status === "EXPIRED" || signal.status === "INVALIDATED"
  const isActionable = signal.status === "ACTIVE" || signal.status === "EXPIRING"

  const handleTradeEntrySubmit = (quantity: number, entryPrice: number) => {
    // Handled in modal or via context update in a real flow.
    // For now we just close and mock alert.
    alert(`Mock Journal Recorded: ${quantity} shares at ₹${entryPrice}`)
    setIsEntryModalOpen(false)
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Breadcrumb / Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard" className="mt-1 p-2 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-text tracking-tight">{signal.symbol}</h1>
            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isLong ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
              {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isLong ? "Long" : "Short"}
            </span>
            <ExpiryTimer status={signal.status} expiresAt={signal.expiresAt} />
          </div>
          <div className="text-sm text-text-muted mt-2 font-medium">
            {signal.setup} • {signal.confidenceBand === "HIGH" ? "High confidence" : signal.confidenceBand === "MEDIUM" ? "Medium confidence" : "Low confidence"}
          </div>
        </div>
      </div>

      {/* Expired / Invalidated State Banner (Screen 3) */}
      {isExpiredOrInvalidated && (
        <div className="bg-surface-muted border border-border p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text">
              Signal {signal.status === "EXPIRED" ? "Expired" : "Invalidated"}
            </span>
            <span className="text-sm text-text-muted mt-1">
              This signal's time horizon has elapsed or the setup was invalidated by price action. It is preserved for historical review but no new entries can be recorded.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chart & Diagnostics */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-muted/30">
              <div className="flex items-center gap-2 text-sm text-text-muted font-medium">
                <Clock className="w-4 h-4" />
                <span>1m timeframe · NSE Cash</span>
              </div>
              <div className="font-mono text-xl font-bold text-text">
                ₹{signal.price.toFixed(2)}
              </div>
            </div>
            <div className="p-4">
              <CandlestickChart data={[]} timeframe="1m" signal={signal} />
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-text tracking-tight mb-4 border-b border-border pb-3">Strategy Reasoning & Diagnostics</h2>
            <div className="text-sm text-text-muted mb-6 leading-relaxed bg-surface-muted/50 p-4 rounded-lg">
              {signal.rationale}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Relative Volume</span>
                <span className="text-sm font-semibold text-text">{signal.metrics.relativeVolume}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Trend Alignment</span>
                <span className="text-sm font-semibold text-text">{signal.metrics.trendAlignment}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Volatility</span>
                <span className="text-sm font-semibold text-text">{signal.metrics.volatility}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Liquidity</span>
                <span className="text-sm font-semibold text-text">{signal.metrics.liquidity}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Risk / Reward</span>
                <span className="text-sm font-semibold text-text">{signal.metrics.riskReward}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: Trade Plan & Actions */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border bg-surface-muted/30">
              <h2 className="text-lg font-bold text-text tracking-tight">Trade Plan</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-muted font-medium">Entry Zone</span>
                <span className="font-mono text-sm font-bold text-text">₹{signal.entryZone.low.toFixed(2)} – ₹{signal.entryZone.high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-risk font-bold">Stop / Invalidation</span>
                <span className="font-mono text-sm font-bold text-risk bg-risk-soft px-2 py-0.5 rounded">₹{signal.stop.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className={`text-sm font-bold ${isLong ? 'text-long' : 'text-short'}`}>Target 1</span>
                <span className={`font-mono text-sm font-bold ${isLong ? 'text-long' : 'text-short'}`}>₹{signal.targets.t1.toFixed(2)}</span>
              </div>
              {signal.targets.t2 && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-text-muted font-medium">Target 2</span>
                  <span className="font-mono text-sm font-bold text-text">₹{signal.targets.t2.toFixed(2)}</span>
                </div>
              )}
              
              <div className="mt-2 p-3 rounded-md bg-info-soft border border-info/20 flex items-start gap-2 text-info">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs font-medium leading-tight">
                  Trailing guidance: Trail stop to entry once T1 is reached.
                </span>
              </div>
            </div>
            
            <div className="p-5 border-t border-border bg-surface-muted/50 flex flex-col gap-3">
              <button 
                disabled={!isActionable}
                onClick={() => setIsEntryModalOpen(true)}
                className="w-full py-3 rounded-lg enabled:bg-primary enabled:hover:bg-primary-hover enabled:text-surface disabled:bg-surface-muted disabled:text-text-muted font-bold transition-colors disabled:opacity-50 disabled:border disabled:border-border flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                I entered
              </button>
              
              <div className="flex gap-3">
                <button 
                  disabled={!isActionable}
                  className="flex-1 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-muted text-text font-semibold transition-colors disabled:opacity-50"
                >
                  Skip
                </button>
                <button 
                  disabled={!isActionable}
                  className="flex-1 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-muted text-text font-semibold transition-colors disabled:opacity-50"
                >
                  Watch
                </button>
              </div>
              
              <div className="text-[10px] text-center text-text-muted uppercase tracking-wider font-bold mt-2">
                Records your journal only • No broker order is placed
              </div>
            </div>
          </div>
          
          {/* Mock Historical Context or Similar */}
          {isExpiredOrInvalidated && (
            <div className="bg-surface border border-border rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-3">Outcome Summary</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">Maximum Favorable Excursion</span>
                  <span className="font-mono text-sm font-bold text-text">+0.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">Maximum Adverse Excursion</span>
                  <span className="font-mono text-sm font-bold text-text">-0.2%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEntryModalOpen && (
        <TradeEntryModal 
          signal={signal} 
          isOpen={isEntryModalOpen} 
          onClose={() => setIsEntryModalOpen(false)} 
          onSubmit={handleTradeEntrySubmit}
          onValidateRisk={validateRisk}
        />
      )}
    </div>
  )
}
