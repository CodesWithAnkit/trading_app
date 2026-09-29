import * as React from "react"
import { type Signal } from "@/mock/signals"

export function SignalPlan({ signal }: { signal: Signal }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm mt-4 mb-4">
      <div className="space-y-1">
        <div className="flex justify-between items-center text-text-muted text-label">
          <span>Entry</span>
          <span className="text-number font-number text-text">
            ₹{signal.entryZone.low.toFixed(2)}–₹{signal.entryZone.high.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-text-muted text-label">
          <span>T1</span>
          <span className="text-number font-number text-text">
            ₹{signal.targets.t1.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="space-y-1 border-l border-border pl-4">
        <div className="flex justify-between items-center text-risk text-label">
          <span>Stop</span>
          <span className="text-number font-number">
            ₹{signal.stop.toFixed(2)}
          </span>
        </div>
        {signal.targets.t2 && (
          <div className="flex justify-between items-center text-text-muted text-label">
            <span>T2</span>
            <span className="text-number font-number text-text">
              ₹{signal.targets.t2.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
