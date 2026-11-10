import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const fetchToggles = vi.fn()
const updateToggle = vi.fn()
vi.mock('@/lib/hooks/useBacktest', () => ({ fetchToggles: () => fetchToggles(), updateToggle: (...a: unknown[]) => updateToggle(...a) }))

import { LiveToggle, LiveGuruRulesList } from './LiveToggle'

const row = (over: object) => ({ ruleId: 'UP_ORB', symbol: 'NIFTY', enabled: false, state: 'off', reason: null, runId: 'r1', updatedAt: null, ...over })

beforeEach(() => {
  fetchToggles.mockReset()
  updateToggle.mockReset()
})

describe('LiveToggle (spec 0023 AC-1, AC-8)', () => {
  it('switches a passing rule on and shows the new state', async () => {
    fetchToggles.mockResolvedValue([row({})])
    updateToggle.mockResolvedValue(row({ enabled: true, state: 'warming up', reason: 'Needs 30 stored 5m bars, has 12.' }))
    render(<LiveToggle ruleId="UP_ORB" symbol="NIFTY" />)
    const sw = await screen.findByRole('switch', { name: /UP_ORB on NIFTY/ })
    fireEvent.click(sw)
    await waitFor(() => expect(screen.getByText('warming up')).toBeInTheDocument())
    expect(updateToggle).toHaveBeenCalledWith('UP_ORB', 'NIFTY', true)
    expect(screen.getByText(/Needs 30 stored/)).toBeInTheDocument()
  })

  it('cannot be switched on with no run', async () => {
    fetchToggles.mockResolvedValue([row({ state: 'no run', reason: 'No done backtest run for this rule and symbol.' })])
    render(<LiveToggle ruleId="UP_ORB" symbol="NIFTY" />)
    expect(await screen.findByRole('switch')).toBeDisabled()
  })

  it('shows a 409 from the server instead of flipping', async () => {
    fetchToggles.mockResolvedValue([row({})])
    updateToggle.mockRejectedValue(new Error('The latest backtest run does not pass the gate.'))
    render(<LiveToggle ruleId="UP_ORB" symbol="NIFTY" />)
    fireEvent.click(await screen.findByRole('switch'))
    expect(await screen.findByRole('alert')).toHaveTextContent('does not pass the gate')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })
})

describe('LiveGuruRulesList (AC-8)', () => {
  it('lists only enabled rules, read only', async () => {
    fetchToggles.mockResolvedValue([row({ enabled: true, state: 'blocked' }), row({ ruleId: 'GJ_PDHL' })])
    render(<LiveGuruRulesList />)
    expect(await screen.findByText('UP_ORB · NIFTY')).toBeInTheDocument()
    expect(screen.queryByText('GJ_PDHL · NIFTY')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
