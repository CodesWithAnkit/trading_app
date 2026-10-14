"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSignals } from "@/lib/contexts/SignalContext"
import { matchSymbols, searchTarget } from "@/lib/symbolSearch"

type LoadState = "idle" | "loading" | "ready" | "failed"

const LISTBOX_ID = "symbol-search-results"
const optionId = (i: number) => `symbol-search-option-${i}`

/** Top bar quick jump to a watched F&O stock (spec 0012). */
export function SymbolSearch() {
  const router = useRouter()
  const { momentum, activeSignals, approachingSignals } = useSignals()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [text, setText] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const [universe, setUniverse] = React.useState<string[]>([])
  const [nseList, setNseList] = React.useState<string[]>([])
  const [loadState, setLoadState] = React.useState<LoadState>("idle")
  // Platform label: ⌘K on the server render, the real platform's label on the client.
  const shortcut = React.useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "⌘K"
  )

  // ⌘K / Ctrl+K focuses the box from anywhere, except while a dialog is open (spec 0012 AC-6).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (document.querySelector('[role="dialog"]')) return
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Clicking outside closes the list.
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // Today's watched list, fetched once on first focus; retried on the next focus after a failure.
  const loadUniverse = () => {
    if (loadState === "loading" || loadState === "ready") return
    setLoadState("loading")
    fetch("/api/v1/scanner/universe")
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((payload: { data?: { symbol: string }[]; nse?: string[] }) => {
        setUniverse((payload.data ?? []).map(r => r.symbol))
        setNseList(payload.nse ?? [])
        setLoadState("ready")
      })
      .catch(() => setLoadState("failed"))
  }

  const live = React.useMemo(() => new Map(momentum.map(m => [m.symbol, m])), [momentum])
  const topGainers = React.useMemo(() => new Set(momentum.filter(m => m.ranked).slice(0, 20).map(m => m.symbol)), [momentum])
  const openPlans = React.useMemo(() => new Set(activeSignals.map(s => s.symbol)), [activeSignals])
  const approaching = React.useMemo(() => new Set(approachingSignals.map(a => a.symbol)), [approachingSignals])

  // If the list can't load, search the stocks the live stream has sent (spec 0012 AC-8).
  const liveOnly = loadState === "failed" || (loadState === "ready" && universe.length === 0)
  const source = liveOnly ? { fno: momentum.map(m => m.symbol), nse: [] } : { fno: universe, nse: nseList }
  const matches = matchSymbols(source, text)
  const flatResults = [...matches.fno, ...matches.nse]
  const showList = open && text.trim().length > 0
  const waiting = loadState === "loading" && flatResults.length === 0

  const go = (symbol: string) => {
    router.push(searchTarget(symbol, openPlans))
    setText("")
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (flatResults.length === 0) return
      setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive(i => (i + step + flatResults.length) % flatResults.length)
    } else if (e.key === "Enter") {
      if (showList && flatResults[active]) {
        e.preventDefault()
        go(flatResults[active])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (text) {
        setText("")
        setOpen(false)
      } else {
        inputRef.current?.blur()
      }
    }
  }

  const renderOption = (symbol: string, i: number, isNse: boolean) => {
    const row = live.get(symbol)
    const priced = row && row.ranked
    const up = (row?.dayChangePct ?? 0) >= 0
    return (
      <li
        key={symbol}
        id={optionId(i)}
        role="option"
        aria-selected={i === active}
        onMouseEnter={() => setActive(i)}
        onMouseDown={e => {
          e.preventDefault()
          go(symbol)
        }}
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 cursor-pointer",
          i === active ? "bg-surface-container" : "bg-transparent"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-on-surface truncate">{symbol}</span>
          {!isNse && topGainers.has(symbol) && <Tag className="bg-secondary-container text-on-secondary-container">Top 20</Tag>}
          {!isNse && openPlans.has(symbol) && <Tag className="bg-primary text-on-primary">Open plan</Tag>}
          {!isNse && approaching.has(symbol) && <Tag className="bg-surface-container-highest text-on-surface-variant">Approaching</Tag>}
        </div>
        <div className="text-right font-label-numeric-sm text-label-numeric-sm shrink-0">
          {priced ? (
            <>
              <span className="block font-semibold text-on-surface">₹{row.ltp.toFixed(2)}</span>
              <span className={cn("font-semibold", up ? "text-secondary" : "text-error")}>
                {up ? "+" : ""}{row.dayChangePct.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="block font-semibold text-on-surface-variant text-[11px] uppercase tracking-wide">
              {isNse ? "Not Watched" : "–"}
            </span>
          )}
        </div>
      </li>
    )
  }

  return (
    <div ref={containerRef} className="relative w-72 lg:w-96">
      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Search NSE stocks"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={showList && flatResults[active] ? optionId(active) : undefined}
        className="w-full h-8 pl-8 pr-14 rounded bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        placeholder="Search NSE cash (e.g. RELIANCE, HDFCBANK)..."
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onFocus={() => {
          loadUniverse()
          setOpen(true)
        }}
        onChange={e => {
          setText(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-label-numeric-sm text-on-surface-variant bg-surface-container border border-outline-variant/40 rounded" aria-hidden="true">
        {shortcut}
      </kbd>

      <p className="sr-only" aria-live="polite">
        {showList ? (flatResults.length ? `${flatResults.length} result${flatResults.length === 1 ? "" : "s"}` : waiting ? "Loading stocks" : "No results") : ""}
      </p>

      {showList && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[20rem] rounded-lg border border-outline-variant/50 bg-surface-container-lowest shadow-lg z-50 overflow-hidden">
          {flatResults.length > 0 ? (
            <ul id={LISTBOX_ID} role="listbox" aria-label="Matching stocks" className="py-1">
              {matches.fno.map((symbol, i) => renderOption(symbol, i, false))}
              {matches.nse.length > 0 && (
                <li key="section-nse" className="px-3 py-1.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface border-y border-outline-variant/40 mt-1 first:mt-0">
                  Others (Cash)
                </li>
              )}
              {matches.nse.map((symbol, i) => renderOption(symbol, matches.fno.length + i, true))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-on-surface-variant">
              {waiting ? "Loading stocks…" : `No NSE stock matches "${text.trim()}"`}
            </p>
          )}
          {liveOnly && (
            <p className="px-3 py-1.5 text-[11px] text-on-surface-variant border-t border-outline-variant/40">Showing live F&O stocks only</p>
          )}
        </div>
      )}
    </div>
  )
}

const noopSubscribe = () => () => {}

function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0", className)}>{children}</span>
}
