"use client"
import * as React from "react"
import type { ExplainableAnalysisContract } from "../contracts/intelligence"

export interface UseExplainableAnalysisReturn {
  analysis: ExplainableAnalysisContract | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  exportAuditJson: () => void
}

export function useExplainableAnalysis(symbol: string): UseExplainableAnalysisReturn {
  const [analysis, setAnalysis] = React.useState<ExplainableAnalysisContract | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchAnalysis = React.useCallback(async () => {
    if (!symbol) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/v1/intelligence/analysis/${encodeURIComponent(symbol)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data: ExplainableAnalysisContract = await res.json()
      setAnalysis(data)
      setError(null)
    } catch (err: any) {
      console.warn(`Failed fetching explainable analysis for ${symbol}:`, err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  React.useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // One-click export of audited JSON snapshot (AC-10, Spec 0018)
  const exportAuditJson = React.useCallback(() => {
    if (!analysis) return
    const auditRecord = {
      recordType: "TACTICAL_PRECISION_TERMINAL_AUDIT_SNAPSHOT",
      symbol: analysis.symbol,
      setup: analysis.setupName,
      timestamp: analysis.timestamp,
      verificationHash: analysis.auditVerificationHash,
      ruleVersion: analysis.ruleVersion,
      marketRegime: analysis.marketRegime,
      qualificationStatus: analysis.qualificationStatus,
      rejectionReason: analysis.rejectionReason,
      deterministicRiskGates: analysis.riskGates,
      tradePlan: analysis.tradePlan,
      positiveSupportingEvidence: analysis.positiveEvidence,
      contradictoryFrictionFactors: analysis.contradictoryFactors,
      historicalContext: analysis.historicalContext,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(auditRecord, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_${analysis.symbol}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [analysis])

  return {
    analysis,
    isLoading,
    error,
    refresh: fetchAnalysis,
    exportAuditJson,
  }
}
