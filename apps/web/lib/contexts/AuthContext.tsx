"use client"
import React, { createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export type SessionUser = { id: string; email: string | null; isAdmin: boolean }

const AuthContext = createContext<SessionUser | null>(null)

/** Fed by the server layout's requireUser(), so isAdmin always comes from the server (spec 0021). */
export function AuthProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useSessionUser(): SessionUser | null {
  return useContext(AuthContext)
}

/** spec 0021 AC-11: end the Supabase session and land on /login. */
export function useSignOut() {
  const router = useRouter()
  return async () => {
    await createClient().auth.signOut()
    router.replace("/login")
    router.refresh()
  }
}
