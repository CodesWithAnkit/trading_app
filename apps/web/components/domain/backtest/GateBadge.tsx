import * as React from "react"
import type { RunRow } from "@/lib/hooks/useBacktest"
import { gateOf } from "./format"

const STYLE = {
  PASS: "bg-secondary-container text-on-secondary-fixed",
  FAIL: "bg-error-container text-on-error-container",
  BASELINE: "bg-surface-high text-on-surface-variant",
  FAILED: "bg-error text-on-error",
  QUEUED: "bg-surface-high text-on-surface-variant",
  RUNNING: "bg-surface-container text-on-primary-fixed-variant",
  "NO DATA": "bg-tertiary-fixed text-on-tertiary-fixed-variant",
} as const

export function Badge({ kind, children }: { kind: keyof typeof STYLE; children?: React.ReactNode }) {
  return <span className={`inline-block text-[10px] font-bold tracking-wider px-2 py-1 rounded ${STYLE[kind]}`}>{children ?? kind}</span>
}

/** PASS / FAIL (the rule vs the gate) or BASELINE. FAILED means the run itself broke. */
export function GateBadge({ run }: { run: RunRow }) {
  const g = gateOf(run)
  return <Badge kind={g} />
}
