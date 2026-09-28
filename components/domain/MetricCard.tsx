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
  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow h-full min-h-[140px]">
      {highlightColor === "secondary" && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-secondary-fixed/20 pointer-events-none blur-xl"></div>
      )}
      <div className="flex items-start justify-between z-10">
        <div className="flex flex-col pr-4">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">
            {title}
          </span>
          {subtitle && (
            <span className={cn(
              "font-body-sm text-body-sm mt-0.5",
              highlightColor === "secondary" && !subtitle.includes("Calculated") ? "text-secondary font-medium" : "text-on-surface-variant/80"
            )}>
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <div className="shrink-0">{badge}</div>
        )}
      </div>
      <div className="mt-space-md flex items-baseline justify-between z-10">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-label-numeric-lg text-[1.75rem] font-bold tracking-tight",
            highlightColor === "secondary" && "text-secondary",
            highlightColor === "on-surface" && "text-on-surface",
            highlightColor === "primary" && "text-primary"
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
