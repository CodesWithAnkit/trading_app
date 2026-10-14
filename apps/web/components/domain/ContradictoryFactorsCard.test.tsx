import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContradictoryFactorsCard, type FrictionFactor } from './ContradictoryFactorsCard'

describe('ContradictoryFactorsCard', () => {
  // covers: 0017 AC-8, 0018 AC-4
  it('renders default contradictory friction factors and badge count', () => {
    render(<ContradictoryFactorsCard />)

    expect(screen.getByText('Contradictory / Friction Factors')).toBeInTheDocument()
    expect(screen.getByText('3 FLAGS')).toBeInTheDocument()
    expect(screen.getByText(/Overhead Supply Zone/i)).toBeInTheDocument()
    expect(screen.getByText(/Global Asian Steel Weakness/i)).toBeInTheDocument()
    expect(screen.getByText(/Derivative Call Concentration/i)).toBeInTheDocument()
  })

  // covers: 0017 AC-8, 0018 AC-4
  it('renders custom friction factors with tailored badge count and description', () => {
    const customFactors: FrictionFactor[] = [
      {
        id: 'flag-1',
        title: 'Impending RBI Monetary Policy Statement',
        description: 'Interest rate decision scheduled within 30 minutes. High event volatility risk.',
        icon: 'warning',
      },
    ]

    render(<ContradictoryFactorsCard factors={customFactors} />)

    expect(screen.getByText('1 FLAGS')).toBeInTheDocument()
    expect(screen.getByText('Impending RBI Monetary Policy Statement')).toBeInTheDocument()
    expect(screen.getByText(/Interest rate decision scheduled within 30 minutes/i)).toBeInTheDocument()
  })
})
