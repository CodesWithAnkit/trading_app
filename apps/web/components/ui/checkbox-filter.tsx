"use client"
import * as React from "react"

import { cn } from "@/lib/utils"

export type CheckboxFilterOption = {
  /** The raw value sent to the API (an id, a key). */
  value: string
  /** What the person reads. Never show a raw id here. */
  label: string
}

export type CheckboxFilterProps = {
  /** Visible name of the filter, e.g. "Strategy". */
  label: string
  /** Summary when nothing (or everything) is picked, e.g. "All strategies". */
  allLabel: string
  options: CheckboxFilterOption[]
  /** Picked values. Empty means "all". */
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
  /** Text shown when there are no options yet. */
  emptyText?: string
}

/**
 * A filter shown as a button that opens a list of checkboxes, for picking several values.
 * Nothing picked, or everything picked, means "all". The button names the pick in plain
 * words ("Breakout momentum +1"). Closes on Escape and on a click outside.
 */
export function CheckboxFilter({
  label,
  allLabel,
  options,
  selected,
  onChange,
  className,
  emptyText = "Nothing to choose yet.",
}: CheckboxFilterProps) {
  const ref = React.useRef<HTMLDetailsElement>(null)
  const id = React.useId()

  React.useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      const d = ref.current
      if (!d?.open) return
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [])

  const picked = options.filter((o) => selected.includes(o.value))
  const isAll = picked.length === 0 || picked.length === options.length
  const summary = isAll ? allLabel : picked.length === 1 ? picked[0].label : `${picked[0].label} +${picked.length - 1}`
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div className={cn("flex items-center gap-2 text-body-sm text-text-secondary", className)}>
      <span id={`${id}-label`}>{label}</span>
      <details ref={ref} className="relative">
        <summary
          aria-labelledby={`${id}-label ${id}-value`}
          className="list-none cursor-pointer h-10 min-w-[150px] flex items-center justify-between gap-3 rounded-lg border border-border-strong bg-surface px-3 text-text-primary [&::-webkit-details-marker]:hidden"
        >
          <span id={`${id}-value`} className="truncate max-w-[200px]">
            {summary}
          </span>
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-text-secondary">
            expand_more
          </span>
        </summary>
        <fieldset className="absolute left-0 z-20 mt-1 min-w-[220px] max-h-72 overflow-auto rounded-lg border border-border-subtle bg-surface p-2 shadow-lg flex flex-col gap-0.5">
          <legend className="sr-only">{label}</legend>
          {options.length === 0 && <p className="px-2 py-2 text-body-xs text-text-secondary">{emptyText}</p>}
          {options.map((o) => (
            <label
              key={o.value}
              title={o.value}
              className="flex items-center gap-2.5 min-h-10 px-2 rounded-md hover:bg-surface-container text-text-primary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-4 w-4 accent-[var(--color-accent-primary)]"
              />
              <span>{o.label}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 min-h-10 px-2 rounded-md text-left text-accent-primary hover:bg-surface-container"
            >
              Clear, show {allLabel.toLowerCase()}
            </button>
          )}
        </fieldset>
      </details>
    </div>
  )
}
