"use client"
import * as React from "react"
import { InstitutionalFlowCard } from "@/components/domain/InstitutionalFlowCard"
import { NewsFilingsTimeline } from "@/components/domain/NewsFilingsTimeline"
import { MarketRegimeStrip } from "@/components/domain/MarketRegimeStrip"
import { 
  TrendingUp, 
  Layers, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  RefreshCw,
  Server
} from "lucide-react"

export default function MarketIntelligencePage() {
  const [selectedSource, setSelectedSource] = React.useState<"ALL" | "FILINGS" | "ACTIONS" | "MACRO">("ALL")

  const sectors = [
    { name: "Nifty Metals", ltp: "9,240.50", change: "+1.82%", alpha: "+1.18%", leader: "TATASTEEL (+2.10%)", breadth: "12 / 3 (80%)", bias: "▲ Long Bias Confirmed", biasType: "LONG" },
    { name: "Nifty Auto", ltp: "23,110.15", change: "+1.24%", alpha: "+0.60%", leader: "M&M (+1.95%)", breadth: "11 / 4 (73%)", bias: "▲ Long Bias Confirmed", biasType: "LONG" },
    { name: "Nifty Bank", ltp: "52,380.40", change: "+0.38%", alpha: "-0.26%", leader: "HDFCBANK (+0.45%)", breadth: "7 / 5 (58%)", bias: "Neutral / Congested", biasType: "NEUTRAL" },
    { name: "Nifty FMCG", ltp: "58,410.20", change: "+0.15%", alpha: "-0.49%", leader: "ITC (+0.30%)", breadth: "8 / 7 (53%)", bias: "Neutral / Defensive", biasType: "NEUTRAL" },
    { name: "Nifty IT", ltp: "37,620.80", change: "-0.42%", alpha: "-1.06%", leader: "INFY (-0.60%)", breadth: "3 / 7 (30%)", bias: "Corrective Pullback", biasType: "SHORT" },
    { name: "Nifty Realty", ltp: "1,012.30", change: "-1.14%", alpha: "-1.78%", leader: "DLF (-1.80%)", breadth: "2 / 8 (20%)", bias: "▼ Short Bias Confirmed", biasType: "SHORT" },
  ]

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">candlestick_chart</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Market Intelligence & Macro Environment
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                NSE Cash Active
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Sector rotation alpha, verified exchange disclosures, and institutional context for intraday execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="font-label-code text-label-code text-text-secondary hidden lg:inline">
            Rule Version: <strong className="text-text-primary">v1.8.9</strong>
          </span>
          <button
            type="button"
            className="flex items-center gap-1 font-label-code text-label-code text-primary bg-surface shadow-xs px-space-md py-1.5 rounded font-semibold hover:bg-surface-container transition-colors border border-border-subtle"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Alpha Matrix
          </button>
        </div>
      </div>

      {/* Top 4 Macro Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {/* Tile 1: Market Regime */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Broad Market Regime</span>
            <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">REGIME 01</span>
          </div>
          <div className="py-space-sm">
            <span className="font-headline-md text-headline-md font-bold text-text-primary">Bullish Trend Day</span>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              Trading solidly above daily VWAP with sustained volume expansion across high beta sectors.
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between text-body-xs text-text-secondary">
            <span>Trend Bias:</span>
            <span className="font-label-code text-accent-bullish font-bold">Long Setups Preferred</span>
          </div>
        </div>

        {/* Tile 2: Advance / Decline */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">NSE Market Breadth</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-semibold">ALL CASH</span>
          </div>
          <div className="py-space-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="font-metric-lg text-metric-lg text-accent-bullish font-bold">1,482</span>
                <span className="font-label-code text-label-code text-accent-bullish">(60.6%)</span>
              </div>
              <span className="font-body-xs text-body-xs text-text-secondary">Advances</span>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <span className="font-metric-lg text-metric-lg text-accent-danger font-bold">812</span>
                <span className="font-label-code text-label-code text-accent-danger">(35.3%)</span>
              </div>
              <span className="font-body-xs text-body-xs text-text-secondary">Declines</span>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle">
            <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden flex">
              <div className="bg-accent-bullish h-full" style={{ width: "60.6%" }}></div>
              <div className="bg-border-strong h-full" style={{ width: "4.1%" }}></div>
              <div className="bg-accent-danger h-full" style={{ width: "35.3%" }}></div>
            </div>
          </div>
        </div>

        {/* Tile 3: Contextual Benchmark (Nifty 50 Non-Tradable) */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Contextual Benchmark</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-semibold">INDEX REF</span>
          </div>
          <div className="py-space-sm">
            <div className="flex items-baseline gap-space-sm">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">24,482.10</span>
              <span className="font-metric-md text-metric-md text-accent-bullish font-bold">+155.80 (+0.64%)</span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              High: 24,510.45 • Low: 24,360.20
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-[10px] text-text-secondary">
            <span>Non-Tradable Cash Index</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Tile 4: Volatility Gauge (India VIX) */}
        <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">NSE India VIX</span>
            <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">REGIME NORMAL</span>
          </div>
          <div className="py-space-sm">
            <div className="flex items-baseline gap-space-sm">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">13.42</span>
              <span className="font-metric-md text-metric-md text-accent-bullish font-bold">-0.29 (-2.14%)</span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1">
              Intraday volatility remains compressed. Breakouts have higher statistical follow-through.
            </p>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-label-code text-text-secondary">
            <span>Range: 13.10 - 13.88</span>
            <span className="font-bold text-accent-bullish">Threshold &lt; 18.00 PASS</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Sector Strength Matrix & News Timeline (Cols 1-8) vs Institutional Flow & Provenance (Cols 9-12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left 8 Columns */}
        <div className="xl:col-span-8 flex flex-col gap-margin">
          {/* Panel A: Sector Relative Strength Matrix */}
          <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="px-space-md py-space-sm bg-surface-bright border-b border-border-subtle flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                  NSE Sector Relative Strength & Alpha Matrix
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-semibold">
                  11 Sector Baskets
                </span>
              </div>
              <span className="font-label-code text-body-xs text-text-secondary">
                Rule Gate: Setups restricted to sectors with &gt;= +0.50% alpha
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-subtle font-label-code text-label-code text-text-secondary uppercase">
                    <th className="py-2.5 px-space-md font-semibold">Sector Index</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">LTP / Change</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Alpha vs Nifty</th>
                    <th className="py-2.5 px-space-sm font-semibold">Leading Component</th>
                    <th className="py-2.5 px-space-sm font-semibold text-center">Breadth (Adv/Dec)</th>
                    <th className="py-2.5 px-space-md font-semibold text-right">Regime Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-text-primary">
                  {sectors.map(sector => (
                    <tr key={sector.name} className="hover:bg-surface-bright transition-colors">
                      <td className="py-2.5 px-space-md font-medium flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          sector.biasType === "LONG" ? "bg-accent-bullish" :
                          sector.biasType === "SHORT" ? "bg-accent-danger" : "bg-border-strong"
                        }`} />
                        <span>{sector.name}</span>
                      </td>
                      <td className={`py-2.5 px-space-sm text-right font-metric-sm font-semibold ${
                        sector.biasType === "LONG" ? "text-accent-bullish" :
                        sector.biasType === "SHORT" ? "text-accent-danger" : "text-text-primary"
                      }`}>
                        {sector.ltp} <span className="text-body-xs font-normal">({sector.change})</span>
                      </td>
                      <td className={`py-2.5 px-space-sm text-right font-metric-sm font-bold ${
                        sector.biasType === "LONG" ? "text-accent-bullish" :
                        sector.biasType === "SHORT" ? "text-accent-danger" : "text-text-secondary"
                      }`}>
                        {sector.alpha}
                      </td>
                      <td className="py-2.5 px-space-sm font-label-code">
                        <span className="font-semibold text-text-primary">{sector.leader}</span>
                      </td>
                      <td className="py-2.5 px-space-sm text-center">
                        <span className="font-label-code text-body-xs px-1.5 py-0.5 rounded bg-surface-container font-semibold">
                          {sector.breadth}
                        </span>
                      </td>
                      <td className="py-2.5 px-space-md text-right">
                        <span className={`px-2 py-0.5 rounded font-label-code text-label-code font-bold uppercase ${
                          sector.biasType === "LONG" ? "bg-status-live-bg text-status-live-text border border-accent-bullish/30" :
                          sector.biasType === "SHORT" ? "bg-status-disconnected-bg text-status-disconnected-text border border-accent-danger/30" :
                          "bg-surface-high text-text-secondary border border-border-subtle"
                        }`}>
                          {sector.bias}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel B: News & Corporate Event Intelligence Timeline */}
          <NewsFilingsTimeline />
        </div>

        {/* Right 4 Columns */}
        <div className="xl:col-span-4 flex flex-col gap-margin">
          {/* Institutional Flow Context */}
          <InstitutionalFlowCard />

          {/* Data Pipeline Ingestion Status & Provenance */}
          <div className="bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">Data Provenance Registry</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">
                AUDITED
              </span>
            </div>

            <div className="flex flex-col gap-space-xs text-body-xs divide-y divide-border-subtle">
              <div className="py-2 flex items-center justify-between first:pt-0">
                <span className="text-text-secondary">SmartAPI WebSocket:</span>
                <span className="font-label-code text-status-live-text font-bold">Live Stream (12ms)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">NSE/BSE Filings RSS:</span>
                <span className="font-label-code text-text-primary font-semibold">Polled 60s (Zero Error)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">FII/DII EOD Disclosures:</span>
                <span className="font-label-code text-accent-bearish font-semibold">Stamped T-1 Close</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-text-secondary">Social Media Policy:</span>
                <span className="font-label-code text-accent-bullish font-bold">STRICTLY EXCLUDED</span>
              </div>
            </div>

            <div className="p-space-sm bg-surface-container-low rounded-lg text-[11px] text-text-secondary font-body-xs mt-1 border border-border-subtle">
              Decision Support Only — Orders must be manually checked and placed in the official Angel One SmartAPI terminal.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
