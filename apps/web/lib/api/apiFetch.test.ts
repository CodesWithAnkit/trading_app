import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/api/apiFetch')

const auth = {
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}
vi.mock('@/lib/supabase', () => ({ createClient: () => ({ auth }) }))

const res = (status: number) => new Response('{}', { status })

describe('apiFetch (spec 0021 AC-5, AC-10)', () => {
  let assign: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'old' } } })
    auth.refreshSession.mockReset()
    assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { pathname: '/dashboard/trades', search: '?tab=open', assign }, writable: true })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the access token as a bearer header', async () => {
    const f = vi.fn().mockResolvedValue(res(200))
    vi.stubGlobal('fetch', f)
    const { apiFetch } = await import('./apiFetch')
    await apiFetch('/api/v1/journal')
    expect((f.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer old')
  })

  it('on 401 refreshes once and retries with the new token', async () => {
    const f = vi.fn().mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200))
    vi.stubGlobal('fetch', f)
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'new' } } })
    const { apiFetch } = await import('./apiFetch')
    const out = await apiFetch('/api/v1/journal')
    expect(out.status).toBe(200)
    expect((f.mock.calls[1][1].headers as Headers).get('Authorization')).toBe('Bearer new')
    expect(assign).not.toHaveBeenCalled()
  })

  it('parallel 401s share one refresh', async () => {
    let first = true
    const f = vi.fn().mockImplementation(async () => {
      return res(200)
    })
    f.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(401))
    vi.stubGlobal('fetch', f)
    auth.refreshSession.mockImplementation(async () => {
      first = false
      return { data: { session: { access_token: 'new' } } }
    })
    const { apiFetch } = await import('./apiFetch')
    await Promise.all([apiFetch('/a'), apiFetch('/b')])
    expect(first).toBe(false)
    expect(auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('redirects to /login with the current page as next when refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401)))
    auth.refreshSession.mockResolvedValue({ data: { session: null } })
    const { apiFetch } = await import('./apiFetch')
    await apiFetch('/api/v1/journal')
    expect(assign).toHaveBeenCalledWith('/login?next=%2Fdashboard%2Ftrades%3Ftab%3Dopen')
  })
})
