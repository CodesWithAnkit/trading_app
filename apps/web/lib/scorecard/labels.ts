// spec 0027: human readable names for the Scorecard's raw keys (strategy ids, setups,
// regimes, news verdicts, versions). The raw key stays the identity; this is display only.

const ACRONYMS: Record<string, string> = {
  vwap: "VWAP",
  ma: "MA",
  ema: "EMA",
  sma: "SMA",
  rsi: "RSI",
  orb: "ORB",
  macd: "MACD",
  atr: "ATR",
  oi: "OI",
}

/** `breakout_momentum` → "Breakout momentum"; `vwap_trend` → "VWAP trend"; `orb_15m` → "ORB 15m". */
export function humanize(raw: string): string {
  const words = raw.trim().toLowerCase().split(/[_\s-]+/).filter(Boolean)
  return words
    .map((w, i) => ACRONYMS[w] ?? (/\d/.test(w) ? w : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/** `guru:orb_15m` → "Guru: ORB 15m"; scanner ids humanized. */
export function strategyLabel(id: string): string {
  if (id.startsWith("guru:")) return `Guru: ${humanize(id.slice(5))}`
  return humanize(id)
}

const NEWS: Record<string, string> = { pass: "Passed", warn: "Warning", block: "Blocked" }

export function newsLabel(key: string): string {
  return NEWS[key] ?? key
}

/** `1.0` → "v1.0"; `unversioned` → "Unversioned". */
export function versionLabel(v: string): string {
  if (v === "unversioned") return "Unversioned"
  return /^\d/.test(v) ? `v${v}` : v
}

export type CutKind = "strategy" | "setup" | "timeBucket" | "regime" | "newsVerdict"

/** Display name for a row key in a given cut. Time buckets already arrive with a label. */
export function rowLabel(cut: CutKind, key: string, serverLabel: string): string {
  switch (cut) {
    case "strategy":
      return strategyLabel(key)
    case "setup":
    case "regime":
      return key === "Unknown" ? "Unknown" : humanize(key)
    case "newsVerdict":
      return newsLabel(key)
    default:
      return serverLabel
  }
}
