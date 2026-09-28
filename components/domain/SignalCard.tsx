import * as React from "react"
import { type Signal } from "@/mock/signals"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Eye, CheckCircle2 } from "lucide-react"

export function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.direction === "LONG"
  const isShort = signal.direction === "SHORT"
  const isActive = signal.status === "ACTIVE" || signal.status === "EXPIRING"

  const percentChange = (Math.random() * 2).toFixed(2)

  return (
    <div className={cn(
      "bg-surface rounded-xl p-6 flex flex-col justify-between gap-4 border transition-all shadow-card hover:shadow-lg",
      isLong ? "border-long/20" : "border-short/20"
    )}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1",
              isLong ? "bg-long-soft text-long" : "bg-short-soft text-short"
            )}>
              {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isLong ? "Long" : "Short"}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 bg-surface-muted rounded text-text-muted">
              NSE Cash
            </span>
          </div>
          <div className="flex items-center gap-1 text-text-muted font-mono text-xs bg-surface-muted px-2 py-0.5 rounded border border-border">
            <Clock className="w-3 h-3" />
            <span>Expires in 18m</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div>
            <span className="text-xl font-bold text-text">{signal.symbol}</span>
            <span className="text-sm text-text-muted block">{signal.symbol} Ltd.</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-text">₹{signal.price.toFixed(2)}</span>
            <span className={cn(
              "font-mono text-sm block font-semibold",
              isLong ? "text-long" : "text-short"
            )}>
              {isLong ? "+" : "-"}{percentChange}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-surface border border-border text-text text-xs font-semibold flex items-center gap-1">
            <ShieldCheck className={cn("w-3 h-3", isLong ? "text-long" : "text-short")} /> 
            Confidence: {signal.confidence}
          </span>
          <span className="font-mono text-xs text-text-muted">
            R:R {signal.metrics?.riskReward || "1:2.0"}
          </span>
        </div>

        {/* Tabular Numerical Setup Parameters */}
        <div className="bg-surface-muted rounded-md p-3 flex flex-col gap-2 border border-border">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-text-muted">Planned Entry</span>
            <span className="text-text font-semibold">₹{signal.entryZone?.low?.toFixed(2)} – ₹{signal.entryZone?.high?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs border-t border-border pt-2">
            <div className="flex items-center gap-1">
              <span className="text-text-muted">Stop-Loss:</span>
              <span className="px-1.5 py-0.5 rounded bg-risk-soft text-risk font-semibold">
                ₹{signal.stop?.toFixed(2)} 
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-muted">Target:</span>
              <span className={cn("font-semibold", isLong ? "text-long" : "text-short")}>
                ₹{signal.targets?.t1?.toFixed(2)} {signal.targets?.t2 ? `/ ₹${signal.targets.t2.toFixed(2)}` : ''}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-muted line-clamp-2 mt-1">
          {signal.rationale}
        </p>
      </div>

      {/* Card Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/signals/${signal.id}`} className="flex-1 h-10 rounded-md border border-border bg-surface hover:bg-surface-muted text-text text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" /> View plan
          </Link>
          <button 
            type="button" 
            disabled={!isActive}
            className="flex-1 h-10 rounded-md enabled:bg-primary enabled:hover:bg-primary-hover disabled:bg-surface-muted enabled:text-surface disabled:text-text-muted text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> I entered
          </button>
        </div>
        <span className="text-[10px] text-center text-text-muted mt-1">
          Records your journal only · No broker order is placed
        </span>
      </div>
    </div>
  )
}
