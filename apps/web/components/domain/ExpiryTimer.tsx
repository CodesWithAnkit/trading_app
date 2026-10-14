"use client"
import * as React from "react"
import { Clock, AlertCircle } from "lucide-react"

import type { SignalStatus } from "@/mock/signals"

interface ExpiryTimerProps {
  status: SignalStatus
  expiresAt: string
}

const CLOSED_LABEL: Partial<Record<SignalStatus, string>> = {
  TARGET_HIT: "Target hit",
  STOP_HIT: "Stop hit",
  TIME_EXIT: "Time exit",
}

export function ExpiryTimer({ status, expiresAt }: ExpiryTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0)

  React.useEffect(() => {
    if (status !== "ACTIVE" && status !== "EXPIRING") return

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      return Math.max(0, Math.floor((expiry - now) / 60000)) // minutes
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 60000)

    return () => clearInterval(interval)
  }, [expiresAt, status])

  const baseClasses = "px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border"

  // A plan closed by live exit tracking shows how it ended, not an entry countdown (spec 0010).
  const closed = CLOSED_LABEL[status]
  if (closed) {
    return (
      <div className={`${baseClasses} bg-surface-muted border-border text-text-muted`}>
        {closed}
      </div>
    )
  }

  if (status === "EXPIRED" || timeLeft <= 0 && (status === "ACTIVE" || status === "EXPIRING")) {
    return (
      <div className={`${baseClasses} bg-surface-muted border-border text-text-muted`}>
        <Clock className="w-3.5 h-3.5" />
        Expired
      </div>
    )
  }
  
  if (status === "INVALIDATED") {
    return (
      <div className={`${baseClasses} bg-risk-soft border-risk/20 text-risk`}>
        <AlertCircle className="w-3.5 h-3.5" />
        Invalidated
      </div>
    )
  }
  
  if (status === "SKIPPED") {
    return (
      <div className={`${baseClasses} bg-surface-muted border-border text-text-muted`}>
        Skipped
      </div>
    )
  }
  
  if (status === "ENTERED") {
    return (
      <div className={`${baseClasses} bg-primary border-primary text-surface`}>
        Entered
      </div>
    )
  }

  if (timeLeft <= 5) {
    return (
      <div className={`${baseClasses} bg-warning-soft border-warning/20 text-warning`}>
        <Clock className="w-3.5 h-3.5" />
        Expires in {timeLeft}m
      </div>
    )
  }

  return (
    <div className={`${baseClasses} bg-info-soft border-info/20 text-info`}>
      <Clock className="w-3.5 h-3.5" />
      Active · {timeLeft}m
    </div>
  )
}
