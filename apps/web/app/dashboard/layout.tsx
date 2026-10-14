import * as React from "react"
import { AppShell } from "@/components/layout/AppShell"
import { ExitToasts } from "@/components/domain/ExitToasts"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      {children}
      <ExitToasts />
    </AppShell>
  )
}
