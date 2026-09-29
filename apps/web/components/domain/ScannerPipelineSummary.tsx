"use client"
import * as React from "react"
import Link from "next/link"
import { useDashboardState } from "@/lib/contexts/DashboardContext"
import { Activity, Server, Database, BrainCircuit, Signal, ChevronRight, Zap } from "lucide-react"

export function ScannerPipelineSummary() {
  const { marketState, marketStatus, instruments } = useDashboardState()
  
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

  const isLive = marketState === 'LIVE' || marketState === 'SIMULATED'

  const stages = [
    { 
      label: "Feed", 
      icon: <Server className="w-4 h-4" />,
      value: marketStatus?.providerType === 'angelone' ? "SmartAPI" : "Mock",
      status: isLive ? "bg-primary" : "bg-warning"
    },
    { 
      label: "Ticks", 
      icon: <Activity className="w-4 h-4" />,
      value: diagnostics?.ticksPerMinute ? `${diagnostics.ticksPerMinute}/min` : "0/min",
      status: diagnostics?.ticksPerMinute > 0 ? "bg-primary" : "bg-border"
    },
    { 
      label: "Candles", 
      icon: <Database className="w-4 h-4" />,
      value: diagnostics?.candles1m ? `${diagnostics.candles1m} built` : "Waiting",
      status: diagnostics?.candles1m > 0 ? "bg-primary" : "bg-border"
    },
    { 
      label: "Strategy", 
      icon: <BrainCircuit className="w-4 h-4" />,
      value: diagnostics?.strategyEvaluations ? `${diagnostics.strategyEvaluations} evals` : "Idle",
      status: diagnostics?.strategyEvaluations > 0 ? "bg-primary" : "bg-border"
    },
    { 
      label: "Signals", 
      icon: <Signal className="w-4 h-4" />,
      value: diagnostics?.activeSignals ? `${diagnostics.activeSignals} active` : "0 active",
      status: diagnostics?.activeSignals > 0 ? "bg-primary" : "bg-border"
    }
  ]

  return (
    <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLive ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-text-muted'}`}>
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-text">Scanner Pipeline</h3>
          <span className="text-xs text-text-muted">Data flow processing</span>
        </div>
      </div>

      <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2">
        {stages.map((stage, idx) => (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center flex-1 min-w-[60px]">
              <div className="flex items-center gap-1.5 text-text-muted mb-1">
                {stage.icon}
                <span className="text-[10px] uppercase font-bold tracking-wider hidden md:block">{stage.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${stage.status}`}></span>
                <span className="text-xs font-medium text-text">{stage.value}</span>
              </div>
            </div>
            {idx < stages.length - 1 && (
              <ChevronRight className="w-4 h-4 text-border hidden sm:block shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <Link href="/dashboard/markets" className="shrink-0">
        <button className="px-3 py-1.5 rounded bg-surface-muted hover:bg-surface-container text-text text-xs font-semibold border border-border transition-colors">
          View Details
        </button>
      </Link>
    </div>
  )
}
