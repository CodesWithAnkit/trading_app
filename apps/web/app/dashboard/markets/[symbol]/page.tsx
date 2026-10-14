"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { MarketStatusBadge } from "@/components/domain/MarketStatusBadge"
import { CandlestickChart } from "@/components/domain/CandlestickChart"
import { ScannerEvaluation } from "@/components/domain/ScannerEvaluation"
import { ScannerAuditTrail } from "@/components/domain/ScannerAuditTrail"
import { SignalPlan } from "@/components/domain/SignalPlan"
import { ArrowLeft, Clock, TrendingUp, TrendingDown, BarChart2, Activity } from "lucide-react"

export default function StockDetailPage() {
  const { symbol } = useParams()
  const router = useRouter()
  const decodedSymbol = decodeURIComponent(symbol as string)
  
  const { instruments, marketState } = useDashboardState()
  const { activeSignals } = useSignals()
  
  const instrument = instruments.find(i => i.symbol === decodedSymbol)
  const signal = activeSignals.find(s => s.symbol === decodedSymbol)
  
  const [timeframe, setTimeframe] = React.useState<"1m" | "5m">("5m")
  const [candles, setCandles] = React.useState<any[]>([])
  const [loadingCandles, setLoadingCandles] = React.useState(true)
  const [isFno, setIsFno] = React.useState<boolean | null>(null)
  
  React.useEffect(() => {
    fetch("/api/v1/scanner/universe")
      .then(res => res.json())
      .then(payload => {
         const fnoSymbols = new Set((payload.data || []).map((s: any) => s.symbol))
         setIsFno(fnoSymbols.has(decodedSymbol))
      })
      .catch(() => setIsFno(null)) // fallback
  }, [decodedSymbol])
  
  React.useEffect(() => {
    const fetchCandles = async () => {
      setLoadingCandles(true)
      try {
        const res = await fetch(`/api/v1/candles?symbol=${decodedSymbol}&timeframe=${timeframe}&limit=100`)
        if (res.ok) {
          const json = await res.json()
          // Sort candles chronologically
          const at = (c: any) => new Date(c.start_time ?? c.timestamp).getTime()
          const sorted = (json.data || []).sort((a: any, b: any) => at(a) - at(b))
          setCandles(sorted)
        }
      } catch (err) {
        // ignore
      } finally {
        setLoadingCandles(false)
      }
    }
    
    fetchCandles()
    const int = setInterval(fetchCandles, 15000)
    return () => clearInterval(int)
  }, [decodedSymbol, timeframe])

  // Derive metrics if we have candles
  const dayHigh = candles.length > 0 ? Math.max(...candles.map(c => c.high)) : 0
  const dayLow = candles.length > 0 ? Math.min(...candles.map(c => c.low)) : 0
  
  return (
    <div className="px-space-md sm:px-space-xl py-space-md sm:py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full pb-24">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-2">
        <button 
          onClick={() => router.push('/dashboard/markets')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </button>
      </div>

      {isFno === false && (
        <div className="bg-surface-container-highest border border-outline-variant rounded-lg p-4 mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-outline">info</span>
          <p className="text-sm text-on-surface">
            <strong>{decodedSymbol}</strong> isn't an F&O stock, so the scanner doesn't stream it. No live price, chart or signals.
          </p>
        </div>
      )}

      {/* Stock Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text tracking-tight">{decodedSymbol}</h1>
            <span className="text-[10px] uppercase font-bold text-text-muted bg-surface-muted border border-border px-2 py-0.5 rounded">
              NSE EQ
            </span>
          </div>
          <div className="flex items-center gap-4">
            <MarketStatusBadge />
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <Clock className="w-4 h-4" />
              {instrument?.lastTickAt ? new Date(instrument.lastTickAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Waiting for tick'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold text-text">
              {instrument ? `₹${instrument.ltp.toFixed(2)}` : '₹--.--'}
            </span>
            <div className={`flex items-center gap-1 font-mono font-bold text-lg ${instrument && instrument.change1dPct >= 0 ? 'text-long' : 'text-short'}`}>
              {instrument && instrument.change1dPct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {instrument ? `${instrument.change1dPct > 0 ? '+' : ''}${instrument.change1dPct.toFixed(2)}%` : '--%'}
            </div>
          </div>
          <span className="text-xs text-text-muted font-mono">
            Vol {instrument ? instrument.volume.toLocaleString() : '--'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Chart Section */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="text-primary w-5 h-5" />
                <h3 className="text-base font-bold text-text tracking-tight">Market Chart</h3>
              </div>
              <div className="flex bg-surface-muted rounded-md p-1 border border-border">
                <button 
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${timeframe === '1m' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setTimeframe('1m')}
                >
                  1m
                </button>
                <button 
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${timeframe === '5m' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setTimeframe('5m')}
                >
                  5m
                </button>
              </div>
            </div>
            
            {loadingCandles ? (
              <div className="w-full h-[400px] flex items-center justify-center border border-border rounded-lg bg-surface-muted/30 animate-pulse">
                <span className="text-sm text-text-muted">Loading chart data...</span>
              </div>
            ) : (
              <CandlestickChart data={candles} timeframe={timeframe} signal={signal} />
            )}
            
            {/* Market Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div className="flex flex-col gap-1 p-3 bg-surface-muted/30 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Day Range</span>
                <span className="font-mono text-sm text-text font-medium">{dayLow > 0 ? `₹${dayLow.toFixed(2)} - ₹${dayHigh.toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-surface-muted/30 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">RVOL</span>
                <span className="font-mono text-sm text-text font-medium">N/A</span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-surface-muted/30 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">VWAP</span>
                <span className="font-mono text-sm text-text font-medium">N/A</span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-surface-muted/30 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Spread Friction</span>
                <span className="font-mono text-sm text-text font-medium">N/A</span>
              </div>
            </div>
          </div>

          <ScannerEvaluation signal={signal} />
        </div>

        {/* Right Sidebar: Setup & Audit */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-text tracking-tight border-b border-border pb-4">Current Setup</h3>
            {signal ? (
              <SignalPlan signal={signal} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center border border-border mb-2">
                  <Activity className="w-5 h-5 text-text-muted" />
                </div>
                <span className="text-sm font-semibold text-text">No actionable setup</span>
                <span className="text-xs text-text-muted max-w-[200px]">Scanner is monitoring {decodedSymbol}, but criteria have not aligned for a valid signal.</span>
              </div>
            )}
          </div>
          
          <ScannerAuditTrail />
        </div>
      </div>
    </div>
  )
}
