import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExplainableAnalysis } from './useExplainableAnalysis'

describe('useExplainableAnalysis', () => {
  const mockAnalysis = {
    symbol: 'TATASTEEL',
    setupName: 'VWAP_PULLBACK_CONTINUATION',
    timestamp: new Date().toISOString(),
    auditVerificationHash: 'sha256-sample-hash',
    ruleVersion: '2.4.0',
    marketRegime: 'BULLISH_TREND_DAY',
    qualificationStatus: 'QUALIFIED',
    riskGates: [
      { id: 'gate-1', name: 'Liquidity Check', status: 'PASS', detail: 'OK' },
    ],
    tradePlan: {
      direction: 'LONG',
      entryPrice: 158.4,
      stopLoss: 156.0,
      target1: 162.0,
      target2: 165.0,
      estimatedCharges: 40.0,
      netRewardRisk: 2.1,
    },
    positiveEvidence: {
      categoryA: ['Primary Trend Alignment'],
      categoryB: ['Volume Expansion'],
      categoryC: ['Sector Alpha'],
      categoryD: ['Official Filing Positive'],
    },
    contradictoryFactors: [
      { id: 'f-1', title: 'Overhead Resistance', description: 'R1 Pivot at 160' },
    ],
    historicalContext: {
      sampleSize: 45,
      winRatePct: 68.5,
    },
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockAnalysis,
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // covers: 0018 AC-5
  it('fetches explainable analysis for the given symbol on mount', async () => {
    const { result } = renderHook(() => useExplainableAnalysis('TATASTEEL'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.analysis?.symbol).toBe('TATASTEEL')
    expect(result.current.analysis?.qualificationStatus).toBe('QUALIFIED')
    expect(fetch).toHaveBeenCalledWith('/api/v1/intelligence/analysis/TATASTEEL')
  })

  // covers: 0018 AC-10
  it('creates downloadable JSON audit artifact when exportAuditJson is called', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    const { result } = renderHook(() => useExplainableAnalysis('TATASTEEL'))

    await waitFor(() => {
      expect(result.current.analysis).not.toBeNull()
    })

    act(() => {
      result.current.exportAuditJson()
    })

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })
})
