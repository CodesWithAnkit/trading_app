import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// spec 0021: component and hook tests exercise their own data handling, not auth. apiFetch passes
// straight through to the (mocked) global fetch, and the ticket stream opens a plain EventSource.
// lib/api/apiFetch.test.ts unmocks this to test the real auth behavior.
vi.mock('@/lib/api/apiFetch', () => ({
  apiFetch: (path: string, init?: RequestInit) => (init ? fetch(path, init) : fetch(path)),
  openAuthedStream: (path: string, onOpen: (s: EventSource) => void) => {
    const source = new EventSource(path)
    onOpen(source)
    return () => source.close()
  },
  getAccessToken: async () => null,
  refreshAccessToken: async () => null,
  redirectToLogin: () => undefined,
}))
