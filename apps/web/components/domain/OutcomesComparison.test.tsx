import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutcomesComparison } from './OutcomesComparison'

const outcome = (overrides: Record<string, unknown> = {}) => ({
  id: 'sig-1', symbol: 'RELIANCE', exchange: 'NSE', direction: 'LONG', setup: 'VWAP_TREND', status: 'ACTIVE',
  price: 100, entryZone: { low: 99.95, high: 100.05 }, referenceEntry: 100, stop: 99, targets: { t1: 102 },
  confidence: 80, confidenceBand: 'HIGH', createdAt: '', expiresAt: '', rationale: '', metrics: {},
  actualHigh: 102.5, actualLow: 98.5, actualClose: 101, outcomeStatus: 'LOST', outcomePnlPct: -1,
  exitPrice: null, exitAt: null, exitReason: null, ...overrides,
})

function mockFetch(status: number, body?: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300, json: async () => body }) as any
}

describe('OutcomesComparison (spec 0009 AC-9, AC-10; spec 0010 AC-9)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows an honest empty state when no signal fired today (404)', async () => {
    mockFetch(404)
    render(<OutcomesComparison />)
    expect(await screen.findByText('No signals fired today, so there is nothing to compare.')).toBeInTheDocument()
  })

  it('shows an error state when the API fails', async () => {
    mockFetch(500)
    render(<OutcomesComparison />)
    expect(await screen.findByText(/Could not load outcomes/)).toBeInTheDocument()
  })

  it('summarises how many signals fired and how many won', async () => {
    mockFetch(200, { date: '2026-09-30', data: [outcome()], summary: { total: 3, winners: 1, losers: 1, neutral: 0, pending: 1 } })
    render(<OutcomesComparison />)
    expect(await screen.findByText(/3 signals fired today, 1 was a winner/)).toBeInTheDocument()
    expect(screen.getByText(/1 awaiting reconciliation/)).toBeInTheDocument()
  })

  it('leads with the live exit and shows the candle check beside it', async () => {
    mockFetch(200, {
      date: '2026-09-30',
      data: [outcome({ status: 'TARGET_HIT', exitReason: 'TARGET', exitPrice: 102.1, exitAt: '2026-09-30T05:12:00Z' })],
      summary: { total: 1, winners: 0, losers: 1, neutral: 0, pending: 0 },
    })
    render(<OutcomesComparison />)

    expect(await screen.findByText('Target hit')).toBeInTheDocument()
    expect(screen.getByText('Candle check: LOST')).toBeInTheDocument()
    expect(screen.getByText(/we exited at/)).toHaveTextContent('₹102.10')
    expect(screen.getByText('+2.10%')).toBeInTheDocument() // live P&L, not the candle check's -1%
  })

  it('falls back to the candle check alone for a plan without a live exit', async () => {
    mockFetch(200, { date: '2026-09-30', data: [outcome({ outcomeStatus: 'WON', outcomePnlPct: 2 })], summary: { total: 1, winners: 1, losers: 0, neutral: 0, pending: 0 } })
    render(<OutcomesComparison />)
    expect(await screen.findByText('WON')).toBeInTheDocument()
    expect(screen.queryByText(/Candle check/)).not.toBeInTheDocument()
    expect(screen.getByText('+2.00%')).toBeInTheDocument()
  })

  it('marks a plan with no result yet as pending', async () => {
    mockFetch(200, { date: '2026-09-30', data: [outcome({ outcomeStatus: null, outcomePnlPct: null })], summary: { total: 1, winners: 0, losers: 0, neutral: 0, pending: 1 } })
    render(<OutcomesComparison />)
    expect(await screen.findByText('Pending')).toBeInTheDocument()
  })
})
