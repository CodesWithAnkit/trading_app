import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import type { Signal } from '@/mock/signals'
import { SignalProvider, useSignals } from './SignalContext'

// A controllable stand in for the browser's EventSource (the live SSE stream).
class FakeEventSource {
  static CLOSED = 2
  static last: FakeEventSource
  readyState = 1
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  constructor(public url: string) { FakeEventSource.last = this }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  close() { this.readyState = FakeEventSource.CLOSED }
  emit(type: string, data: unknown) {
    act(() => this.listeners.get(type)?.forEach(fn => fn({ data: JSON.stringify(data) } as MessageEvent)))
  }
  open() { act(() => this.onopen?.()) }
}

const signal = (overrides: Partial<Signal> = {}): Signal => ({
  id: 'sig-1', symbol: 'RELIANCE', exchange: 'NSE', direction: 'LONG', setup: 'VWAP_TREND', status: 'ACTIVE',
  price: 100, entryZone: { low: 99.95, high: 100.05 }, referenceEntry: 100, stop: 99, targets: { t1: 102 },
  confidence: 80, confidenceBand: 'HIGH', createdAt: '2026-09-30T04:30:00.000Z', expiresAt: '2026-09-30T05:00:00.000Z',
  rationale: '', metrics: { relativeVolume: '1x', trendAlignment: '', volatility: '', liquidity: '', riskReward: '' }, ...overrides,
})

const exitEvent = { id: 'sig-1', symbol: 'RELIANCE', setup: 'VWAP_TREND', reason: 'TARGET', exitPrice: 102.1, exitAt: '2026-09-30T05:12:00.000Z', pnlPct: 2.1, stale: false }

function Probe() {
  const { activeSignals, closedSignals, exitAlerts, streamStatus } = useSignals()
  return (
    <div>
      <p data-testid="stream">{streamStatus}</p>
      <p data-testid="active">{activeSignals.map(s => s.id).join(',')}</p>
      <p data-testid="closed">{closedSignals.map(s => `${s.id}:${s.status}:${s.exitPrice}`).join(',')}</p>
      <p data-testid="alerts">{exitAlerts.map(a => a.id).join(',')}</p>
    </div>
  )
}

let snapshot: Signal[] = []

describe('SignalContext live exits (spec 0010 AC-6, AC-8; spec 0009 AC-4, AC-11)', () => {
  beforeEach(() => {
    snapshot = []
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: snapshot }) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('adds a new signal from the stream to the active list', async () => {
    render(<SignalProvider><Probe /></SignalProvider>)
    FakeEventSource.last.open()
    await waitFor(() => expect(screen.getByTestId('stream')).toHaveTextContent('live'))

    FakeEventSource.last.emit('signal:new', signal())

    expect(screen.getByTestId('active')).toHaveTextContent('sig-1')
  })

  it('moves a signal from active to closed on signal:exit and raises one alert', async () => {
    render(<SignalProvider><Probe /></SignalProvider>)
    FakeEventSource.last.emit('signal:new', signal())

    FakeEventSource.last.emit('signal:exit', exitEvent)

    expect(screen.getByTestId('active')).toBeEmptyDOMElement()
    expect(screen.getByTestId('closed')).toHaveTextContent('sig-1:TARGET_HIT:102.1')
    expect(screen.getByTestId('alerts')).toHaveTextContent('sig-1')
  })

  it('never alerts twice for the same exit', async () => {
    render(<SignalProvider><Probe /></SignalProvider>)
    FakeEventSource.last.emit('signal:new', signal())

    FakeEventSource.last.emit('signal:exit', exitEvent)
    FakeEventSource.last.emit('signal:exit', exitEvent)

    expect(screen.getByTestId('alerts').textContent).toBe('sig-1')
  })

  it('applies an exit missed while offline from the reconnect snapshot, without an alert', async () => {
    render(<SignalProvider><Probe /></SignalProvider>)
    FakeEventSource.last.emit('signal:new', signal())

    snapshot = [signal({ status: 'STOP_HIT', exitReason: 'STOP', exitPrice: 98.9 })]
    FakeEventSource.last.open() // reconnect: the snapshot reloads

    await waitFor(() => expect(screen.getByTestId('closed')).toHaveTextContent('sig-1:STOP_HIT:98.9'))
    expect(screen.getByTestId('alerts')).toBeEmptyDOMElement()
  })

  it('keeps a locally changed status when the snapshot still says ACTIVE', async () => {
    function Skip() {
      const { updateSignalStatus } = useSignals()
      return <button onClick={() => updateSignalStatus('sig-1', 'SKIPPED')}>skip</button>
    }
    render(<SignalProvider><Probe /><Skip /></SignalProvider>)
    FakeEventSource.last.emit('signal:new', signal())
    act(() => screen.getByRole('button', { name: 'skip' }).click())

    snapshot = [signal()]
    FakeEventSource.last.open()

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.getByTestId('active')).toBeEmptyDOMElement()
  })
})
