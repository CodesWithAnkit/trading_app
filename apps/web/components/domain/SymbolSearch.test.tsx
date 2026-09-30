import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const signals = {
  momentum: [] as any[],
  activeSignals: [] as any[],
  approachingSignals: [] as any[],
}
vi.mock('@/lib/contexts/SignalContext', () => ({ useSignals: () => signals }))

import { SymbolSearch } from './SymbolSearch'

const UNIVERSE = ['AXISBANK', 'BANKBARODA', 'HDFCBANK', 'IDEA', 'M&M', 'RELIANCE', 'RELINFRA']
const stock = (symbol: string, ltp: number, dayChangePct: number, ranked = true) =>
  ({ symbol, ltp, dayChangePct, ranked, volume: 0, relativeVolume: 1, trend: 'UP', momentumScore: dayChangePct, lastTickAt: '' })

function stubUniverse(symbols: string[] | 'fail') {
  globalThis.fetch = vi.fn(async () =>
    symbols === 'fail'
      ? ({ ok: false, status: 500, json: async () => ({}) })
      : ({ ok: true, json: async () => ({ data: symbols.map(symbol => ({ symbol })) }) })
  ) as any
}

async function typeInto(text: string) {
  const user = userEvent.setup()
  const box = screen.getByRole('combobox', { name: 'Search F&O stocks' })
  await user.click(box)
  if (text) await user.type(box, text)
  return { user, box }
}

describe('SymbolSearch (spec 0012)', () => {
  beforeEach(() => {
    push.mockReset()
    signals.momentum = []
    signals.activeSignals = []
    signals.approachingSignals = []
    stubUniverse(UNIVERSE)
  })
  afterEach(() => vi.restoreAllMocks())

  it('lists matches with starts-with first, from today\'s watched list (AC-1, AC-2)', async () => {
    render(<SymbolSearch />)
    await typeInto('bank')
    const options = await screen.findAllByRole('option')
    expect(options.map(o => within(o).getByText(/BANK/).textContent)).toEqual(['BANKBARODA', 'AXISBANK', 'HDFCBANK'])
    expect(fetch).toHaveBeenCalledWith('/api/v1/scanner/universe')
  })

  it('fetches the list only once, however much you type (AC-1)', async () => {
    render(<SymbolSearch />)
    await typeInto('reliance')
    await screen.findAllByRole('option')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shows live price, signed change and tags; "–" before a tick arrives (AC-1, AC-3)', async () => {
    signals.momentum = [stock('RELIANCE', 1450.25, 1.6), stock('RELINFRA', 200, -2.5)]
    signals.activeSignals = [{ symbol: 'RELIANCE' }]
    signals.approachingSignals = [{ symbol: 'RELINFRA' }]
    const { rerender } = render(<SymbolSearch />)
    const { user, box } = await typeInto('rel')

    const [reliance, relinfra] = await screen.findAllByRole('option')
    expect(reliance).toHaveTextContent('₹1450.25')
    expect(reliance).toHaveTextContent('+1.60%')
    expect(reliance).toHaveTextContent('Top 20')
    expect(reliance).toHaveTextContent('Open plan')
    expect(relinfra).toHaveTextContent('-2.50%')
    expect(relinfra).toHaveTextContent('Approaching')

    signals.momentum = [] // no tick yet for IDEA
    rerender(<SymbolSearch />)
    await user.clear(box)
    await user.type(box, 'ide')
    const idea = (await screen.findAllByRole('option'))[0]
    expect(idea).toHaveTextContent('IDEA')
    expect(within(idea).getAllByText('–')).toHaveLength(2)
  })

  it('shows at most 8 results (AC-3)', async () => {
    stubUniverse(Array.from({ length: 15 }, (_, i) => `STOCK${String(i).padStart(2, '0')}`))
    render(<SymbolSearch />)
    await typeInto('stock')
    expect(await screen.findAllByRole('option')).toHaveLength(8)
  })

  it('says so when nothing matches (AC-4)', async () => {
    render(<SymbolSearch />)
    await typeInto('zzzz')
    expect(await screen.findByText('No F&O stock matches "zzzz"')).toBeInTheDocument()
  })

  it('opens the analysis page for a stock with an open plan, the market page otherwise, and clears (AC-5)', async () => {
    signals.activeSignals = [{ symbol: 'RELIANCE' }]
    render(<SymbolSearch />)
    const { user, box } = await typeInto('reliance')
    await screen.findAllByRole('option')
    await user.keyboard('{Enter}')
    expect(push).toHaveBeenCalledWith('/dashboard/analysis/RELIANCE')
    expect(box).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.click(box)
    await user.type(box, 'm&')
    await user.click(await screen.findByRole('option'))
    expect(push).toHaveBeenLastCalledWith('/dashboard/markets/M%26M')
  })

  it('focuses on Cmd+K or Ctrl+K from anywhere (AC-6)', async () => {
    const user = userEvent.setup()
    render(<><button>elsewhere</button><SymbolSearch /></>)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('combobox')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('does not steal focus while a dialog is open (AC-6)', async () => {
    const user = userEvent.setup()
    render(<><div role="dialog"><button>in dialog</button></div><SymbolSearch /></>)
    await user.click(screen.getByRole('button', { name: 'in dialog' }))
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('combobox')).not.toHaveFocus()
  })

  it('moves the highlight with arrows, wrapping, and Enter opens the highlighted one (AC-6)', async () => {
    render(<SymbolSearch />)
    const { user } = await typeInto('bank')
    await screen.findAllByRole('option')

    await user.keyboard('{ArrowUp}') // wraps from the first to the last
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}') // wraps back to the first
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(push).toHaveBeenCalledWith('/dashboard/markets/AXISBANK')
  })

  it('Esc clears the text first, then leaves the box (AC-6)', async () => {
    render(<SymbolSearch />)
    const { user, box } = await typeInto('idea')
    await screen.findAllByRole('option')

    await user.keyboard('{Escape}')
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(box).not.toHaveFocus()
  })

  it('closes the list when you click outside (AC-6)', async () => {
    render(<><p>outside</p><SymbolSearch /></>)
    const { user } = await typeInto('idea')
    await screen.findAllByRole('option')
    await user.click(screen.getByText('outside'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('exposes combobox roles and announces the result count (AC-7)', async () => {
    render(<SymbolSearch />)
    const { box } = await typeInto('bank')
    const listbox = await screen.findByRole('listbox', { name: 'Matching stocks' })
    expect(box).toHaveAttribute('aria-expanded', 'true')
    expect(box).toHaveAttribute('aria-controls', listbox.id)
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id)
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('falls back to live stocks when the list fails to load, and says so (AC-8)', async () => {
    stubUniverse('fail')
    signals.momentum = [stock('IDEA', 13.46, -0.74)]
    render(<SymbolSearch />)
    await typeInto('ide')
    await waitFor(() => expect(screen.getByText('Showing live stocks only')).toBeInTheDocument())
    expect(screen.getByRole('option')).toHaveTextContent('IDEA')
  })
})
