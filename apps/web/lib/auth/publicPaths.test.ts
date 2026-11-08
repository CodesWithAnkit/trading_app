import { describe, expect, it } from 'vitest'
import { isPublicPath, loginUrlFor, safeNext } from './publicPaths'

const O = 'https://app.example.com'

describe('safeNext (spec 0021 AC-1)', () => {
  it('keeps same site paths with their query', () => {
    expect(safeNext('/dashboard/trades?tab=open', O)).toBe('/dashboard/trades?tab=open')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com/x', '%2F%2Fevil.com', 'javascript:alert(1)', '/%5Cevil.com'])('rejects %s', (bad) => {
    const out = safeNext(bad, O)
    expect(out.startsWith('/')).toBe(true)
    expect(new URL(out, O).origin).toBe(O)
  })

  it('falls back to /dashboard for empty or public targets', () => {
    expect(safeNext(null, O)).toBe('/dashboard')
    expect(safeNext('/login', O)).toBe('/dashboard')
  })
})

describe('public paths (AC-3)', () => {
  it('only the auth pages are public', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/auth/confirm')).toBe(true)
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/loginx')).toBe(false)
  })

  it('builds the login redirect with path and query', () => {
    expect(loginUrlFor('/dashboard/trades', '?tab=open')).toBe('/login?next=%2Fdashboard%2Ftrades%3Ftab%3Dopen')
  })
})
