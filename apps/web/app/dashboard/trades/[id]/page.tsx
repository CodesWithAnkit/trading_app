"use client"
import * as React from "react"
import { notFound } from "next/navigation"
import { useTrades } from "@/lib/contexts/TradeContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { ArrowUpRight, ArrowDownRight, ArrowLeft, TrendingUp, History, CheckCircle2, ChevronRight, Activity } from "lucide-react"
import Link from "next/link"
import { TradeExitModal } from "@/components/domain/TradeExitModal"

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { trades } = useTrades()
  const { signals } = useSignals()
  const trade = trades.find((t) => t.id === id)
  
  const [isExitModalOpen, setIsExitModalOpen] = React.useState(false)

  if (!trade) {
    notFound()
  }

  const linkedSignal = signals.find((s) => s.id === trade.signalId)
  const isLong = trade.direction === "LONG"
  const ltp = trade.entryPrice * (isLong ? 1.01 : 0.99) // mock ltp
  const stop = linkedSignal?.stop || (trade.entryPrice * (isLong ? 0.99 : 1.01))
  const target1 = linkedSignal?.targets?.t1 || (trade.entryPrice * (isLong ? 1.02 : 0.98))
  
  const unrealizedPnl = (ltp - trade.entryPrice) * trade.quantity * (isLong ? 1 : -1)
  const pnlPercent = ((ltp - trade.entryPrice) / trade.entryPrice) * 100 * (isLong ? 1 : -1)
  const isProfitable = unrealizedPnl > 0

  const handleTradeExitSubmit = (quantity: number, exitPrice: number, isFullExit: boolean) => {
    // In a real app this would call Context/API to record the exit
    alert(`Mock Journal: ${isFullExit ? 'Full' : 'Partial'} Exit Recorded - ${quantity} shares at ₹${exitPrice}`)
    setIsExitModalOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Breadcrumb / Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard" className="mt-1 p-2 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-text tracking-tight">{trade.symbol}</h1>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isLong ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
                {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isLong ? "Long" : "Short"}
              </span>
              {trade.status === "OPEN" ? (
                <span className="px-2 py-1 bg-primary text-surface rounded-md text-xs font-bold uppercase tracking-wider border border-primary">
                  Open
                </span>
              ) : (
                <span className="px-2 py-1 bg-surface-muted text-text-muted rounded-md text-xs font-bold uppercase tracking-wider border border-border">
                  Closed
                </span>
              )}
            </div>
            
            {/* P&L Header Metric */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Unrealized P&L</span>
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-2xl font-bold tracking-tight ${isProfitable ? 'text-long' : 'text-risk'}`}>
                  {unrealizedPnl >= 0 ? '+' : '-'}₹{Math.abs(unrealizedPnl).toFixed(2)}
                </span>
                <span className={`font-mono text-sm font-semibold ${isProfitable ? 'text-long' : 'text-risk'}`}>
                  {pnlPercent >= 0 ? '+' : '-'}Math.abs(pnlPercent).toFixed(2)%
                </span>
              </div>
            </div>
          </div>
          <div className="text-sm text-text-muted mt-2 font-medium">
            Entry: {new Date(trade.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • 1m timeframe • NSE Cash
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trade Details & Log */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-surface-muted/30 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text tracking-tight">Active Trade Monitor</h2>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Avg Entry</span>
                <span className="font-mono text-lg font-bold text-text">₹{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">LTP</span>
                <span className="font-mono text-lg font-bold text-text">₹{ltp.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Current Qty</span>
                <span className="font-mono text-lg font-bold text-text">{trade.quantity}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Initial Qty</span>
                <span className="font-mono text-lg font-bold text-text-muted">{trade.legs[0]?.quantity || trade.quantity}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Hard Stop Loss</span>
                <span className="font-mono text-lg font-bold text-risk">₹{stop.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider">Target 1</span>
                <span className={`font-mono text-lg font-bold ${isLong ? 'text-long' : 'text-short'}`}>₹{target1.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="h-48 bg-surface-muted border-t border-border flex items-center justify-center relative overflow-hidden">
              <span className="text-text-muted font-medium text-sm z-10 bg-surface/80 px-3 py-1 rounded backdrop-blur-sm border border-border">Live Chart Plugin Placeholder</span>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#D9E1EC 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-text tracking-tight mb-4 border-b border-border pb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-text-muted" />
              Execution Log
            </h2>
            
            <div className="relative pl-5 space-y-6 before:absolute before:left-1.75 before:top-2 before:bottom-2 before:w-0.5 before:bg-border mt-4">
              {trade.legs.map((leg, index) => (
                <div key={leg.id} className="relative">
                  <div className={`absolute left-[-1.25rem] top-1.5 w-2 h-2 rounded-full ring-4 ring-surface ${leg.action === 'ENTRY' ? 'bg-primary' : 'bg-long'}`}></div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-text-muted mb-0.5">{new Date(leg.timestamp).toLocaleTimeString()}</span>
                    <span className="text-sm font-semibold text-text">
                      {leg.action === 'ENTRY' ? 'Entered' : 'Exited'} {leg.quantity} shares @ ₹{leg.price.toFixed(2)}
                    </span>
                    <p className="text-xs text-text-muted mt-0.5">
                      {leg.action === 'ENTRY' ? 'Initial entry filled' : 'Partial profit secured'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column: Actions */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border bg-surface-muted/30">
              <h2 className="text-lg font-bold text-text tracking-tight">Trade Management</h2>
            </div>
            
            <div className="p-5 border-b border-border flex flex-col gap-3">
              <button 
                disabled={trade.status !== "OPEN"}
                onClick={() => setIsExitModalOpen(true)}
                className="w-full py-3 rounded-lg enabled:bg-risk enabled:hover:bg-risk/90 enabled:text-surface disabled:bg-surface-muted disabled:text-text-muted font-bold transition-colors disabled:opacity-50 disabled:border disabled:border-border flex items-center justify-center gap-2 shadow-sm"
              >
                Record Exit (Partial / Full)
              </button>
              
              <div className="text-[10px] text-center text-text-muted uppercase tracking-wider font-bold mt-1">
                Updates local journal only
              </div>
            </div>
            
            {linkedSignal && (
              <div className="p-5 flex flex-col gap-3 bg-surface-muted/30">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Linked Setup</span>
                <Link href={`/dashboard/signals/${linkedSignal.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-muted transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text group-hover:text-primary transition-colors">Original Trade Plan</span>
                    <span className="text-xs text-text-muted">{linkedSignal.setup}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                </Link>
              </div>
            )}
            
            <div className="p-5 border-t border-border">
              <h3 className="text-sm font-bold text-text mb-2">Trade Notes</h3>
              <p className="text-sm text-text-muted bg-surface-muted p-3 rounded-md border border-border">
                {trade.notes || "No notes added for this trade."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isExitModalOpen && (
        <TradeExitModal 
          trade={trade} 
          isOpen={isExitModalOpen} 
          onClose={() => setIsExitModalOpen(false)} 
          onSubmit={handleTradeExitSubmit}
        />
      )}
    </div>
  )
}
