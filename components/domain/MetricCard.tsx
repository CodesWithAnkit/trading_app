import * as React from "react"
import { cn } from "@/lib/utils"

export interface MetricCardProps {
  title: string
  subtitle?: string
  value: React.ReactNode
  badge?: React.ReactNode
  children?: React.ReactNode
  highlightColor?: "secondary" | "primary" | "tertiary" | "on-surface"
}

export function MetricCard({ title, subtitle, value, badge, children, highlightColor = "secondary" }: MetricCardProps) {
  // Mapping legacy highlightColor concepts to our exact tokens for safety.
  // Actually, let's just stick to our standard tokens.
  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between overflow-hidden group transition-shadow">
      <div className="flex items-start justify-between z-10">
        <div className="flex flex-col pr-4">
          <span className="text-xs uppercase text-text-muted font-bold tracking-wider">
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-text-muted mt-1">
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <div className="shrink-0">{badge}</div>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between z-10">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-mono text-2xl font-bold tracking-tight",
            highlightColor === "secondary" && "text-long",
            highlightColor === "primary" && "text-primary",
            highlightColor === "on-surface" && "text-text"
          )}>
            {value}
          </span>
        </div>
        {children && (
          <div className="flex shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
