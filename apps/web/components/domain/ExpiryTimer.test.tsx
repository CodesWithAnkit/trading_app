import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpiryTimer } from './ExpiryTimer'

describe('ExpiryTimer (spec 0010)', () => {
  it.each([
    ['TARGET_HIT', 'Target hit'],
    ['STOP_HIT', 'Stop hit'],
    ['TIME_EXIT', 'Time exit'],
  ] as const)('shows how a closed plan (%s) ended instead of a countdown', (status, label) => {
    render(<ExpiryTimer status={status} expiresAt={new Date(Date.now() + 20 * 60_000).toISOString()} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.queryByText(/left|Expires/i)).not.toBeInTheDocument()
  })

  it('still shows Expired for an old style expired signal', () => {
    render(<ExpiryTimer status="EXPIRED" expiresAt={new Date().toISOString()} />)
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
})
