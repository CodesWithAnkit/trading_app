import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SignalExit } from '@/mock/signals'

const state = { exitAlerts: [] as SignalExit[], dismissExitAlert: vi.fn() }
vi.mock('@/lib/contexts/SignalContext', () => ({ useSignals: () => state }))

import { ExitToasts } from './ExitToasts'

const exit = (overrides: Partial<SignalExit> = {}): SignalExit => ({
  id: 'sig-1', symbol: 'RELIANCE', setup: 'VWAP_TREND', reason: 'TARGET',
  exitPrice: 1474, exitAt: '2026-09-30T05:12:00.000Z', pnlPct: 1.6, stale: false, ...overrides,
})

describe('ExitToasts (spec 0010 AC-6)', () => {
  beforeEach(() => {
    state.exitAlerts = []
    state.dismissExitAlert = vi.fn()
  })

  it('names the stock, the reason, the exit price and the signed P&L', () => {
    state.exitAlerts = [exit()]
    render(<ExitToasts />)

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Exit RELIANCE: target hit')
    expect(toast).toHaveTextContent('₹1474.00')
    expect(toast).toHaveTextContent('+1.60%')
  })

  it('shows stop and time exits with their own wording, and flags a stale price', () => {
    state.exitAlerts = [exit({ id: 'a', reason: 'STOP', pnlPct: -1.1 }), exit({ id: 'b', symbol: 'SBIN', reason: 'TIME', stale: true, pnlPct: 0 })]
    render(<ExitToasts />)

    const [stop, time] = screen.getAllByRole('status')
    expect(stop).toHaveTextContent('stop hit')
    expect(stop).toHaveTextContent('-1.10%')
    expect(time).toHaveTextContent('Exit SBIN: time exit (15:15)')
    expect(time).toHaveTextContent('(last known price)')
  })

  it('dismisses when the close button is pressed', async () => {
    state.exitAlerts = [exit()]
    const user = userEvent.setup()
    render(<ExitToasts />)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(state.dismissExitAlert).toHaveBeenCalledWith('sig-1')
  })

  it('lives in a labelled region with an accessible close button', () => {
    state.exitAlerts = [exit()]
    render(<ExitToasts />)
    expect(screen.getByRole('region', { name: 'Exit alerts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('renders nothing but the empty region when there are no alerts', () => {
    render(<ExitToasts />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  describe('auto dismiss', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('dismisses itself after 12 seconds, even if live updates re-render it meanwhile', () => {
      state.exitAlerts = [exit()]
      const { rerender } = render(<ExitToasts />)

      act(() => vi.advanceTimersByTime(8_000))
      rerender(<ExitToasts />) // a stream update re-renders the list
      act(() => vi.advanceTimersByTime(4_000))

      expect(state.dismissExitAlert).toHaveBeenCalledTimes(1)
      expect(state.dismissExitAlert).toHaveBeenCalledWith('sig-1')
    })
  })
})
