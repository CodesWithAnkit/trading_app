// spec 0021 AC-3: the only pages reachable without a session. One list, used by proxy.ts and the layouts.
export const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/confirm"] as const

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export const DEFAULT_AFTER_LOGIN = "/dashboard"

/**
 * spec 0021 AC-1: only same origin `next` values are honoured (blocks `//evil.com`, `/\evil.com`,
 * encoded variants, and absolute URLs). Returns path + query + hash, or the default.
 */
export function safeNext(next: string | null | undefined, origin: string): string {
  if (!next) return DEFAULT_AFTER_LOGIN
  try {
    const url = new URL(next, origin)
    if (url.origin !== origin) return DEFAULT_AFTER_LOGIN
    if (isPublicPath(url.pathname)) return DEFAULT_AFTER_LOGIN
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_AFTER_LOGIN
  }
}

/** `/login?next=<path and query>` for the page the visitor tried to open. */
export function loginUrlFor(pathname: string, search = ""): string {
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`
}
