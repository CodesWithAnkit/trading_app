"use client"
import { createClient } from "@/lib/supabase"
import { loginUrlFor } from "@/lib/auth/publicPaths"

// spec 0021 AC-5, AC-10: every web call to the NestJS API goes through here.
// Sends the Supabase access token as a bearer header; on 401 refreshes once (one shared refresh
// for parallel calls) and retries; if that still fails, sends the user to /login?next=<page>.

type Supa = ReturnType<typeof createClient>
let client: Supa | null = null
let refreshing: Promise<string | null> | null = null

function supabase(): Supa | null {
  if (client) return client
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  client = createClient()
  return client
}

export async function getAccessToken(): Promise<string | null> {
  const s = supabase()
  if (!s) return null
  const { data } = await s.auth.getSession()
  return data.session?.access_token ?? null
}

/** One refresh at a time: concurrent 401s all wait on the same promise. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    const s = supabase()
    refreshing = (s ? s.auth.refreshSession().then(({ data }) => data.session?.access_token ?? null) : Promise.resolve(null)).finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

export function redirectToLogin() {
  if (typeof window === "undefined") return
  window.location.assign(loginUrlFor(window.location.pathname, window.location.search))
}

function withAuth(init: RequestInit | undefined, token: string | null): RequestInit {
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return { ...init, headers }
}

/** `path` must be a same origin API path like `/api/v1/...` (routed by the /api rewrite). */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, withAuth(init, await getAccessToken()))
  if (res.status !== 401) return res
  const fresh = await refreshAccessToken()
  if (fresh) {
    const retry = await fetch(path, withAuth(init, fresh))
    if (retry.status !== 401) return retry
  }
  redirectToLogin()
  return res
}

/**
 * spec 0021 AC-6: an EventSource that authenticates with a single use ticket and reconnects with a
 * fresh one on error (the server closes the stream when the token expires). Returns a closer.
 */
export function openAuthedStream(
  path: string,
  onOpen: (source: EventSource) => void,
  onError?: () => void,
): () => void {
  let source: EventSource | null = null
  let closed = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let delay = 1000

  const connect = async () => {
    if (closed) return
    let ticket: string | null = null
    try {
      const res = await apiFetch("/api/v1/auth/sse-ticket", { method: "POST" })
      if (res.ok) ticket = (await res.json()).ticket
    } catch {
      // network error: retry below
    }
    if (closed) return
    if (!ticket) return scheduleRetry()
    const sep = path.includes("?") ? "&" : "?"
    source = new EventSource(`${path}${sep}ticket=${encodeURIComponent(ticket)}`)
    source.onopen = () => {
      delay = 1000
    }
    source.onerror = () => {
      onError?.()
      source?.close()
      source = null
      scheduleRetry()
    }
    onOpen(source)
  }

  const scheduleRetry = () => {
    if (closed) return
    retryTimer = setTimeout(connect, delay)
    delay = Math.min(delay * 2, 30_000)
  }

  void connect()
  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    source?.close()
  }
}
