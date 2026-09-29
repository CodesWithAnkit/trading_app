import * as React from "react"
import { type Signal } from "@/mock/signals"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

export function CandlestickChart({ signal }: { signal: Signal }) {
  return (
    <div className="relative w-full h-[400px] bg-[#E8EDF4] border border-border rounded-md flex items-center justify-center overflow-hidden">
      {/* Abstract chart representation */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(to right, #132238 1px, transparent 1px), linear-gradient(to bottom, #132238 1px, transparent 1px)`,
        backgroundSize: `40px 40px`
      }}></div>
      
      <div className="z-10 flex flex-col items-center bg-surface/80 p-4 rounded-md backdrop-blur-sm border border-border">
        <Activity className="w-8 h-8 text-primary mb-2" />
        <span className="text-body font-medium">Chart visualization for {signal.symbol}</span>
        <span className="text-sm text-text-muted mt-1">Simulated candle data</span>
      </div>
      
      {/* Levels indication */}
      <div className="absolute right-0 top-0 bottom-0 w-24 border-l border-border bg-surface/50 backdrop-blur-sm flex flex-col justify-between py-12 px-2 text-[10px] font-number text-right">
        <div className="text-text-muted">₹{(signal.targets.t2 || signal.targets.t1 * 1.01).toFixed(2)}</div>
        <div className="text-long font-medium">T1 ₹{signal.targets.t1.toFixed(2)}</div>
        <div className="text-primary font-medium border-t border-primary border-dashed pt-1 mt-1">
          Entry ₹{signal.entryZone.low.toFixed(2)}
        </div>
        <div className="text-text-muted">₹{signal.price.toFixed(2)}</div>
        <div className="text-risk font-medium">Stop ₹{signal.stop.toFixed(2)}</div>
        <div className="text-text-muted">₹{(signal.stop * 0.99).toFixed(2)}</div>
      </div>
    </div>
  )
}
