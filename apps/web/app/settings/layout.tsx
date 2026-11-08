import * as React from "react"
import { ProtectedShell } from "@/components/layout/ProtectedShell"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedShell fallbackPath="/settings">{children}</ProtectedShell>
}
