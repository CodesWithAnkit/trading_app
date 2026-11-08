import * as React from "react"
import { ProtectedShell } from "@/components/layout/ProtectedShell"
import { ExitToasts } from "@/components/domain/ExitToasts"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedShell fallbackPath="/dashboard">
      {children}
      <ExitToasts />
    </ProtectedShell>
  )
}
