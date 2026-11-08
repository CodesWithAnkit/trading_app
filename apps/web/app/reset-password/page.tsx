"use client"
import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard"

const MIN_PASSWORD = 10

// spec 0021 AC-9: reached via /auth/confirm (reset and invite links), which already set the session.
export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hasSession, setHasSession] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)))
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (password !== confirm) return setError("The two passwords don't match.")
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setError(error.message || "Could not set the password. Request a new link.")
      setBusy(false)
      return
    }
    window.location.assign("/dashboard")
  }

  if (hasSession === false) {
    return (
      <AuthCard title="Link expired" subtitle="This reset link is no longer valid.">
        <div className="flex flex-col gap-4">
          <FormMessage tone="error">Request a new reset link and open it from the same browser.</FormMessage>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline self-center">
            Request a new link
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set a new password" subtitle={`At least ${MIN_PASSWORD} characters.`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Field id="password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <SubmitButton busy={busy || hasSession === null}>{busy ? "Saving…" : "Save password"}</SubmitButton>
      </form>
    </AuthCard>
  )
}
