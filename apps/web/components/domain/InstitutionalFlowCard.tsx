"use client"
import * as React from "react"
import type { InstitutionalContextContract } from "@/lib/contracts/intelligence"

export interface InstitutionalFlowData {
  reportDate?: string
  fiiNetCr?: number
  diiNetCr?: number
  blockDeals?: Array<{
    id: string
    symbol: string
    price: number
    quantityText: string
    client: string
    time: string
  }>
}

/** spec 0026 AC-7: maps the institutional API answer to the card; null when nothing is stored. */
export function toInstitutionalFlowData(c: InstitutionalContextContract | null): InstitutionalFlowData | null {
  if (!c || !c.connected) return null
  return {
    reportDate: c.flows ? `${c.flows.reportDate} (${c.flows.reportingPeriod === "PREVIOUS_DAY_EOD" ? "previous day EOD" : "monthly cumulative"})` : undefined,
    fiiNetCr: c.flows?.fiiNetCr,
    diiNetCr: c.flows?.diiNetCr,
    blockDeals: c.recentDeals.map(d => ({
      id: d.id,
      symbol: d.symbol,
      price: d.price,
      quantityText: `${d.quantity.toLocaleString("en-IN")} shares ${d.action === "BUY" ? "bought" : "sold"} by ${d.clientName}`,
      client: d.clientName,
      time: d.dealTime ?? d.dealDate,
    })),
  }
}

/**
 * Delayed end of day institutional disclosures. With no stored rows (`data` null) it says so
 * plainly: no sample figures are ever shown (spec 0026 AC-7).
 */
export function InstitutionalFlowCard({ data }: { data: InstitutionalFlowData | null }) {
  if (!data) {
    return (
      <div className="bg-surface rounded border border-border-subtle p-space-md shadow-sm">
        <div className="flex items-center gap-1.5 pb-space-xs border-b border-border-subtle">
          <span className="material-symbols-outlined text-[18px] text-primary">account_balance</span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Institutional Disclosures</span>
        </div>
        <p className="mt-space-sm text-body-sm text-text-secondary">No institutional flow source connected.</p>
        <p className="mt-1 text-[11px] text-text-secondary">FII/DII flows and bulk deals appear here once a real data source is set up.</p>
      </div>
    )
  }
  const isFiiPositive = (data.fiiNetCr ?? 0) >= 0
  const isDiiPositive = (data.diiNetCr ?? 0) >= 0

  return (
    <div className="bg-surface rounded border border-border-subtle p-space-md shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-primary">account_balance</span>
          <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
            Institutional Disclosures
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-bold">
          EOD DATA
        </span>
      </div>

      {/* Explicit Warning Badge */}
      <div className="mt-space-sm p-space-xs rounded bg-status-delayed-bg border border-border-subtle flex items-start gap-1.5 text-text-secondary font-label-code text-[11px] leading-tight">
        <span className="material-symbols-outlined text-[14px] text-accent-bearish shrink-0">warning</span>
        <span>Historical EOD Context — Delayed Disclosures (NOT Live Order Flow or Intraday Tape).</span>
      </div>

      {/* FII / DII Provisional Flows Table */}
      <div className="mt-space-sm space-y-space-xs">
        <div className="text-label-code font-label-code text-text-secondary uppercase text-[10px] font-semibold">
          {data.reportDate}
        </div>
        {data.fiiNetCr !== undefined && <div className="flex items-center justify-between p-space-sm bg-surface-bright rounded border border-border-subtle">
          <span className="font-body-sm text-text-primary font-medium">FII / FPI Net Flows:</span>
          <span className={`font-metric-md font-bold ${isFiiPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isFiiPositive ? "+" : ""}₹{data.fiiNetCr?.toFixed(2)} Cr
          </span>
        </div>}
        {data.diiNetCr !== undefined && <div className="flex items-center justify-between p-space-sm bg-surface-bright rounded border border-border-subtle">
          <span className="font-body-sm text-text-primary font-medium">DII Domestic Net Flows:</span>
          <span className={`font-metric-md font-bold ${isDiiPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isDiiPositive ? "+" : ""}₹{data.diiNetCr?.toFixed(2)} Cr
          </span>
        </div>}
      </div>

      {/* Bulk & Block Deals (Informational Context) */}
      <div className="mt-space-md pt-space-xs border-t border-border-subtle">
        <div className="flex items-center justify-between text-label-code font-label-code text-text-secondary mb-1">
          <span className="uppercase font-semibold text-[10px]">NSE Block Deals</span>
          <span>{data.blockDeals?.length ?? 0} Recorded</span>
        </div>
        <div className="space-y-space-xs">
          {data.blockDeals?.map((deal) => (
            <div key={deal.id} className="p-space-sm bg-surface-bright rounded border border-border-subtle text-body-xs font-label-code">
              <div className="flex items-center justify-between font-bold text-text-primary">
                <span>{deal.symbol}</span>
                <span>₹{deal.price.toFixed(2)}</span>
              </div>
              <div className="text-text-secondary text-[11px] mt-0.5">
                {deal.quantityText}
              </div>
              <div className="text-[10px] text-text-secondary/80 mt-1 italic">
                *Public reporting time differs from execution; informational context only.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
