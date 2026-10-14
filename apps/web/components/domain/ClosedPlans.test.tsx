import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { Signal } from '@/mock/signals'
import { ClosedPlans } from './ClosedPlans'

const signal = (overrides: Partial<Signal> = {}): Signal => ({
  id: 'sig-1', symbol: 'RELIANCE', exchange: 'NSE', direction: 'LONG', setup: 'VWAP_TREND', status: 'TARGET_HIT',
  price: 100, entryZone: { low: 99.95, high: 100.05 }, referenceEntry: 100, stop: 99, targets: { t1: 102 },
  confidence: 80, confidenceBand: 'HIGH', createdAt: '2026-09-30T04:30:00.000Z', expiresAt: '2026-09-30T05:00:00.000Z',
  rationale: '', metrics: { relativeVolume: '1x', trendAlignment: '', volatility: '', liquidity: '', riskReward: '' },
  exitPrice: 102.1, exitAt: '2026-09-30T05:12:00.000Z', exitReason: 'TARGET', ...overrides,
})

describe('ClosedPlans (spec 0010 AC-6)', () => {
  it('renders nothing when no plan has closed today', () => {
    const { container } = render(<ClosedPlans signals={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each closed plan with its reason, IST exit time and P&L from the entry', () => {
    render(<ClosedPlans signals={[signal(), signal({ id: 'sig-2', symbol: 'SBIN', exitReason: 'STOP', status: 'STOP_HIT', exitPrice: 98.9 })]} />)

    expect(screen.getByRole('heading', { name: 'Closed today (2)' })).toBeInTheDocument()
    const [reliance, sbin] = screen.getAllByRole('listitem')
    expect(reliance).toHaveTextContent('Target hit')
    expect(reliance).toHaveTextContent('+2.10%')
    expect(reliance).toHaveTextContent('10:42') // 05:12 UTC is 10:42 IST
    expect(sbin).toHaveTextContent('Stop hit')
    expect(sbin).toHaveTextContent('-1.10%')
  })

  it('labels a 15:15 close as a time exit', () => {
    render(<ClosedPlans signals={[signal({ exitReason: 'TIME', status: 'TIME_EXIT', exitPrice: 100 })]} />)
    expect(screen.getByText('Time exit')).toBeInTheDocument()
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })

  it('links each plan to its analysis page', () => {
    render(<ClosedPlans signals={[signal({ symbol: 'M&M' })]} />)
    const link = within(screen.getByRole('listitem')).getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard/analysis/M%26M')
  })
})
