import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { RunRow } from '@/lib/hooks/useBacktest'

// Test double for the hook's return value; shape varies per test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const state: any = {}
vi.mock('@/lib/hooks/useBacktest', () => ({
  useBacktest: () => state,
  fetchTrades: vi.fn(),
  fetchToggles: () => Promise.resolve([]),
  updateToggle: vi.fn(),
}))

import { BacktestLab } from './BacktestLab'
import { isMarketHours, yearsPositive } from './format'

const run = (over: Partial<RunRow>): RunRow => ({
  id: Math.random().toString(36).slice(2),
  rule_id: 'UP_ORB',
  symbol: 'NIFTY',
  status: 'done',
  window_start: '2017-01-02',
  window_end: '2026-11-05',
  oos_start: '2023-12-14',
  passed_gate: false,
  created_at: '2026-11-06T13:00:00Z',
  finished_at: '2026-11-06T13:12:00Z',
  out_of_sample: {
    trades: 498,
    winRate: 0.351,
    netR: 4.2,
    profitFactor: 1.02,
    maxDrawdownR: 18.7,
    perYear: { '2024': { trades: 231, netR: 6.8, full: true }, '2025': { trades: 236, netR: -3.1, full: true }, '2026': { trades: 31, netR: 0.5, full: false } },
    equity: [0, 2, -1, 4.2],
    gate: { ok: false, reasons: ['PF 1.02 < 1.1'], fullYears: 2, positiveYears: 1 },
  },
  ...over,
})

const defs = {
  version: 'v1',
  rules: { UP_ORB: { name: 'Umar Punjabi · 30 min opening range', style: 'range', text: 'Range = 09:15 to 09:45.' }, BASE_COIN: { name: 'Coin toss 1:2', style: 'baseline', text: 'Random.' } },
  ruleIds: [],
  gate: { minProfitFactor: 1.1, minTrades: 100, minFullOosYears: 2, minPositiveYearShare: 0.6 },
}

beforeEach(() => {
  Object.assign(state, {
    board: {
      done: [run({}), run({ symbol: 'SENSEX' }), run({ rule_id: 'BASE_COIN', out_of_sample: { trades: 700, winRate: 0.32, netR: -41.2, profitFactor: 0.87, maxDrawdownR: 49.8, perYear: {} } })],
      active: [],
      recentFailures: [],
    },
    defs,
    backfill: { status: 'idle', startedAt: null, finishedAt: null, rows: 0, retries: 0, series: {}, log: [], error: null },
    history: { 'NIFTY|5m': { count: 1000, first: null, last: null } },
    error: null,
    notice: null,
    setNotice: vi.fn(),
    startRuns: vi.fn(),
    startBackfill: vi.fn(),
  })
})

describe('BacktestLab (spec 0020 AC-9)', () => {
  it('shows the leaderboard with FAIL and BASELINE badges and the coin median', () => {
    render(<BacktestLab />)
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getAllByText('FAIL').length).toBe(2)
    expect(within(table).getByText('BASELINE')).toBeInTheDocument()
    expect(screen.getAllByText('−41.2 R').length).toBeGreaterThan(0)
    expect(screen.getByText('0 / 5')).toBeInTheDocument()
  })

  it('filters by symbol', () => {
    render(<BacktestLab />)
    fireEvent.click(screen.getByRole('button', { name: 'SENSEX' }))
    const table = screen.getAllByRole('table')[0]
    expect(within(table).queryByText(/· NIFTY/)).toBeNull()
    expect(within(table).getAllByText(/· SENSEX/).length).toBe(1)
  })

  it('explains why the selected rule failed the gate and shows the terminal commands', () => {
    render(<BacktestLab />)
    expect(screen.getByText(/PF 1.02 < 1.1/)).toBeInTheDocument()
    expect(screen.getByText('npm run backtest -- --run all --symbols NIFTY,SENSEX')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Equity curve/ })).toBeInTheDocument()
  })

  it('Run all queues every rule and baseline on both symbols', () => {
    render(<BacktestLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Run all rules' }))
    expect(state.startRuns).toHaveBeenCalledWith(['GJ_PDHL', 'MR_EMA_PIN', 'UP_ORB', 'SP_5EMA', 'AST_RG', 'BASE_COIN', 'BASE_BUYHOLD'], ['NIFTY', 'SENSEX'])
  })

  it('shows the empty state with a backfill button when no history exists', () => {
    state.history = { 'NIFTY|5m': { count: 0, first: null, last: null } }
    render(<BacktestLab />)
    expect(screen.getByText('No history yet')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Backfill history' })[0])
    expect(state.startBackfill).toHaveBeenCalledWith(['NIFTY', 'SENSEX'])
  })

  it('shows a 409 notice and a failed run with Run again', () => {
    state.notice = { tone: 'error', title: 'Nothing was started', text: 'Already active: UP_ORB · NIFTY. Nothing was queued.' }
    state.board.recentFailures = [run({ status: 'failed', error: 'interrupted by restart', created_at: '2026-11-07T00:00:00Z' })]
    render(<BacktestLab />)
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was started')
    expect(screen.getByText('interrupted by restart')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Run again' }))
    expect(state.startRuns).toHaveBeenCalledWith(['UP_ORB'], ['NIFTY'])
  })
})

describe('format helpers', () => {
  it('counts only full years', () => {
    expect(yearsPositive(run({}))).toBe('1 / 2')
  })
  it('market hours are 09:15 to 15:30 IST on weekdays', () => {
    expect(isMarketHours(new Date('2026-11-06T05:00:00Z'))).toBe(true) // Fri 10:30 IST
    expect(isMarketHours(new Date('2026-11-06T11:00:00Z'))).toBe(false) // Fri 16:30 IST
    expect(isMarketHours(new Date('2026-11-07T05:00:00Z'))).toBe(false) // Saturday
  })
})

describe('history unavailable (spec 0022 AC-4, AC-5)', () => {
  it('shows NO DATA for an unavailable symbol and says the gate was judged on NIFTY only', () => {
    const gate = { ok: false, reasons: ['PF 1.02 < 1.1'], fullYears: 2, positiveYears: 1, judgedOn: ['NIFTY'], unavailable: [{ symbol: 'SENSEX', provider: 'kite' }] }
    state.board.done = [
      run({ out_of_sample: { ...run({}).out_of_sample!, gate } }),
      run({ symbol: 'SENSEX', out_of_sample: { unavailable: true, provider: 'kite', reason: 'No 5m history for SENSEX from kite (unavailable from the provider, or not backfilled yet).', gate } }),
    ]
    render(<BacktestLab />)
    expect(screen.getAllByRole('status').some((el) => el.textContent?.includes('Gate judged on NIFTY only: SENSEX history unavailable from kite.'))).toBe(true)
    expect(within(screen.getAllByRole('table')[0]).getByText('NO DATA')).toBeInTheDocument()
  })
})
