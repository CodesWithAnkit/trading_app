"use client"
import * as React from "react"
import { Clock, AlertCircle } from "lucide-react"

interface ExpiryTimerProps {
  status: "ACTIVE" | "EXPIRING" | "EXPIRED" | "INVALIDATED" | "SKIPPED" | "ENTERED"
  expiresAt: string
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
