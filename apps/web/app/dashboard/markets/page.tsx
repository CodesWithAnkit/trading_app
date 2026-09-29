"use client"
import * as React from "react"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { useSignals } from "@/lib/contexts/SignalContext"
import { ScannerPipeline } from "@/components/domain/ScannerPipeline"
import { MarketStatusBadge } from "@/components/domain/MarketStatusBadge"
import Link from "next/link"
import { TrendingUp, TrendingDown, Clock, Activity, Server, Database, RefreshCw, AlertTriangle } from "lucide-react"

export default function MarketsPage() {
  const { marketState, marketStatus, instruments } = useDashboardState()
  const { activeSignals } = useSignals()

  const [diagnostics, setDiagnostics] = React.useState<any>(null)
  
  React.useEffect(() => {
    const fetchDiag = async () => {
      try {
        const res = await fetch('/api/v1/scanner/diagnostics')
        if (res.ok) {
          setDiagnostics(await res.json())
        }
      } catch (err) {
        // ignore
      }
    }
    fetchDiag()
    const int = setInterval(fetchDiag, 10000)
    return () => clearInterval(int)
  }, [])

  const eligibleCount = instruments.filter(i => i.status !== 'UNAVAILABLE').length
  const liveCount = instruments.filter(i => i.status === 'LIVE').length

  return (
    <div className="px-space-md sm:px-space-xl py-space-md sm:py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            Markets
            <MarketStatusBadge />
          </h1>
          <p className="text-sm text-text-muted">Live market data and scanner status</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Stocks Monitored</span>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-mono text-2xl font-bold text-text tracking-tight">{instruments.length}</span>
            <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {eligibleCount} Eligible
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Live Quotes</span>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-mono text-2xl font-bold text-text tracking-tight">{liveCount}</span>
            <span className="text-[10px] uppercase font-bold text-text-muted bg-surface-muted border border-border px-1.5 py-0.5 rounded">
              Receiving
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Tick Rate</span>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-mono text-2xl font-bold text-text tracking-tight">{Math.round(diagnostics?.ticksPerMinute || 0)}</span>
            <span className="text-[10px] uppercase font-bold text-text-muted bg-surface-muted border border-border px-1.5 py-0.5 rounded">
              Ticks / Min
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Data Freshness</span>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-mono text-lg font-bold text-text tracking-tight truncate">
              {marketStatus?.lastTickAt 
                ? new Date(marketStatus.lastTickAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <ScannerPipeline diagnostics={diagnostics} marketState={marketState} />
          
          {/* Dense Market Watch Table */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Activity className="text-primary w-5 h-5" />
              <h3 className="text-base font-bold text-text tracking-tight">Instrument Details</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border text-text-muted text-[10px] uppercase tracking-wider font-bold">
                    <th className="py-2 px-2">Symbol</th>
                    <th className="py-2 px-2 text-right">LTP</th>
                    <th className="py-2 px-2 text-right">Change</th>
                    <th className="py-2 px-2 text-right">1m Chg</th>
                    <th className="py-2 px-2 text-right">5m Chg</th>
                    <th className="py-2 px-2 text-right">Volume</th>
                    <th className="py-2 px-2 text-right">RVOL</th>
                    <th className="py-2 px-2 text-right">Volatility</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {instruments.map(inst => (
                    <tr key={inst.symbol} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="py-2 px-2 font-bold text-text">
                        <Link href={`/dashboard/markets/${inst.symbol}`} className="hover:text-primary">
                          {inst.symbol}
                        </Link>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">₹{inst.ltp.toFixed(2)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold ${inst.change1dPct >= 0 ? 'text-long' : 'text-short'}`}>
                        {inst.change1dPct > 0 ? '+' : ''}{inst.change1dPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">-</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">-</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">{inst.volume.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">-</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">-</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inst.status === 'LIVE' ? 'bg-primary/10 text-primary' : 'bg-warning-soft text-warning'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {instruments.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-muted">No instruments available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Health Cards */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Server className="text-primary w-5 h-5" />
              <h3 className="text-base font-bold text-text tracking-tight">Feed Health</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Provider</span>
                <span className="font-semibold text-text uppercase text-xs">{diagnostics?.providerType || marketStatus?.providerType || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Uptime</span>
                <span className="font-mono text-text">{diagnostics?.uptime ? `${Math.floor(diagnostics.uptime / 60)}m ${diagnostics.uptime % 60}s` : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Reconnects</span>
                <span className="font-mono text-text">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">State</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${marketState === 'LIVE' || marketState === 'SIMULATED' ? 'bg-primary/10 text-primary' : 'bg-risk-soft text-risk'}`}>
                  {marketState === 'LIVE' || marketState === 'SIMULATED' ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Database className="text-primary w-5 h-5" />
              <h3 className="text-base font-bold text-text tracking-tight">Candle Engine</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">1m Candles</span>
                <span className="font-mono text-text">{diagnostics?.candles1m || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">5m Candles</span>
                <span className="font-mono text-text">{diagnostics?.candles5m || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Last Built</span>
                <span className="font-mono text-text text-xs">
                  {diagnostics?.lastCandleAt ? new Date(diagnostics.lastCandleAt).toLocaleTimeString('en-IN') : 'Waiting'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
