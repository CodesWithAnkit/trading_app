import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskGatesChecklist, type RiskGateItem } from './RiskGatesChecklist'

describe('RiskGatesChecklist', () => {
  // covers: 0017 AC-9, 0018 AC-4
  it('renders default 6 deterministic risk gates with all pass status', () => {
    render(<RiskGatesChecklist />)

    expect(screen.getByText('Pre-Setup Risk-Gate Matrix')).toBeInTheDocument()
    expect(screen.getByText('ALL 6 GATES PASS')).toBeInTheDocument()
    expect(screen.getByText('Gate 1: Liquidity & Free-Float')).toBeInTheDocument()
    expect(screen.getByText('Gate 2: SmartAPI Feed Latency')).toBeInTheDocument()
    expect(screen.getByText('Gate 3: Net Risk/Reward Ratio')).toBeInTheDocument()
    expect(screen.getByText('Gate 4: Daily Loss Limit Room')).toBeInTheDocument()
    expect(screen.getByText('Gate 5: Event Dislocation Guard')).toBeInTheDocument()
    expect(screen.getByText('Gate 6: Contradictory Evidence')).toBeInTheDocument()

    const passBadges = screen.getAllByText('PASS')
    expect(passBadges.length).toBe(6)
  })

  // covers: 0017 AC-9, 0018 AC-7
  it('displays gates rejected warning badge when any gate fails or rejects', () => {
    const customGates: RiskGateItem[] = [
      {
        id: 'gate-1',
        name: 'Gate 1: Liquidity Check',
        detail: 'Turnover adequate',
        status: 'PASS',
      },
      {
        id: 'gate-2',
        name: 'Gate 2: Feed Latency',
        detail: 'Latency 5200ms exceeds 5000ms threshold',
        status: 'REJECT',
      },
    ]

    render(<RiskGatesChecklist gates={customGates} />)

    expect(screen.getByText('GATES REJECTED / NO TRADE')).toBeInTheDocument()
    expect(screen.getByText('REJECT')).toBeInTheDocument()
    expect(screen.getByText('Gate 2: Feed Latency')).toBeInTheDocument()
    expect(screen.getByText('Latency 5200ms exceeds 5000ms threshold')).toBeInTheDocument()
  })

  // covers: 0018 AC-4
  it('displays NO TRADE badge when gate status is NO_TRADE', () => {
    const customGates: RiskGateItem[] = [
      {
        id: 'gate-1',
        name: 'Gate 1: Extension Guard',
        detail: 'Price extended 2.4 ATR above 20 EMA',
        status: 'NO_TRADE',
      },
    ]

    render(<RiskGatesChecklist gates={customGates} />)

    expect(screen.getByText('GATES REJECTED / NO TRADE')).toBeInTheDocument()
    expect(screen.getByText('NO TRADE')).toBeInTheDocument()
  })
})
