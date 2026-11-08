import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"

/** Supabase client for server components and route handlers (spec 0021). */
export async function createServerSupabase() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Called from a server component: cookies are read only there; proxy.ts refreshes them.
        }
      },
    },
  })
}

export type SessionUser = { id: string; email: string | null; isAdmin: boolean }

/** The single source of `isAdmin` on the web: the server verified user's app_metadata.role. */
export function toSessionUser(user: User): SessionUser {
  return { id: user.id, email: user.email ?? null, isAdmin: user.app_metadata?.role === "admin" }
}

/** spec 0021 AC-3: the real check behind proxy.ts. Uses getUser(), which verifies with Supabase. */
export async function requireUser(nextPath = "/dashboard"): Promise<SessionUser> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return toSessionUser(data.user)
}

/** spec 0021 AC-8: admin pages redirect non admins to /dashboard, server side. */
export async function requireAdmin(nextPath: string): Promise<SessionUser> {
  const user = await requireUser(nextPath)
  if (!user.isAdmin) redirect("/dashboard")
  return user
}
