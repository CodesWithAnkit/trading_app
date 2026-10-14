"use client"
import * as React from "react"

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

export function InstitutionalFlowCard({
  data = {
    reportDate: "Prior Trading Day Net Cash (NSE/BSE Provisional)",
    fiiNetCr: -842.15,
    diiNetCr: 1210.40,
    blockDeals: [
      {
        id: "deal-1",
        symbol: "ICICIPRULI",
        price: 612.00,
        quantityText: "4.2L shares purchased by HDFC Mutual Fund",
        client: "HDFC Mutual Fund",
        time: "Batch 09:30 IST"
      }
    ]
  }
}: {
  data?: InstitutionalFlowData
}) {
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
        <div className="flex items-center justify-between p-space-sm bg-surface-bright rounded border border-border-subtle">
          <span className="font-body-sm text-text-primary font-medium">FII / FPI Net Flows:</span>
          <span className={`font-metric-md font-bold ${isFiiPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isFiiPositive ? "+" : ""}₹{data.fiiNetCr?.toFixed(2)} Cr
          </span>
        </div>
        <div className="flex items-center justify-between p-space-sm bg-surface-bright rounded border border-border-subtle">
          <span className="font-body-sm text-text-primary font-medium">DII Domestic Net Flows:</span>
          <span className={`font-metric-md font-bold ${isDiiPositive ? "text-accent-bullish" : "text-accent-danger"}`}>
            {isDiiPositive ? "+" : ""}₹{data.diiNetCr?.toFixed(2)} Cr
          </span>
        </div>
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
