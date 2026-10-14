import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMarketIntelligence } from './useMarketIntelligence'

describe('useMarketIntelligence', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          regime: 'BULLISH_TREND_DAY',
          regimeLabel: 'REGIME 01 // BULLISH TREND DAY',
          regimeDescription: 'Expansion day',
          regimeConfidence: 90,
          niftyLtp: 24900.0,
          niftyChangePct: 1.0,
          vixLtp: 13.0,
          vixChangePct: -4.0,
          vixStatus: 'LOW_NORMAL',
          advanceCount: 160,
          declineCount: 40,
          unchangedCount: 30,
          advanceDeclineRatio: 4.0,
          pctAboveVwap: 75,
          medianDayChange: 1.0,
          sectors: [],
          snapshotTime: new Date().toISOString(),
          feedLatencyMs: 25,
          feedHealth: 'HEALTHY',
        }),
      })
    )

    // Mock EventSource
    class MockEventSource {
      addEventListener = vi.fn()
      close = vi.fn()
    }
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // covers: 0018 AC-5
  it('initializes with default context and fetches latest state', async () => {
    const { result } = renderHook(() => useMarketIntelligence())

    expect(result.current.data).toBeDefined()
    expect(result.current.isStale).toBe(false)
    expect(result.current.isDisconnected).toBe(false)

    await waitFor(() => {
      expect(result.current.data?.niftyLtp).toBe(24900.0)
    })
  })

  // covers: 0018 AC-5, AC-7
  it('handles fetch error while preserving existing data state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network disconnected'))
    )

    const { result } = renderHook(() => useMarketIntelligence())

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.isDisconnected).toBe(true)
  })
})
