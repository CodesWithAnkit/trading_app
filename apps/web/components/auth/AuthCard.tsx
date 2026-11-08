import * as React from "react"

/** Shared frame for /login, /forgot-password and /reset-password (Stitch tokens from globals.css). */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="material-symbols-outlined text-primary text-[28px]" aria-hidden="true">candlestick_chart</span>
          <span className="font-headline-sm text-headline-sm font-bold text-text-primary">Intraday Stock Tracker</span>
        </div>
        <section className="rounded-xl border border-border-subtle bg-surface shadow-sm p-6">
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </section>
        <p className="mt-4 text-center text-xs text-text-secondary">Invite only. Ask the owner for access.</p>
      </div>
    </main>
  )
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  const { label, id, ...rest } = props
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="h-11 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed"
      />
    </div>
  )
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full h-11 rounded-md bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function FormMessage({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`text-sm rounded-md px-3 py-2 ${tone === "error" ? "bg-error-container text-on-error-container" : "bg-surface-container-low text-text-primary"}`}
    >
      {children}
    </p>
  )
}
