"use client"
import * as React from "react"

/**
 * The current time, refreshed every `intervalMs`, rounded down to that interval so every
 * component sharing an interval sees the same value. Null during the server render, so the
 * server and first client render agree.
 */
export function useNow(intervalMs = 30_000): number | null {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, 1000)
      return () => clearInterval(id)
    },
    [intervalMs]
  )
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null
  )
}
