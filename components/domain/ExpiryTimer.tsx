"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"

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

  if (status === "EXPIRED") {
    return <Badge variant="default">Expired</Badge>
  }
  
  if (status === "INVALIDATED") {
    return <Badge variant="default">Invalidated</Badge>
  }
  
  if (status === "SKIPPED") {
    return <Badge variant="default">Skipped</Badge>
  }
  
  if (status === "ENTERED") {
    return <Badge variant="primary">Entered</Badge>
  }

  if (timeLeft <= 0) {
    return <Badge variant="default">Expired</Badge>
  }

  if (timeLeft <= 5) {
    return <Badge variant="warning">Expires in {timeLeft}m</Badge>
  }

  return <Badge variant="primary">Active · {timeLeft}m</Badge>
}
