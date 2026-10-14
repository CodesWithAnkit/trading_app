import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { Signal } from '@/mock/signals'
import { SignalCard, minutesLeft } from './SignalCard'

const NOW = new Date('2026-09-30T05:00:00.000Z').getTime()

const signal = (expiresInMs: number): Signal => ({
  id: 'sig-1', symbol: 'OFSS', exchange: 'NSE', direction: 'LONG', setup: 'BREAKOUT_MOMENTUM', status: 'ACTIVE',
  price: 10784, entryZone: { low: 10778.61, high: 10789.39 }, referenceEntry: 10784, stop: 10525, targets: { t1: 11302 },
  confidence: 90, confidenceBand: 'HIGH', createdAt: new Date(NOW - 5 * 60_000).toISOString(),
  expiresAt: new Date(NOW + expiresInMs).toISOString(), rationale: '',
  metrics: { relativeVolume: '1x', trendAlignment: '', volatility: '', liquidity: '', riskReward: '1:2' },
})

describe('minutesLeft', () => {
  it('rounds up to whole minutes and never goes below zero', () => {
    expect(minutesLeft(new Date(NOW + 17 * 60_000 + 1).toISOString(), NOW)).toBe(18)
    expect(minutesLeft(new Date(NOW + 60_000).toISOString(), NOW)).toBe(1)
    expect(minutesLeft(new Date(NOW - 60_000).toISOString(), NOW)).toBe(0)
  })

  it('is unknown before the client clock is available, or for a bad date', () => {
    expect(minutesLeft(new Date(NOW).toISOString(), null)).toBeNull()
    expect(minutesLeft('not a date', NOW)).toBeNull()
  })
})

describe('SignalCard expiry countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it("shows the minutes left from the signal's own expiry time", () => {
    render(<SignalCard signal={signal(18 * 60_000)} />)
    expect(screen.getByText('Expires in 18m')).toBeInTheDocument()
  })

  it('counts down as time passes', () => {
    render(<SignalCard signal={signal(18 * 60_000)} />)
    act(() => vi.advanceTimersByTime(2 * 60_000))
    expect(screen.getByText('Expires in 16m')).toBeInTheDocument()
  })

  it('says the entry window is closed once the expiry time has passed', () => {
    render(<SignalCard signal={signal(-60_000)} />)
    expect(screen.getByText('Entry window closed')).toBeInTheDocument()
  })

  it('explains what the countdown means on hover', () => {
    render(<SignalCard signal={signal(3 * 60_000)} />)
    expect(screen.getByText('Expires in 3m').parentElement).toHaveAttribute('title', expect.stringMatching(/Time left to enter/))
  })
})
