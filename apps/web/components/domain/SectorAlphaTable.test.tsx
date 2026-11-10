import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SectorAlphaTable, type SectorRow } from './SectorAlphaTable'

const row = (over: Partial<SectorRow>): SectorRow => ({
  name: 'Nifty X', ltp: 1000, changePct: 0, alphaVsNifty: 0, leaderSymbol: 'ABC', leaderChangePct: 0, advances: 5, declines: 5, bias: 'NEUTRAL', ...over,
})

const rows = [
  row({ name: 'Nifty IT', alphaVsNifty: -1.27, bias: 'SHORT' }),
  row({ name: 'Nifty Metal', alphaVsNifty: 1.6, bias: 'LONG', ltp: 9240.5, changePct: 2.45 }),
  row({ name: 'Nifty Auto', alphaVsNifty: 0.77, bias: 'LONG' }),
  row({ name: 'Nifty Bank', alphaVsNifty: 0.09 }),
]

describe('SectorAlphaTable', () => {
  it('sorts by alpha, strongest first', () => {
    render(<SectorAlphaTable rows={rows} />)
    const names = within(screen.getByRole('table')).getAllByRole('rowheader').map((th) => th.textContent)
    expect(names).toEqual(['Nifty Metal', 'Nifty Auto', 'Nifty Bank', 'Nifty IT'])
  })

  it('says how many sectors clear the +0.50% gate, and labels each bar for screen readers', () => {
    render(<SectorAlphaTable rows={rows} />)
    expect(screen.getByText(/2 of 4 sectors clear the \+0.50% alpha gate/)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('passes the alpha gate')).toHaveLength(2)
    expect(within(table).getAllByText('below the alpha gate')).toHaveLength(2)
  })

  it('formats price, signed change, and bias in one line each', () => {
    render(<SectorAlphaTable rows={rows} />)
    const metal = within(screen.getByRole('table')).getByRole('rowheader', { name: 'Nifty Metal' }).closest('tr')!
    expect(metal).toHaveTextContent('9,240.50')
    expect(metal).toHaveTextContent('+2.45%')
    expect(metal).toHaveTextContent('+1.60%')
    expect(metal).toHaveTextContent('Long')
    const it = within(screen.getByRole('table')).getByRole('rowheader', { name: 'Nifty IT' }).closest('tr')!
    expect(it).toHaveTextContent('−1.27%')
    expect(it).toHaveTextContent('Short')
  })

  it('renders a phone list alongside the table', () => {
    render(<SectorAlphaTable rows={rows} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })
})
