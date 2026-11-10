"use client"
import * as React from "react"
import type { NewsGateItem, Signal } from "@/mock/signals"

/** True when every deciding item is a `MARKET` item, so an RBI day is not read as stock news. */
const marketWide = (items: NewsGateItem[] | undefined) => !!items?.length && items.every(i => i.symbol === "MARKET")

function Verdict({ label, tone, reason, items }: { label: string; tone: "danger" | "caution"; reason: string; items: NewsGateItem[] }) {
  const [open, setOpen] = React.useState(false)
  const scope = marketWide(items) ? "Market wide news" : null
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={
          tone === "danger"
            ? "self-start px-1.5 py-0.5 rounded bg-accent-danger text-on-error text-[10px] font-bold flex items-center gap-1"
            : "self-start px-1.5 py-0.5 rounded bg-status-stale-bg text-status-stale-text border border-accent-bearish/30 text-[10px] font-bold flex items-center gap-1"
        }
        title={reason}
      >
        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{tone === "danger" ? "block" : "warning"}</span>
        {label}
        {scope && <span className="font-semibold opacity-90">· {scope}</span>}
      </button>
      {open && (
        <div className="text-[11px] text-text-secondary leading-snug max-w-[260px]">
          {items.length ? (
            <ul className="flex flex-col gap-0.5">
              {items.map(i => (
                <li key={i.id}>
                  {i.sourceUrl ? (
                    <a href={i.sourceUrl} target="_blank" rel="noreferrer" className="text-accent-primary hover:underline">{i.headline}</a>
                  ) : (
                    i.headline
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span>{reason}</span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Spec 0025 AC-5: the entry news verdict ("Blocked by news" / "News warning") and, apart from
 * it, a "News after entry" badge. `pass` and `null` (signals from before the feature) show nothing.
 */
export function NewsGateBadges({ signal }: { signal: Signal }) {
  const entry = signal.newsGate
  const after = signal.newsAfterGate
  if (entry !== "block" && entry !== "warn" && !after) return null
  return (
    <div className="flex flex-col gap-1 mt-1" data-testid="news-gate-badges">
      {entry === "block" && <Verdict label="Blocked by news" tone="danger" reason={signal.newsGateReason ?? ""} items={signal.newsGateItems ?? []} />}
      {entry === "warn" && <Verdict label="News warning" tone="caution" reason={signal.newsGateReason ?? ""} items={signal.newsGateItems ?? []} />}
      {after && (
        <Verdict
          label={after === "block" ? "News after entry: against this trade" : "News after entry: warning"}
          tone={after === "block" ? "danger" : "caution"}
          reason={signal.newsAfterReason ?? ""}
          items={signal.newsAfterItems ?? []}
        />
      )}
    </div>
  )
}
