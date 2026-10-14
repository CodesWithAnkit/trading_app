"use client"
import * as React from "react"
import { Server, Activity, Database, Filter, BrainCircuit, Signal, ArrowRight } from "lucide-react"

export function ScannerPipeline({ diagnostics, marketState }: { diagnostics: any, marketState: string }) {
  const isLive = marketState === 'LIVE' || marketState === 'SIMULATED'
  
  const nodes = [
    {
      id: "feed",
      label: "SmartAPI Feed",
      icon: <Server className="w-5 h-5" />,
      status: isLive ? "HEALTHY" : (marketState === 'DELAYED' || marketState === 'STALE' ? "DEGRADED" : "FAILED"),
      detail: diagnostics?.providerType === 'angelone' ? "Angel One connected" : "Mock provider active"
    },
    {
      id: "ticks",
      label: "Tick Normalizer",
      icon: <Activity className="w-5 h-5" />,
      status: diagnostics?.ticksPerMinute > 0 ? "HEALTHY" : (isLive ? "WAITING" : "FAILED"),
      detail: `${Math.round(diagnostics?.ticksPerMinute || 0)} ticks/min`
    },
    {
      id: "candles",
      label: "Candle Engine",
      icon: <Database className="w-5 h-5" />,
      status: diagnostics?.candles1m > 0 ? "HEALTHY" : (isLive ? "WAITING" : "FAILED"),
      detail: `${diagnostics?.candles1m || 0} 1m / ${diagnostics?.candles5m || 0} 5m`
    },
    {
      id: "filter",
      label: "Liquidity Filter",
      icon: <Filter className="w-5 h-5" />,
      status: diagnostics?.strategyEvaluations > 0 ? "HEALTHY" : "WAITING",
      detail: `${diagnostics?.eligibleSetups || 0} eligible`
    },
    {
      id: "strategy",
      label: "Strategy Engine",
      icon: <BrainCircuit className="w-5 h-5" />,
      status: diagnostics?.strategyEvaluations > 0 ? "HEALTHY" : "WAITING",
      detail: `${diagnostics?.strategyEvaluations || 0} evals`
    },
    {
      id: "signals",
      label: "Active Signals",
      icon: <Signal className="w-5 h-5" />,
      status: "HEALTHY", // Signals store is always healthy
      detail: `${diagnostics?.activeSignals || 0} active`
    }
  ]

  const statusColors = {
    HEALTHY: "bg-primary/10 text-primary border-primary/30",
    DEGRADED: "bg-warning-soft text-warning border-warning/30",
    FAILED: "bg-risk-soft text-risk border-risk/30",
    WAITING: "bg-surface-muted text-text-muted border-border"
  }

  const dotColors = {
    HEALTHY: "bg-primary",
    DEGRADED: "bg-warning",
    FAILED: "bg-risk",
    WAITING: "bg-text-muted"
  }

  return (
    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col gap-6 overflow-x-auto">
      <div className="flex flex-col">
        <h3 className="text-base font-bold text-text tracking-tight">Scanner Pipeline</h3>
        <p className="text-sm text-text-muted">Real-time data flow processing</p>
      </div>

      <div className="flex items-center min-w-max pb-4">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <div className={`flex flex-col items-center justify-center p-4 w-40 rounded-xl border ${statusColors[node.status as keyof typeof statusColors]} transition-all relative`}>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[node.status as keyof typeof dotColors]}`}></span>
              </div>
              <div className="mb-3 p-2 bg-surface/50 rounded-lg">
                {node.icon}
              </div>
              <span className="font-bold text-sm text-center tracking-tight leading-tight mb-1">{node.label}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{node.status}</span>
              <span className="text-xs font-mono mt-2 opacity-90">{node.detail}</span>
            </div>
            {i < nodes.length - 1 && (
              <div className="w-8 flex items-center justify-center shrink-0">
                <ArrowRight className={`w-5 h-5 ${node.status === 'FAILED' ? 'text-risk/50' : 'text-primary/50'}`} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
