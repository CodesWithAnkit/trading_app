// spec 0028: plain words for risk verdicts. Raw reason codes never reach the screen.
import type { RiskNote, SkipReason } from "./types"

const SKIP: Record<SkipReason, string> = {
  STOP_INVALID: "Stop missing or invalid",
  MAX_OPEN_TRADES: "Max open trades reached",
  DAILY_LOSS_LIMIT: "Daily loss limit reached",
  STOP_TOO_WIDE: "Stop too wide for your risk per trade",
  CAPITAL_TOO_SMALL: "Capital too small for one share",
  STOP_TOO_WIDE_FOR_ROOM: "Stop too wide for today's remaining room",
}

const SKIP_HINT: Record<SkipReason, string> = {
  STOP_INVALID: "The stop is missing, equals entry, or sits on the wrong side for this direction.",
  MAX_OPEN_TRADES: "Close or cancel an open journal entry to free a slot.",
  DAILY_LOSS_LIMIT: "New signals resume tomorrow at 00:00 IST.",
  STOP_TOO_WIDE: "One share would risk more than your risk per trade.",
  CAPITAL_TOO_SMALL: "One share costs more than your max capital per trade.",
  STOP_TOO_WIDE_FOR_ROOM: "Not enough of today's loss limit is left for even one share.",
}

const NOTE: Record<RiskNote, string> = {
  CAPPED_BY_CAPITAL: "Capped by capital",
  REDUCED_TO_ROOM: "Reduced to fit today's loss room",
}

export const skipLabel = (r: SkipReason) => SKIP[r] ?? "Skip"
export const skipHint = (r: SkipReason) => SKIP_HINT[r] ?? ""
export const noteLabel = (n: RiskNote) => NOTE[n] ?? n

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
export const formatInr = (v: number) => inr.format(v)
