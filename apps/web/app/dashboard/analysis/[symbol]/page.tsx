"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { ArrowLeft, Save, TrendingUp, AlertCircle, CheckCircle2, Crosshair } from "lucide-react"
import type { Signal } from "@/mock/signals"
import type { ApproachingSetup } from "@/lib/scanner-types"
import { ApproachingCard } from "@/components/domain/ApproachingCard"
import { AnalysisChart } from "@/components/domain/AnalysisChart"

type AnalysisPayload = { signal?: Signal; approaching?: ApproachingSetup }

export default function StockAnalysisPage() {
  const params = useParams<{ symbol: string }>()
  const router = useRouter()
  const symbol = decodeURIComponent(params.symbol).toUpperCase()
  const { activeSignals, approachingSignals } = useSignals()
  const [isSaving, setIsSaving] = React.useState(false)
  const [remote, setRemote] = React.useState<AnalysisPayload | null>(null)
  const [loadState, setLoadState] = React.useState<"loading" | "done">("loading")

  const contextSignal = activeSignals.find(s => s.symbol === symbol)

  // Direct navigation (spec 0009 AC-5): the context may not hold this symbol, so ask the API.
  React.useEffect(() => {
    if (contextSignal) return
    let cancelled = false
    fetch(`/api/v1/scanner/analysis/${encodeURIComponent(symbol)}`)
      .then(res => (res.ok ? res.json() : null))
      .then((payload: AnalysisPayload | null) => !cancelled && setRemote(payload))
      .catch(err => console.error("Failed to load analysis", err))
      .finally(() => !cancelled && setLoadState("done"))
    return () => { cancelled = true }
  }, [symbol, contextSignal])

  const signal = contextSignal ?? remote?.signal
  const approaching = approachingSignals.find(a => a.symbol === symbol) ?? remote?.approaching

  if (!signal && loadState === "loading") {
    return (
      <div className="px-space-xl py-space-xl max-w-5xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <p className="text-on-surface-variant">Loading analysis for {symbol}…</p>
      </div>
    )
  }

  if (!signal && approaching) {
    return (
      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-on-surface flex items-center gap-2">
              {symbol}
              <span className="px-2 py-1 text-sm rounded-md font-bold bg-primary-container text-on-primary-container flex items-center gap-1">
                <Crosshair className="w-4 h-4" /> Approaching
              </span>
            </h1>
            <p className="text-on-surface-variant mt-1">No strategy has triggered yet. A trade plan appears here the moment one does.</p>
          </div>
        </div>
        <ApproachingCard setup={approaching} />
      </div>
    )
  }

  if (!signal) {
    return (
      <div className="px-space-xl py-space-xl max-w-5xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-tertiary" />
        <h1 className="text-2xl font-bold text-on-surface">No Active Analysis</h1>
        <p className="text-on-surface-variant text-center max-w-md">
          There are no active or approaching setups for {symbol} right now. The setup may have expired, or the market conditions changed.
        </p>
        <button onClick={() => router.push("/dashboard")} className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const isLong = signal.direction === "LONG"

  const handleSaveToJournal = async () => {
    setIsSaving(true)
    try {
      const payload = {
        symbol: signal.symbol,
        strategy_name: signal.setup,
        entry_price: signal.referenceEntry,
        stop_price: signal.stop,
        target_price: signal.targets.t1,
        status: "PENDING",
        notes: signal.rationale
      }
      
      const res = await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Failed to save to journal")
      
      alert("Setup saved to journal successfully!")
      router.push("/dashboard/journal")
    } catch (err) {
      alert("Error saving to journal.")
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
        <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-2">
            {symbol} 
            <span className={`px-2 py-1 text-sm rounded-md font-bold ${isLong ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
              {isLong ? "↑ LONG" : "↓ SHORT"}
            </span>
          </h1>
          <p className="text-on-surface-variant mt-1">Detailed quantitative analysis and setup blueprint</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Strategy & Rules */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Matched Strategy: {signal.setup}
            </h2>
            <p className="text-on-surface-variant mb-6 text-lg">{signal.rationale}</p>
            
            <div className="bg-surface-container p-4 rounded-lg">
              <h3 className="font-bold text-on-surface mb-3 uppercase tracking-wider text-sm">Quantitative Trigger Rules</h3>
              <ul className="flex flex-col gap-3">
                <li className="flex items-center gap-3 text-on-surface bg-surface-container-lowest p-3 rounded-md shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="font-mono text-sm">Close Price (₹{signal.price?.toFixed(2)}) vs Breakout Threshold</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface bg-surface-container-lowest p-3 rounded-md shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="font-mono text-sm">Volatility alignment within 1.5 ATR</span>
                </li>
                <li className="flex items-center gap-3 text-on-surface bg-surface-container-lowest p-3 rounded-md shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="font-mono text-sm">Relative Volume: {signal.metrics?.relativeVolume}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <AnalysisChart symbol={symbol} signal={signal} />
        </div>

        {/* Right Column: Trade Plan */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 shadow-sm border border-outline-variant/30 sticky top-6">
            <h2 className="text-xl font-bold text-on-surface mb-6">Trade Plan</h2>
            
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 pb-4 border-b border-outline-variant/30">
                <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Entry Zone</span>
                <span className="text-2xl font-bold text-on-surface font-mono">₹{signal.entryZone?.low?.toFixed(2)} - ₹{signal.entryZone?.high?.toFixed(2)}</span>
                <span className="text-sm text-on-surface-variant">Reference: ₹{signal.referenceEntry?.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col gap-1 pb-4 border-b border-outline-variant/30">
                <span className="text-sm font-bold text-tertiary-container uppercase tracking-wider">Stop Loss (Risk)</span>
                <span className="text-2xl font-bold text-error font-mono">₹{signal.stop?.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col gap-1 pb-6">
                <span className="text-sm font-bold text-secondary uppercase tracking-wider">Target (Reward)</span>
                <span className="text-2xl font-bold text-secondary font-mono">₹{signal.targets?.t1?.toFixed(2)}</span>
                <span className="text-sm text-on-surface-variant">R:R Ratio ~ {signal.metrics?.riskReward}</span>
              </div>

              <button 
                onClick={handleSaveToJournal}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? "Saving..." : "Save to Journal"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
