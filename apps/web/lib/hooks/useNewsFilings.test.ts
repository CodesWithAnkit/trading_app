import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNewsFilings } from './useNewsFilings'

describe('useNewsFilings', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          events: [
            {
              id: 'evt-test-1',
              symbol: 'TATASTEEL',
              headline: 'Tata Steel Commissions Expansion',
              excerpt: 'Capacity enhanced.',
              source: 'NSE NEAPS',
              publishedAt: new Date().toISOString(),
              ingestedAt: new Date().toISOString(),
              clockSkewMs: 150,
              eventType: 'OFFICIAL_FILING',
              impactLevel: 'HIGH',
              direction: 'BULLISH',
              confidence: 1.0,
              isOfficialFiling: true,
            },
          ],
          totalCount: 1,
          officialCount: 1,
          highImpactCount: 1,
          lastIngestionAt: new Date().toISOString(),
        }),
      })
    )

    class MockEventSource {
      addEventListener = vi.fn()
      close = vi.fn()
    }
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // covers: 0018 AC-5, AC-9
  it('fetches symbol specific filings when symbol argument is provided', async () => {
    const { result } = renderHook(() => useNewsFilings('TATASTEEL'))

    // spec 0024 AC-7: no seed items before the first load.
    expect(result.current.events).toEqual([])

    await waitFor(() => {
      expect(result.current.events[0].id).toBe('evt-test-1')
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/intelligence/news?symbol=TATASTEEL')
    expect(result.current.totalCount).toBe(1)
    expect(result.current.officialCount).toBe(1)
  })

  // covers: 0018 AC-5, 0024 AC-7
  it('shows no invented items when fetch returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch news')))

    const { result } = renderHook(() => useNewsFilings())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.events).toEqual([])
    expect(result.current.hasLoaded).toBe(true)
  })
})
