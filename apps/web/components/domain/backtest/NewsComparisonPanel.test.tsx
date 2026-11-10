import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NewsComparisonPanel } from "./NewsComparisonPanel"
import * as api from "@/lib/hooks/useBacktest"

const m = (trades: number, netR: number) => ({ trades, winRate: 0.5, netR, profitFactor: 1.2, maxDrawdownR: 2 })

describe("NewsComparisonPanel (spec 0025 backtest)", () => {
  // covers: 0025 backtest AC-5, AC-6
  it("shows the coverage, the sample warning and both metric columns", async () => {
    vi.spyOn(api, "fetchNewsComparison").mockResolvedValue({
      runId: "r", symbol: "NIFTY", gateVersion: "news-gate-v1", coveredDays: 3, coveredTrades: 12, totalTrades: 400,
      sampleTooSmall: true, without: m(12, 1.5), with: m(11, 2.5), warnedTrades: 2,
      blocked: [{ tradeDate: "2026-11-11", side: "LONG", rNet: -1, itemIds: ["m1"], reason: "HIGH Bearish (Rule): RBI hikes repo rate, 10:40" }],
    })
    render(<NewsComparisonPanel runId="r" status="done" />)
    expect(await screen.findByText(/12 of 400 trades covered, on 3 days/)).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/Sample too small/)
    expect(screen.getByText("news-gate-v1")).toBeInTheDocument()
    expect(screen.getByText("Blocked trades (1)")).toBeInTheDocument()
  })

  // covers: 0025 backtest AC-5
  it("says there is no coverage yet when no day is covered, and renders nothing for a run not done", async () => {
    vi.spyOn(api, "fetchNewsComparison").mockResolvedValue({
      runId: "r", symbol: "NIFTY", gateVersion: "news-gate-v1", coveredDays: 0, coveredTrades: 0, totalTrades: 400,
      sampleTooSmall: true, without: m(0, 0), with: m(0, 0), warnedTrades: 0, blocked: [],
    })
    const { container, rerender } = render(<NewsComparisonPanel runId="r" status="done" />)
    expect(await screen.findByText(/No news coverage in this run's window yet/)).toBeInTheDocument()
    rerender(<NewsComparisonPanel runId="r2" status="running" />)
    expect(container.firstChild).toBeNull()
  })
})
