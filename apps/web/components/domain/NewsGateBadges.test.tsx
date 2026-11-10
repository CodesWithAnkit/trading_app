import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NewsGateBadges } from "./NewsGateBadges"
import type { Signal } from "@/mock/signals"

const base = { id: "s1", symbol: "TCS", direction: "LONG" } as unknown as Signal
const item = (symbol: string) => ({ id: "n1", symbol, headline: "SEBI order on TCS", sourceUrl: "https://x/1", publishedAt: "2026-11-10T05:10:00Z" })

describe("NewsGateBadges (spec 0025 AC-5)", () => {
  // covers: 0025 live AC-5
  it("shows nothing for pass or for signals from before the feature", () => {
    const { container, rerender } = render(<NewsGateBadges signal={{ ...base, newsGate: "pass" }} />)
    expect(container.firstChild).toBeNull()
    rerender(<NewsGateBadges signal={{ ...base, newsGate: null }} />)
    expect(container.firstChild).toBeNull()
  })

  // covers: 0025 live AC-5
  it("shows Blocked by news with the deciding headline linking to its source", () => {
    render(<NewsGateBadges signal={{ ...base, newsGate: "block", newsGateReason: "HIGH Bearish (Rule): SEBI order on TCS, 10:40", newsGateItems: [item("TCS")] }} />)
    fireEvent.click(screen.getByRole("button", { name: /Blocked by news/ }))
    expect(screen.getByRole("link", { name: "SEBI order on TCS" })).toHaveAttribute("href", "https://x/1")
    expect(screen.queryByText(/Market wide news/)).toBeNull()
  })

  // covers: 0025 live AC-5
  it("labels a MARKET only verdict as Market wide news, and shows the after entry badge apart", () => {
    render(<NewsGateBadges signal={{ ...base, newsGate: "warn", newsGateItems: [item("MARKET")], newsAfterGate: "block", newsAfterItems: [item("TCS")] }} />)
    expect(screen.getByRole("button", { name: /News warning.*Market wide news/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /News after entry: against this trade/ })).toBeInTheDocument()
  })
})
