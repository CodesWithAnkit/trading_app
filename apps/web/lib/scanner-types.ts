import type { Signal } from "@/mock/signals"

export type StrategyProximity = {
  setupFamily: string
  direction: "LONG" | "SHORT"
  triggerLevel: number
  distancePct: number
  proximity: number
  condition: string
}

export type ApproachingSetup = {
  symbol: string
  price: number
  dayChangePct: number
  volume: number
  relativeVolume: number
  momentumScore: number
  strategies: StrategyProximity[]
  closestDistancePct: number
  updatedAt: string
}

export type MomentumStock = {
  symbol: string
  ltp: number
  dayChangePct: number
  volume: number
  relativeVolume: number
  trend: "UP" | "DOWN" | "UNKNOWN"
  /** False until the previous close is known; the score is 0 meanwhile. */
  ranked: boolean
  momentumScore: number
  lastTickAt: string
}

export type OutcomeStatus = "WON" | "LOST" | "NEUTRAL"

export type SignalOutcome = Signal & {
  actualHigh: number | null
  actualLow: number | null
  actualClose: number | null
  outcomeStatus: OutcomeStatus | null
  outcomePnlPct: number | null
}

export type OutcomesPayload = {
  date: string
  data: SignalOutcome[]
  summary: { total: number; winners: number; losers: number; neutral: number; pending: number }
}

export const STRATEGY_LABELS: Record<string, string> = {
  VWAP_TREND: "VWAP Breakout",
  BREAKOUT_MOMENTUM: "Opening Range Breakout",
  MEAN_REVERSION: "Mean Reversion",
  SCALPING: "EMA Scalp",
  MA_CROSSOVER: "MA Crossover",
  OSCILLATOR_THRESHOLD: "RSI Threshold",
}

export const strategyLabel = (family: string) => STRATEGY_LABELS[family] ?? family.replace(/_/g, " ")

/** True from 15:30 IST until midnight: the session is over and outcomes are meaningful. */
export function isAfterMarketHours(now: Date = new Date()): boolean {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  return ist.getHours() * 100 + ist.getMinutes() >= 1530
}

/**
 * Next top gainers pull as IST "HH:MM": 09:22 then every 15 minutes to 15:22 on weekdays
 * (spec 0009 AC-12). Null when no pull is left today.
 */
export function nextGainersPull(now: Date = new Date()): string | null {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const day = ist.getDay()
  if (day === 0 || day === 6) return null
  const minute = ist.getHours() * 60 + ist.getMinutes()
  for (let slot = 9 * 60 + 22; slot <= 15 * 60 + 22; slot += 15) {
    if (slot > minute) return `${String(Math.floor(slot / 60)).padStart(2, "0")}:${String(slot % 60).padStart(2, "0")}`
  }
  return null
}

export function formatVolume(volume: number): string {
  if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)} Cr`
  if (volume >= 1e5) return `${(volume / 1e5).toFixed(2)} L`
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)} K`
  return volume.toString()
}
