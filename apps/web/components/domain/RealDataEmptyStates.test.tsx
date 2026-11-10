import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { InstitutionalFlowCard, toInstitutionalFlowData } from "./InstitutionalFlowCard"
import { MarketRegimeStrip } from "./MarketRegimeStrip"

describe("spec 0026 empty states", () => {
  // covers: 0026 AC-7
  it("the institutional card says no source is connected, with no sample figures", () => {
    const data = toInstitutionalFlowData({ flows: null, recentDeals: [], disclaimer: "Delayed", connected: false })
    expect(data).toBeNull()
    const { container } = render(<InstitutionalFlowCard data={data} />)
    expect(screen.getByText("No institutional flow source connected.")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Cr\b|ICICIPRULI|842/)
  })

  // covers: 0026 AC-7 (real rows still render)
  it("renders real flows and deals when a source has written rows", () => {
    const data = toInstitutionalFlowData({
      connected: true, disclaimer: "Delayed",
      flows: { reportDate: "2026-11-10", fiiGrossBuyCr: 1, fiiGrossSellCr: 1, fiiNetCr: -120.5, diiGrossBuyCr: 1, diiGrossSellCr: 1, diiNetCr: 300, reportingPeriod: "PREVIOUS_DAY_EOD", disclaimer: "Delayed" },
      recentDeals: [],
    })
    render(<InstitutionalFlowCard data={data} />)
    expect(screen.getByText(/₹-120.50 Cr/)).toBeInTheDocument()
  })

  // covers: 0026 AC-4
  it("the regime strip shows dashes and 'No live data', never sample numbers, without data", () => {
    const { container } = render(<MarketRegimeStrip />)
    expect(screen.getByText("No live data")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/13\.42|24,?482|1482/)
  })
})
