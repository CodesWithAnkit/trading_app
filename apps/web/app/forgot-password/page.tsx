"use client"
import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth/AuthCard"

const SENT = "If that email has an account, a reset link is on its way."

// spec 0021 AC-9: same message whether or not the account exists.
export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    await createClient()
      .auth.resetPasswordForEmail(email.trim(), { redirectTo: `${site}/auth/confirm` })
      .catch(() => undefined)
    setDone(true)
    setBusy(false)
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to set a new one.">
      {done ? (
        <div className="flex flex-col gap-4">
          <FormMessage tone="info">{SENT}</FormMessage>
          <Link href="/login" className="text-sm text-primary hover:underline self-center">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SubmitButton busy={busy}>{busy ? "Sending…" : "Send reset link"}</SubmitButton>
          <Link href="/login" className="text-sm text-primary hover:underline self-center">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  )
}
