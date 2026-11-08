import * as React from "react"
import { headers } from "next/headers"
import { Providers } from "@/app/providers"
import { AppShell } from "@/components/layout/AppShell"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { requireUser } from "@/lib/supabase/server"

/**
 * spec 0021 AC-3: the server side gate for every signed in area. Data providers mount only here,
 * so public pages (/login) never call the API.
 */
export async function ProtectedShell({ children, fallbackPath }: { children: React.ReactNode; fallbackPath: string }) {
  const h = await headers()
  const user = await requireUser(h.get("x-next-path") ?? fallbackPath)
  return (
    <AuthProvider user={user}>
      <Providers>
        <AppShell>{children}</AppShell>
      </Providers>
    </AuthProvider>
  )
}
