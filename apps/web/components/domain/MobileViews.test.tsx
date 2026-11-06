import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MobilePositionCard } from "./MobilePositionCard"
import { MobileSectorHeatGrid, selectFourSectorHeatCards } from "./MobileSectorHeatGrid"
import { PreTradeDisciplineGate } from "./PreTradeDisciplineGate"
import { SignalCard, formatCountdownMmSs } from "./SignalCard"
import type { Trade } from "@/mock/trades"
import type { Signal } from "@/mock/signals"
import type { SectorMetricContract } from "@/lib/contracts/intelligence"

const sampleOpenTrade: Trade = {
  id: "trd-1",
  symbol: "INFY",
  direction: "LONG",
  status: "OPEN",
  quantity: 50,
  entryPrice: 1520,
  stopLoss: 1524,
  target1: 1550,
  legs: [
    { id: "l1", action: "ENTRY", price: 1520, quantity: 100, timestamp: "2026-10-15T05:00:00Z" },
    { id: "l2", action: "PARTIAL_EXIT", price: 1535, quantity: 50, timestamp: "2026-10-15T05:15:00Z" },
  ],
  notes: "T1 booked",
  createdAt: "2026-10-15T05:00:00Z",
}

const samplePendingTrade: Trade = {
  id: "trd-2",
  symbol: "HDFCBANK",
  direction: "LONG",
  status: "OPEN",
  quantity: 40,
  entryPrice: 1440,
  stopLoss: 1434,
  target1: 1452,
  legs: [{ id: "l3", action: "ENTRY", price: 1440, quantity: 40, timestamp: "2026-10-15T05:00:00Z" }],
  notes: "",
  createdAt: "2026-10-15T05:00:00Z",
}

const sampleSignal: Signal = {
  id: "sig-tata",
  symbol: "TATASTEEL",
  exchange: "NSE",
  direction: "LONG",
  setup: "VWAP Pullback + Volume Surge",
  status: "ACTIVE",
  price: 156.4,
  entryZone: { low: 156.1, high: 156.5 },
  referenceEntry: 155.9,
  stop: 155.2,
  targets: { t1: 157.8 },
  confidence: 84,
  confidenceBand: "HIGH",
  createdAt: "2026-10-15T05:00:00Z",
  expiresAt: "2026-10-15T05:25:00Z",
  rationale: "VWAP Held ₹155.90 · Breakout",
  metrics: {
    relativeVolume: "2.8x (10d 15m)",
    trendAlignment: "Aligned",
    volatility: "Normal",
    liquidity: "High",
    riskReward: "1 : 2.1",
  },
}

describe("formatCountdownMmSs", () => {
  it("formats remaining milliseconds into MMm SSs", () => {
    const now = new Date("2026-10-15T05:00:00Z").getTime()
    const expires = new Date(now + (14 * 60 + 20) * 1000).toISOString()
    expect(formatCountdownMmSs(expires, now)).toBe("14m 20s")
  })

  it("returns EXPIRED when time has elapsed", () => {
    const now = new Date("2026-10-15T05:00:00Z").getTime()
    const expires = new Date(now - 5000).toISOString()
    expect(formatCountdownMmSs(expires, now)).toBe("EXPIRED")
  })
})

describe("SignalCard mobile 3-column grid, evidence chips, and stale lock (AC-4, AC-9)", () => {
  it("renders 3-column execution grid and validated evidence chips", () => {
    render(<SignalCard signal={sampleSignal} sectorChangeLabel="Metals +1.8%" />)
    expect(screen.getByText("TATASTEEL")).toBeInTheDocument()
    expect(screen.getByText("₹156.40")).toBeInTheDocument()
    expect(screen.getByText("156.10–156.50")).toBeInTheDocument()
    expect(screen.getByText("₹155.20")).toBeInTheDocument()
    expect(screen.getByText("₹157.80")).toBeInTheDocument()
    expect(screen.getByText("RVOL 2.8x (10d 15m)")).toBeInTheDocument()
    expect(screen.getByText("VWAP Held ₹155.90")).toBeInTheDocument()
    expect(screen.getByText("Metals +1.8%")).toBeInTheDocument()
    expect(screen.getByText("Risk Gate: PASS")).toBeInTheDocument()
  })

  it("locks I Entered button and applies degraded border when isLocked is true (AC-9)", () => {
    const onEnter = vi.fn()
    render(<SignalCard signal={sampleSignal} isLocked={true} onEnterClick={onEnter} />)
    const enterBtn = screen.getByRole("button", { name: /I Entered/i })
    expect(enterBtn).toBeDisabled()
    fireEvent.click(enterBtn)
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getByTestId("signal-card-TATASTEEL")).toHaveClass("opacity-85")
  })
})

describe("MobilePositionCard (AC-5, AC-9)", () => {
  it("renders TRAILING STOP and T1 Hit milestone when trade has a PARTIAL_EXIT leg", () => {
    render(
      <MobilePositionCard
        trade={sampleOpenTrade}
        currentLtp={1532.4}
        onPartialExitClick={vi.fn()}
        onFullExitClick={vi.fn()}
      />
    )
    expect(screen.getByText("INFY")).toBeInTheDocument()
    expect(screen.getByText("TRAILING STOP")).toBeInTheDocument()
    expect(screen.getByText("T1 Hit (Booked 50%)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Partial Exit" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Full Exit" })).toBeInTheDocument()
  })

  it("renders INITIAL STOP, TARGET 1 Pending, and Adjust SL when no partial exit exists", () => {
    const onAdjustSl = vi.fn()
    render(
      <MobilePositionCard
        trade={samplePendingTrade}
        currentLtp={1445.5}
        onAdjustSlClick={onAdjustSl}
        onFullExitClick={vi.fn()}
      />
    )
    expect(screen.getByText("HDFCBANK")).toBeInTheDocument()
    expect(screen.getByText("INITIAL STOP")).toBeInTheDocument()
    expect(screen.getByText(/₹1452\.00 \(Pending\)/)).toBeInTheDocument()
    const adjustBtn = screen.getByRole("button", { name: "Adjust SL" })
    fireEvent.click(adjustBtn)
    expect(onAdjustSl).toHaveBeenCalledWith(samplePendingTrade)
  })

  it("disables exit and adjust actions when isLocked is true (AC-9)", () => {
    render(
      <MobilePositionCard
        trade={samplePendingTrade}
        isLocked={true}
        onAdjustSlClick={vi.fn()}
        onFullExitClick={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Adjust SL" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Full Exit" })).toBeDisabled()
  })
})

describe("MobileSectorHeatGrid (AC-6)", () => {
  const sectors: SectorMetricContract[] = [
    { name: "NIFTY METAL", ltp: 9240, changePct: 1.82, alphaVsNifty: 1.18, leaderSymbol: "TATASTEEL", leaderChangePct: 2.1, advances: 12, declines: 3, bias: "LONG" },
    { name: "NIFTY AUTO", ltp: 23110, changePct: 1.24, alphaVsNifty: 0.6, leaderSymbol: "M&M", leaderChangePct: 1.9, advances: 11, declines: 4, bias: "LONG" },
    { name: "NIFTY BANK", ltp: 52380, changePct: 0.38, alphaVsNifty: -0.26, leaderSymbol: "HDFCBANK", leaderChangePct: 0.4, advances: 7, declines: 5, bias: "NEUTRAL" },
    { name: "NIFTY REALTY", ltp: 1012, changePct: -1.14, alphaVsNifty: -1.78, leaderSymbol: "DLF", leaderChangePct: -1.8, advances: 2, declines: 8, bias: "SHORT" },
  ]

  it("renders 2x2 sector cards and engine heuristic note", () => {
    const selected = selectFourSectorHeatCards(sectors)
    expect(selected).toHaveLength(4)
    render(<MobileSectorHeatGrid sectors={sectors} />)
    expect(screen.getByText("METALS")).toBeInTheDocument()
    expect(screen.getByText("+1.82%")).toBeInTheDocument()
    expect(screen.getByText("Strong Long Bias")).toBeInTheDocument()
    expect(screen.getByText("REALTY")).toBeInTheDocument()
    expect(screen.getByText("-1.14%")).toBeInTheDocument()
    expect(screen.getByText("Short Priority")).toBeInTheDocument()
    expect(screen.getByText(/Engine Heuristic:/i)).toBeInTheDocument()
  })
})

describe("PreTradeDisciplineGate (AC-6)", () => {
  it("renders all 3 discipline checks and SEBI regulatory disclaimer", () => {
    render(<PreTradeDisciplineGate maxDailyLoss={6000} lossDrawn={0} brokerConnected={true} />)
    expect(screen.getByText(/Max Loss Guard: ₹6,000 threshold strictly active/i)).toBeInTheDocument()
    expect(screen.getByText(/Broker Session: Angel One SmartAPI connected/i)).toBeInTheDocument()
    expect(screen.getByText(/Position Sizing: Restricted to 1.0% to 1.5% equity/i)).toBeInTheDocument()
    expect(screen.getByText(/Per SEBI regulatory guidance/i)).toBeInTheDocument()
  })
})
