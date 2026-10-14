"use client"
import * as React from "react"
import Link from "next/link"
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  FileCheck, 
  BrainCircuit, 
  Lock, 
  ArrowRight,
  Filter,
  X
} from "lucide-react"

interface EventItem {
  id: string
  symbol: string
  source: "NSE" | "BSE" | "RBI" | "MEDIA"
  sourceType: "OFFICIAL_FILING" | "MEDIA_WIRE" | "REGULATORY_CIRCULAR"
  factType: "CONFIRMED_FACT" | "INFERRED_INTERPRETATION"
  impact: "HIGH" | "MEDIUM" | "LOW"
  embargoed?: boolean
  linkedSetup?: boolean
  pubTime: string
  ingestTime: string
  clockSkew: string
  refId: string
  headline: string
  summary: string
  confirmedFacts: string
  inferredModel: string
  keyTerms: { label: string; value: string }[]
}

const mockEvents: EventItem[] = [
  {
    id: "evt-1",
    symbol: "TATASTEEL",
    source: "NSE",
    sourceType: "OFFICIAL_FILING",
    factType: "CONFIRMED_FACT",
    impact: "HIGH",
    linkedSetup: true,
    pubTime: "10:15:00 IST",
    ingestTime: "10:16:12 IST",
    clockSkew: "+72s (Optimal)",
    refId: "#NSE-CORP-2024-884102",
    headline: "Tata Steel signs 25-year long-term power purchase agreement for 379 MW clean energy at Kalinganagar facility",
    summary: "Long-term arrangement expected to reduce operating cost volatility by ₹140 Cr annually and mitigate steel power tariff escalations starting Q1 FY26.",
    confirmedFacts: "Official filing: Captive green power unit commissioning slated for Q4 FY25. Capex funded via internal accruals. Contract valid till 2049.",
    inferredModel: "Algorithmic inference: Structurally bullish for mid-term gross margins. Energy input inflation hedge established.",
    keyTerms: [
      { label: "Capacity", value: "379 MW Hybrid" },
      { label: "Annual Savings", value: "₹140 Cr / year" },
      { label: "Commercial COD", value: "Q4 FY25" },
      { label: "Site", value: "Kalinganagar" }
    ]
  },
  {
    id: "evt-2",
    symbol: "RELIANCE",
    source: "NSE",
    sourceType: "OFFICIAL_FILING",
    factType: "CONFIRMED_FACT",
    impact: "HIGH",
    embargoed: true,
    linkedSetup: true,
    pubTime: "11:30:12 IST",
    ingestTime: "11:32:05 IST",
    clockSkew: "+113s (Normal)",
    refId: "#NSE-REL-2024-Q3-0941",
    headline: "Board Meeting Scheduled for October 24 to Consider Q3 Unaudited Financial Results and Interim Dividend",
    summary: "Statutory notice under SEBI LODR Regulation 29. Trading window for designated persons closed until 48 hours post results disclosure.",
    confirmedFacts: "Board meeting date set for Oct 24, 2024. Dividend consideration formally agenda item 2.",
    inferredModel: "Event Dislocation Guard: Potential volatility surge on dividend speculation. Risk embargo active during session.",
    keyTerms: [
      { label: "Event Type", value: "Board Meeting" },
      { label: "Board Date", value: "Oct 24, 2024" },
      { label: "Window Status", value: "Closed (SEBI)" },
      { label: "Agenda", value: "Results & Dividend" }
    ]
  },
  {
    id: "evt-3",
    symbol: "HDFCBANK",
    source: "RBI",
    sourceType: "REGULATORY_CIRCULAR",
    factType: "CONFIRMED_FACT",
    impact: "MEDIUM",
    pubTime: "09:40:00 IST",
    ingestTime: "09:41:20 IST",
    clockSkew: "+80s (Optimal)",
    refId: "#RBI-DOR-2024-CIR-11",
    headline: "RBI issues updated prudential norms on liquidity coverage ratio (LCR) run-off factor adjustments",
    summary: "LCR guidelines tweaked for retail internet and mobile banking deposit lines, granting 12-month glidepath for implementation.",
    confirmedFacts: "Draft norm converted to final guideline with phased implementation date beginning April 1 next financial year.",
    inferredModel: "Model classification: Short-term margin overhang mitigated by 12-month transition relief.",
    keyTerms: [
      { label: "Regulator", value: "RBI Banking Dept" },
      { label: "Glidepath", value: "12 Months" },
      { label: "Impact Sector", value: "Nifty Bank" },
      { label: "Readiness", value: "Compliant" }
    ]
  }
]

export default function NewsIntelligencePage() {
  const [filterType, setFilterType] = React.useState<"ALL" | "OFFICIAL" | "HIGH_IMPACT" | "LINKED">("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedEvent, setSelectedEvent] = React.useState<EventItem>(mockEvents[0])

  const filteredEvents = mockEvents.filter(evt => {
    if (filterType === "OFFICIAL" && evt.sourceType !== "OFFICIAL_FILING") return false
    if (filterType === "HIGH_IMPACT" && evt.impact !== "HIGH") return false
    if (filterType === "LINKED" && !evt.linkedSetup) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return evt.symbol.toLowerCase().includes(q) || evt.headline.toLowerCase().includes(q) || evt.summary.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">newspaper</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                News & Regulatory Disclosures
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                Zero Social Chatter
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Strictly exchange-verified corporate announcements (NSE NEAPS, BSE) and RBI circulars with clock-skew auditing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="px-3 py-1 bg-surface-high rounded font-label-code text-label-code text-text-secondary border border-border-subtle">
            Social Media Policy: <strong className="text-accent-danger">Strictly Excluded</strong>
          </div>
        </div>
      </div>

      {/* 3 Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              Total Ingested Events
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">14 Events</span>
              <span className="font-label-code text-label-code text-accent-bullish font-semibold bg-status-live-bg px-1 rounded">Today</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">9 Filings • 3 Wire • 2 Macro Reg</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">feed</span>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              Official Disclosures
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-text-primary font-bold">9 Verified</span>
              <span className="font-label-code text-label-code text-status-live-text font-semibold bg-status-live-bg px-1 rounded">100% Provenance</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">NSE NEAPS / BSE Digital Signature</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-status-live-bg text-status-live-text flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">policy</span>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-secondary font-label-code text-label-code uppercase tracking-wider font-semibold">
              High-Impact Events
            </span>
            <div className="flex items-baseline gap-space-sm mt-1">
              <span className="font-metric-lg text-metric-lg text-accent-danger font-bold">3 Flagged</span>
              <span className="font-label-code text-label-code text-status-disconnected-text font-semibold bg-status-disconnected-bg px-1 rounded">1 Embargoed</span>
            </div>
            <span className="font-body-xs text-body-xs text-text-secondary mt-0.5">Event Dislocation Guard Active</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-status-disconnected-bg text-accent-danger flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">crisis_alert</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-1 overflow-x-auto text-nowrap">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-bold transition-all shadow-xs ${
              filterType === "ALL" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            All Events ({mockEvents.length})
          </button>
          <button
            onClick={() => setFilterType("OFFICIAL")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all ${
              filterType === "OFFICIAL" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            Official Disclosures
          </button>
          <button
            onClick={() => setFilterType("HIGH_IMPACT")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all ${
              filterType === "HIGH_IMPACT" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            High Impact
          </button>
          <button
            onClick={() => setFilterType("LINKED")}
            className={`px-3 py-1.5 rounded font-label-code text-label-code font-semibold transition-all flex items-center gap-1 ${
              filterType === "LINKED" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-high"
            }`}
          >
            <span>Linked Setups</span>
            <span className="w-4 h-4 rounded-full bg-accent-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
              2
            </span>
          </button>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search symbol, headline, tag..."
              className="w-full h-8 pl-8 pr-3 bg-canvas border border-border-subtle rounded font-body-sm text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 rounded text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Stream (Cols 1-8) + Side Drawer (Cols 9-12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Event Cards Stream (Cols 1-8) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {filteredEvents.map(evt => {
            const isSelected = selectedEvent.id === evt.id

            return (
              <article
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`bg-surface border rounded-xl p-space-md transition-all cursor-pointer flex flex-col gap-space-sm shadow-sm ${
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border-subtle hover:border-primary/40"
                }`}
              >
                {/* Badges Header */}
                <div className="flex flex-wrap items-center justify-between gap-space-xs border-b border-border-subtle pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-surface-container text-primary border border-primary/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      {evt.source} FILING
                    </span>
                    <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-status-live-bg text-status-live-text border border-accent-bullish/30">
                      CONFIRMED FACT
                    </span>
                    {evt.impact === "HIGH" && (
                      <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-status-disconnected-bg text-status-disconnected-text border border-accent-danger/20">
                        HIGH IMPACT
                      </span>
                    )}
                    {evt.linkedSetup && (
                      <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-bold uppercase bg-primary text-on-primary">
                        LINKED SETUP: {evt.symbol}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-label-code text-label-code text-text-secondary">
                    <span>Pub: <strong className="text-text-primary">{evt.pubTime}</strong></span>
                    <span>•</span>
                    <span>Ingest: <strong className="text-text-primary">{evt.ingestTime}</strong></span>
                    <span className="text-status-live-text">({evt.clockSkew})</span>
                  </div>
                </div>

                {/* Symbol & Headline */}
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-metric-md text-metric-md font-bold bg-surface-high text-text-primary">
                      {evt.symbol}
                    </span>
                    <span className="font-label-code text-label-code text-text-secondary">NSE Cash Equities</span>
                  </div>
                  <span className="font-label-code text-[11px] text-text-secondary font-mono">Ref: {evt.refId}</span>
                </div>

                <h2 className="font-headline-md text-headline-md text-text-primary leading-tight font-bold">
                  {evt.headline}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {evt.summary}
                </p>

                {/* Fact vs Inferred Segregation Callout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
                  <div className="bg-surface-high/60 border-l-2 border-primary/60 p-space-sm rounded-r">
                    <div className="flex items-center gap-1 font-label-code text-label-code text-primary uppercase font-bold mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmed Source Facts
                    </div>
                    <p className="font-body-xs text-body-xs text-text-primary leading-relaxed">
                      {evt.confirmedFacts}
                    </p>
                  </div>

                  <div className="bg-status-stale-bg/50 border-l-2 border-accent-bearish p-space-sm rounded-r">
                    <div className="flex items-center gap-1 font-label-code text-label-code text-accent-bearish uppercase font-bold mb-1">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      NLP Interpretation (Fallible)
                    </div>
                    <p className="font-body-xs text-body-xs text-text-primary leading-relaxed">
                      {evt.inferredModel}
                    </p>
                  </div>
                </div>

                {/* Risk Lockout Banner if Embargoed */}
                {evt.embargoed && (
                  <div className="bg-status-disconnected-bg border border-accent-danger/30 rounded p-space-sm flex items-center justify-between text-body-xs text-status-disconnected-text mt-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0 text-accent-danger" />
                      <span>
                        <strong>Risk Embargo Active:</strong> High-volatility corporate action window. New intraday setups locked ±30m.
                      </span>
                    </div>
                    <span className="font-label-code text-label-code uppercase font-bold">LOCK APPLIED</span>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* Right Details Drawer (Cols 9-12) */}
        <aside className="xl:col-span-4 bg-surface border border-border-subtle rounded-xl p-space-md flex flex-col gap-space-md sticky top-28 shadow-sm">
          <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-metric-md text-metric-md font-bold bg-primary text-on-primary">
                {selectedEvent.symbol}
              </span>
              <span className="px-1.5 py-0.5 rounded font-label-code text-label-code font-semibold bg-surface-container text-primary">
                {selectedEvent.source} DISCLOSURE
              </span>
            </div>
            <span className="font-label-code text-body-xs text-text-secondary">Detail Inspector</span>
          </div>

          {/* Provenance & Clock Skew */}
          <div className="bg-surface-high/60 rounded-lg p-space-sm flex flex-col gap-1.5 border border-border-subtle/50">
            <div className="font-label-code text-[11px] text-text-secondary uppercase font-bold tracking-wider mb-0.5">
              Ingestion & Clock Skew Telemetry
            </div>
            <div className="grid grid-cols-2 gap-2 text-label-code font-label-code text-[11px]">
              <div>
                <span className="text-text-secondary">Source Pub:</span>
                <div className="font-bold text-text-primary">{selectedEvent.pubTime}</div>
              </div>
              <div>
                <span className="text-text-secondary">System Ingest:</span>
                <div className="font-bold text-text-primary">{selectedEvent.ingestTime}</div>
              </div>
              <div>
                <span className="text-text-secondary">Clock Skew:</span>
                <div className="font-bold text-status-live-text">{selectedEvent.clockSkew}</div>
              </div>
              <div>
                <span className="text-text-secondary">Ref ID:</span>
                <div className="font-bold text-primary truncate font-mono">{selectedEvent.refId}</div>
              </div>
            </div>
          </div>

          {/* Headline & Material Terms */}
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold leading-tight">
              {selectedEvent.headline}
            </h3>
            <p className="font-body-xs text-body-xs text-text-secondary mt-1 leading-relaxed">
              {selectedEvent.summary}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-code text-[11px] text-text-secondary uppercase font-bold tracking-wider">
              Extracted Material Terms
            </span>
            <div className="grid grid-cols-2 gap-space-xs font-label-code text-label-code">
              {selectedEvent.keyTerms.map(term => (
                <div key={term.label} className="bg-canvas border border-border-subtle p-2 rounded">
                  <span className="text-text-secondary text-[10px] block">{term.label}:</span>
                  <span className="font-bold text-text-primary font-mono text-body-xs truncate block">{term.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Associated Setup Card if Linked */}
          {selectedEvent.linkedSetup && (
            <div className="bg-canvas border border-primary/30 rounded-lg p-space-sm flex flex-col gap-2">
              <div className="flex items-center justify-between font-label-code text-label-code">
                <span className="text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">radar</span>
                  Associated Active Setup
                </span>
                <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
              <p className="font-body-xs text-body-xs text-text-secondary">
                This filing directly supports the intraday technical setup for {selectedEvent.symbol}.
              </p>
              <Link
                href={`/dashboard/analysis/${selectedEvent.symbol}`}
                className="w-full mt-1 h-8 bg-primary hover:bg-primary-container text-on-primary font-label-code text-label-code font-bold rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Open Signal Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Statutory Mandate */}
          <div className="p-space-xs bg-surface-high/40 rounded border border-border-subtle/50 text-[10px] font-label-code text-text-secondary leading-tight flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-text-secondary shrink-0 mt-0.5">gavel</span>
            <span>
              <strong>SEBI Mandate:</strong> Disclosures are for decision support only. Zero automated trade placement. All orders must be evaluated and entered manually in Angel One.
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
