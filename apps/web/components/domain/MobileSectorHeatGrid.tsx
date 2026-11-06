"use client"
import * as React from "react"
import type { SectorMetricContract } from "@/lib/contracts/intelligence"

export interface MobileSectorHeatCardItem {
  name: string
  changePct: number
  statusLabel: string
  tone: "BULLISH" | "NEUTRAL" | "BEARISH"
}

export interface MobileSectorHeatGridProps {
  sectors?: SectorMetricContract[]
  periodLabel?: string
}

const DEFAULT_HEAT_CARDS: MobileSectorHeatCardItem[] = [
  { name: "METALS", changePct: 1.82, statusLabel: "Strong Long Bias", tone: "BULLISH" },
  { name: "AUTO", changePct: 1.24, statusLabel: "Follow-through", tone: "BULLISH" },
  { name: "BANK", changePct: 0.38, statusLabel: "Neutral Rotation", tone: "NEUTRAL" },
  { name: "REALTY", changePct: -1.14, statusLabel: "Short Priority", tone: "BEARISH" },
]

function mapSectorToHeatCard(sector: SectorMetricContract, index: number): MobileSectorHeatCardItem {
  const rawShortName = sector.name.replace(/^NIFTY\s+/i, "").toUpperCase()
  const shortName = rawShortName === "METAL" ? "METALS" : rawShortName
  if (sector.bias === "LONG" || sector.changePct >= 1.0) {
    return {
      name: shortName,
      changePct: sector.changePct,
      statusLabel: index === 0 ? "Strong Long Bias" : "Follow-through",
      tone: "BULLISH",
    }
  }
  if (sector.bias === "SHORT" || sector.changePct <= -0.4) {
    return {
      name: shortName,
      changePct: sector.changePct,
      statusLabel: "Short Priority",
      tone: "BEARISH",
    }
  }
  return {
    name: shortName,
    changePct: sector.changePct,
    statusLabel: "Neutral Rotation",
    tone: "NEUTRAL",
  }
}

export function selectFourSectorHeatCards(sectors?: SectorMetricContract[]): MobileSectorHeatCardItem[] {
  if (!sectors || sectors.length < 4) return DEFAULT_HEAT_CARDS
  const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct)
  const top1 = sorted[0]
  const top2 = sorted[1]
  const neutral = sorted.find(s => s.bias === "NEUTRAL" && s !== top1 && s !== top2) ?? sorted[2]
  const bottom = sorted[sorted.length - 1]
  return [top1, top2, neutral, bottom].map((s, idx) => mapSectorToHeatCard(s, idx))
}

export function MobileSectorHeatGrid({
  sectors,
  periodLabel = "15m Period",
}: MobileSectorHeatGridProps) {
  const cards = selectFourSectorHeatCards(sectors)

  return (
    <section className="space-y-2" data-testid="mobile-sector-heat-grid">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-accent-primary" aria-hidden="true">
            view_quilt
          </span>
          <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Sector Regime Heat
          </h2>
        </div>
        <span className="font-label-code text-label-code text-text-secondary">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cards.map(card => {
          const borderClass =
            card.tone === "BULLISH"
              ? "border-l-2 border-l-accent-bullish"
              : card.tone === "BEARISH"
              ? "border-l-2 border-l-accent-danger"
              : "border-l-2 border-l-text-secondary"
          const changeColor =
            card.changePct > 0
              ? card.tone === "BULLISH"
                ? "text-accent-bullish"
                : "text-text-primary"
              : "text-accent-danger"
          const statusColor =
            card.tone === "BULLISH"
              ? card.statusLabel === "Strong Long Bias"
                ? "text-status-live-text"
                : "text-text-secondary"
              : card.tone === "BEARISH"
              ? "text-accent-danger"
              : "text-text-secondary"

          return (
            <div
              key={card.name}
              className={`bg-surface p-2.5 rounded-xl shadow-sm space-y-1 border border-border-subtle ${borderClass}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-label-code text-label-code font-bold text-text-primary">
                  {card.name}
                </span>
                <span className={`font-metric-sm text-metric-sm font-semibold tabular-nums ${changeColor}`}>
                  {card.changePct >= 0 ? "+" : ""}
                  {card.changePct.toFixed(2)}%
                </span>
              </div>
              <span className={`font-body-xs text-body-xs block ${statusColor}`}>
                {card.statusLabel}
              </span>
            </div>
          )
        })}
      </div>

      <p className="font-body-xs text-body-xs text-text-secondary bg-surface-high p-2 rounded-lg leading-relaxed">
        <strong className="text-text-primary font-label-code">Engine Heuristic:</strong> Long trades filtered out for tickers belonging to sectors lagging below -0.5% index benchmark.
      </p>
    </section>
  )
}
