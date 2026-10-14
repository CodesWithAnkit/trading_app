"use client"
import * as React from "react"
import { useDashboardState } from "@/lib/contexts/DashboardContext"

export function MarketStatusBadge() {
  const { marketStatus, marketState, updatedAt } = useDashboardState()

  // Fallbacks if context is not loaded yet
  const status = marketStatus?.status || marketState || 'SIMULATED'
  const sessionState = marketStatus?.sessionState || 'CLOSED'
  const timeString = new Date(updatedAt).toLocaleTimeString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' })

  // Derived display state
  let displayState: string = status as string
  if (sessionState === 'CLOSED' && status !== 'SIMULATED') {
    displayState = 'MARKET_CLOSED'
  }

  // Calculate freshness
  const [freshness, setFreshness] = React.useState<string>('0s')
  
  React.useEffect(() => {
    if (!marketStatus?.lastTickAt) return
    const updateFreshness = () => {
      const diffMs = Date.now() - new Date(marketStatus.lastTickAt!).getTime()
      if (diffMs < 1000) {
        setFreshness((diffMs / 1000).toFixed(1) + 's')
      } else if (diffMs < 60000) {
        setFreshness(Math.floor(diffMs / 1000) + 's')
      } else {
        setFreshness(Math.floor(diffMs / 60000) + 'm ' + Math.floor((diffMs % 60000) / 1000) + 's')
      }
    }
    updateFreshness()
    const int = setInterval(updateFreshness, 1000)
    return () => clearInterval(int)
  }, [marketStatus?.lastTickAt])

  // Style configurations
  const styles: Record<string, { bg: string, text: string, dot: string, border: string, label: string, extra?: string }> = {
    LIVE: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      dot: 'bg-primary animate-pulse',
      border: 'border-primary/30',
      label: 'LIVE',
      extra: freshness
    },
    DELAYED: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      dot: 'bg-warning',
      border: 'border-warning/30',
      label: 'DELAYED',
      extra: freshness
    },
    STALE: {
      bg: 'bg-surface-muted',
      text: 'text-text-muted',
      dot: 'bg-text-muted',
      border: 'border-border',
      label: 'STALE',
      extra: freshness
    },
    DISCONNECTED: {
      bg: 'bg-risk/10',
      text: 'text-risk',
      dot: 'bg-risk',
      border: 'border-risk/30',
      label: 'DISCONNECTED',
      extra: 'Offline'
    },
    SIMULATED: {
      bg: 'bg-secondary/10',
      text: 'text-secondary',
      dot: 'bg-secondary',
      border: 'border-secondary/30',
      label: 'SIMULATED',
      extra: 'Mock Data'
    },
    MARKET_CLOSED: {
      bg: 'bg-surface-muted',
      text: 'text-text-muted',
      dot: 'bg-text-muted',
      border: 'border-border',
      label: 'MARKET CLOSED',
      extra: 'Next session 09:15 AM'
    }
  }

  const config = styles[displayState] || styles.SIMULATED

  return (
    <div 
      className={`flex items-center gap-2 px-space-sm py-1 rounded border ${config.bg} ${config.border} hidden sm:flex`}
      aria-label={`Market status is ${config.label}`}
    >
      <span className="flex h-2 w-2 relative">
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}></span>
      </span>
      <span className={`font-label-caps text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
        {config.label}
      </span>
      <span suppressHydrationWarning className={`font-mono text-[10px] font-medium border-l pl-2 ${config.border} ${config.text}`}>
        IST {timeString}
      </span>
      <span className={`font-mono text-[10px] font-medium ${config.text} opacity-80`}>
        · {config.extra}
      </span>
    </div>
  )
}
