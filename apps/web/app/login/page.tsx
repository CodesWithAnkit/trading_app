"use client"
import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { safeNext } from "@/lib/auth/publicPaths"
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard"

// spec 0021 AC-1: email + password sign in. Wrong credentials never say which part was wrong.
function LoginForm() {
  const params = useSearchParams()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Email or password is incorrect.")
      setBusy(false)
      return
    }
    // Full navigation so the server layouts see the new session cookies.
    window.location.assign(safeNext(params.get("next"), window.location.origin))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Field id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <SubmitButton busy={busy}>{busy ? "Signing in…" : "Sign in"}</SubmitButton>
      <Link href="/forgot-password" className="text-sm text-primary hover:underline self-center">
        Forgot password?
      </Link>
    </form>
  )
}

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" subtitle="Use the email you were invited with.">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </AuthCard>
  )
}
