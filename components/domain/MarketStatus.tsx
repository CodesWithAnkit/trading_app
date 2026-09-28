import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface MarketStatusProps {
  state: "SIMULATED" | "LIVE" | "DELAYED" | "DISCONNECTED"
  updatedAt: string
}

export function MarketStatus({ state, updatedAt }: MarketStatusProps) {
  let badgeVariant: "default" | "primary" | "info" | "warning" | "risk" = "default"
  let label = "Unknown"
  
  switch (state) {
    case "SIMULATED":
      badgeVariant = "info"
      label = "Simulated"
      break
    case "LIVE":
      badgeVariant = "primary" // Actually info/green per docs, we'll use primary for now, or add connected
      label = "Live"
      break
    case "DELAYED":
      badgeVariant = "warning"
      label = "Delayed"
      break
    case "DISCONNECTED":
      badgeVariant = "risk"
      label = "Disconnected"
      break
  }

  return (
    <div className="flex items-center space-x-3 bg-surface border-b border-border px-6 py-2 text-sm">
      <Badge variant={badgeVariant} className="flex items-center space-x-1">
        {state === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-current"></span>}
        <span>{label}</span>
      </Badge>
      <span className="text-text-muted">
        Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
      </span>
    </div>
  )
}
