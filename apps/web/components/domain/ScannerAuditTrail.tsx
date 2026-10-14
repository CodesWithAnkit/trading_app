"use client"
import * as React from "react"
import { History } from "lucide-react"

export function ScannerAuditTrail() {
  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <History className="text-primary w-5 h-5" />
        <h3 className="text-base font-bold text-text tracking-tight">Scanner Audit Trail</h3>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2 opacity-60">
        <span className="material-symbols-outlined text-3xl text-text-muted">receipt_long</span>
        <span className="text-sm font-semibold text-text">Not available</span>
        <span className="text-xs text-text-muted max-w-[200px]">Historical scanner evaluation events will appear here in a future update.</span>
      </div>
    </div>
  )
}
