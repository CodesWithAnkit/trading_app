"use client"
import * as React from "react"
import { useSessionUser, useSignOut } from "@/lib/contexts/AuthContext"

/** spec 0021 AC-11: the avatar opens a small menu with the signed in email and Sign out. */
export function AccountMenu() {
  const user = useSessionUser()
  const signOut = useSignOut()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:ring-2 hover:ring-primary-fixed-dim focus-visible:ring-2 focus-visible:ring-primary-fixed-dim outline-none"
      >
        <span className="material-symbols-outlined text-on-primary text-[18px]" aria-hidden="true">person</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-50 w-60 rounded-lg border border-border-subtle bg-surface shadow-lg p-2">
          <div className="px-2 py-2 border-b border-border-subtle mb-1">
            <div className="text-[11px] font-semibold tracking-wide text-text-secondary">SIGNED IN AS</div>
            <div className="text-sm text-text-primary truncate">{user?.email ?? "Unknown user"}</div>
            {user?.isAdmin && <div className="mt-1 inline-block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-on-surface text-surface">ADMIN</div>}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await signOut()
            }}
            className="w-full min-h-11 flex items-center gap-2 px-2 rounded-md text-sm text-text-primary hover:bg-surface-high disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  )
}
