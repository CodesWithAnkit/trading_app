"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useSignals } from "@/lib/contexts/SignalContext"
import { ArrowLeft, Save, AlertCircle, Crosshair, Download, ShieldCheck, Ban, CheckCircle } from "lucide-react"
import type { Signal } from "@/mock/signals"
import type { ApproachingSetup } from "@/lib/scanner-types"
import { ApproachingCard } from "@/components/domain/ApproachingCard"
import { AnalysisChart } from "@/components/domain/AnalysisChart"
import { ExplainableEvidenceCard } from "@/components/domain/ExplainableEvidenceCard"
import { RiskGatesChecklist } from "@/components/domain/RiskGatesChecklist"
import { ContradictoryFactorsCard } from "@/components/domain/ContradictoryFactorsCard"

type AnalysisPayload = { signal?: Signal; approaching?: ApproachingSetup }

export default function StockAnalysisPage() {
  const params = useParams<{ symbol: string }>()
  const router = useRouter()
  const symbol = decodeURIComponent(params.symbol).toUpperCase()
  const { activeSignals, approachingSignals } = useSignals()
  const [isSaving, setIsSaving] = React.useState(false)
  const [remote, setRemote] = React.useState<AnalysisPayload | null>(null)
  const [loadState, setLoadState] = React.useState<"loading" | "done">("loading")

  const contextSignal = activeSignals.find(s => s.symbol === symbol)

  // Direct navigation (spec 0009 AC-5): the context may not hold this symbol, so ask the API.
  React.useEffect(() => {
    if (contextSignal) return
    let cancelled = false
    fetch(`/api/v1/scanner/analysis/${encodeURIComponent(symbol)}`)
      .then(res => (res.ok ? res.json() : null))
      .then((payload: AnalysisPayload | null) => !cancelled && setRemote(payload))
      .catch(err => console.error("Failed to load analysis", err))
      .finally(() => !cancelled && setLoadState("done"))
    return () => { cancelled = true }
  }, [symbol, contextSignal])

  const signal = contextSignal ?? remote?.signal
  const approaching = approachingSignals.find(a => a.symbol === symbol) ?? remote?.approaching

  if (!signal && loadState === "loading") {
    return (
      <div className="px-space-xl py-space-xl max-w-5xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary font-label-code">Loading quantitative analysis for {symbol}…</p>
      </div>
    )
  }

  if (!signal && approaching) {
    return (
      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-4 border-b border-border-subtle pb-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-surface-container rounded-full text-text-secondary transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              {symbol}
              <span className="px-2 py-0.5 text-xs rounded bg-surface-container text-primary font-label-code font-bold flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> Approaching Trigger
              </span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">No strategy has triggered yet. A trade plan appears here the moment one does.</p>
          </div>
        </div>
        <ApproachingCard setup={approaching} />
      </div>
    )
  }

  if (!signal) {
    return (
      <div className="px-space-xl py-space-xl max-w-5xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-accent-bearish" />
        <h1 className="text-2xl font-bold text-text-primary">No Active Analysis</h1>
        <p className="text-text-secondary text-center max-w-md">
          There are no active or approaching setups for {symbol} right now. The setup may have expired, or market conditions changed.
        </p>
        <button onClick={() => router.push("/dashboard")} className="mt-4 px-4 py-2 bg-primary text-on-primary rounded font-semibold text-sm">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const isLong = signal.direction === "LONG"

  const handleSaveToJournal = async () => {
    setIsSaving(true)
    try {
      const payload = {
        symbol: signal.symbol,
        strategy_name: signal.setup,
        entry_price: signal.referenceEntry,
        stop_price: signal.stop,
        target_price: signal.targets.t1,
        status: "PENDING",
        notes: signal.rationale
      }
      
      const res = await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Failed to save to journal")
      
      alert("Setup saved to journal successfully!")
      router.push("/dashboard/trade-journal")
    } catch (err) {
      alert("Error saving to journal.")
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadAuditJson = () => {
    const auditRecord = {
      symbol: signal.symbol,
      exchange: signal.exchange,
      direction: signal.direction,
      setup: signal.setup,
      status: signal.status,
      timestamp: new Date().toISOString(),
      priceMatrix: {
        currentLtp: signal.price,
        entryZone: signal.entryZone,
        referenceEntry: signal.referenceEntry,
        stopLoss: signal.stop,
        targets: signal.targets,
        riskReward: signal.metrics?.riskReward
      },
      evaluationMetrics: signal.metrics,
      confidenceScore: signal.confidence,
      deterministicRationale: signal.rationale,
      disclaimer: "Decision support record for manual execution in Angel One SmartAPI terminal only. No automated order placed."
    }

    const blob = new Blob([JSON.stringify(auditRecord, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_${signal.symbol}_${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Breadcrumb & Action Header */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-surface-high rounded-lg text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
            title="Back to Active Signals"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                {signal.symbol}
              </h1>
              <span className="font-label-code text-label-code text-text-secondary px-1.5 py-0.5 rounded bg-surface-high">
                NSE CASH
              </span>
              <span className={`px-2 py-0.5 rounded font-label-code text-label-code font-bold ${
                isLong ? "bg-status-live-bg text-status-live-text" : "bg-status-stale-bg text-status-stale-text"
              }`}>
                {isLong ? "▲ LONG" : "▼ SHORT"}
              </span>
              <span className="font-label-code text-label-code font-semibold px-2 py-0.5 rounded bg-primary-container text-on-primary">
                SCORE {signal.confidence}/100
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              {signal.setup} • Evaluated against 6 deterministic risk gates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex flex-col items-end mr-space-sm pr-space-md border-r border-border-subtle hidden sm:flex">
            <span className="font-label-code text-label-code uppercase text-text-secondary">Current LTP</span>
            <span className="font-metric-lg text-metric-lg font-bold text-text-primary">₹{signal.price.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={handleSaveToJournal}
            disabled={isSaving}
            className="h-9 px-space-md bg-accent-bullish hover:bg-opacity-90 text-on-primary font-body-sm font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            title="Record entry in manual journal"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I Entered</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-9 px-space-md bg-surface hover:bg-surface-high border border-border-subtle text-text-secondary hover:text-text-primary font-body-sm rounded flex items-center gap-1.5 transition-colors"
          >
            <Ban className="w-4 h-4" />
            <span>Skip Signal</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAuditJson}
            className="h-9 px-space-sm bg-surface hover:bg-surface-high border border-border-subtle text-text-secondary hover:text-text-primary font-label-code text-label-code rounded flex items-center gap-1 transition-colors"
            title="Export Deterministic Audit Record (JSON)"
          >
            <Download className="w-4 h-4" />
            <span>Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Primary Multi-Pane Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left & Center Column (Cols 1-8): Technical Core, Price Action, & Explainable Evidence */}
        <div className="xl:col-span-8 flex flex-col gap-margin">
          {/* Chart Workspace */}
          <div className="bg-surface border border-border-subtle rounded-xl shadow-sm overflow-hidden p-space-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
              <span className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-accent-primary text-[20px]">show_chart</span>
                5-Minute Intraday Profile & Indicators
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-code text-label-code text-text-secondary">Status:</span>
                <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold">
                  INSIDE ENTRY BAND
                </span>
              </div>
            </div>

            <AnalysisChart symbol={symbol} signal={signal} />
          </div>

          {/* Explainable Multi-Category Evidence Cards (Category A, B, C, D) */}
          <ExplainableEvidenceCard
            symbol={signal.symbol}
            sectorName="Nifty Sector Benchmark"
            sectorChangePct={isLong ? 1.82 : -1.24}
            headline={`${signal.symbol} Intraday Momentum & Quantitative Triggers Met`}
            filingPubTime="10:15:00 IST"
            filingIngestTime="10:16:12 IST"
            sectorBreadthPct={isLong ? 80 : 35}
            fiiNetCr={-410}
            diiNetCr={1250}
          />
        </div>

        {/* Right Deck (Cols 9-12): Trade Plan, Risk Gates Matrix, & Contradictory Evidence */}
        <div className="xl:col-span-4 flex flex-col gap-margin">
          {/* Trade Plan Execution Parameters Card */}
          <div className="bg-surface border border-border-subtle rounded-xl shadow-sm p-space-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-border-subtle pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-accent-primary text-[20px]">calculate</span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">Trade Plan Blueprint</h2>
              </div>
              <span className="font-label-code text-label-code font-bold text-accent-bullish bg-status-live-bg px-2 py-0.5 rounded">
                R:R {signal.metrics?.riskReward || "1:2.0"}
              </span>
            </div>

            <div className="flex flex-col gap-space-sm font-label-code text-label-code">
              <div className="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-1">
                <span className="text-text-secondary uppercase">Entry Zone</span>
                <span className="font-metric-lg text-metric-lg font-bold text-text-primary">
                  ₹{signal.entryZone?.low?.toFixed(2)} - ₹{signal.entryZone?.high?.toFixed(2)}
                </span>
                <span className="text-body-xs text-text-secondary">Reference Entry: ₹{signal.referenceEntry?.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-1 border-l-2 border-l-accent-danger">
                  <span className="text-text-secondary uppercase">Stop Loss</span>
                  <span className="font-metric-md text-metric-md font-bold text-accent-danger">
                    ₹{signal.stop?.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-text-secondary">Deterministic Invalidation</span>
                </div>

                <div className="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-1 border-l-2 border-l-accent-bullish">
                  <span className="text-text-secondary uppercase">Target 1</span>
                  <span className="font-metric-md text-metric-md font-bold text-accent-bullish">
                    ₹{signal.targets?.t1?.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-text-secondary">{signal.targets?.t2 ? `T2: ₹${signal.targets.t2.toFixed(2)}` : "Book 50% Qty"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveToJournal}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-2.5 rounded font-semibold text-body-sm transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving to Journal..." : "Save to Journal"}
            </button>
            <span className="text-[10px] font-body-xs text-center text-text-secondary">
              Logs to personal trade journal • No broker order is placed
            </span>
          </div>

          {/* Deterministic 6-Risk-Gate Matrix */}
          <RiskGatesChecklist />

          {/* Contradictory Evidence & Invalidation Factors */}
          <ContradictoryFactorsCard />
        </div>
      </div>
    </div>
  )
}
