import type { RunRow } from "@/lib/hooks/useBacktest"

export const SYMBOLS = ["NIFTY", "SENSEX"] as const
export const GURU_IDS = ["GJ_PDHL", "MR_EMA_PIN", "UP_ORB", "SP_5EMA", "AST_RG"] as const
export const ALL_RULE_IDS = [...GURU_IDS, "BASE_COIN", "BASE_BUYHOLD"] as const

export const isBaseline = (id: string) => id.startsWith("BASE_")

export function signedR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "·"
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} R`
}

export function signedPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "·"
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} %`
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? "·" : `${(x * 100).toFixed(1)}%`)

export type Gate = "PASS" | "FAIL" | "BASELINE" | "NO DATA"
export function gateOf(r: RunRow): Gate {
  if (r.out_of_sample?.unavailable) return "NO DATA"
  if (isBaseline(r.rule_id)) return "BASELINE"
  return r.passed_gate ? "PASS" : "FAIL"
}

export function yearsPositive(r: RunRow): string {
  const py = r.out_of_sample?.perYear
  if (!py) return "·"
  const full = Object.values(py).filter((y) => y.full)
  const value = (y: (typeof full)[number]) => (r.rule_id === "BASE_BUYHOLD" ? y.returnPct : y.netR) ?? 0
  return `${full.filter((y) => value(y) > 0).length} / ${full.length}`
}

/** True during NSE cash hours (09:15 to 15:30 IST, weekdays): runs share CPU with the live scanner. */
/** spec 0022 AC-5: the line shown when the gate was judged on fewer symbols than usual. */
export function gateScopeNote(runs: RunRow[]): string | null {
  for (const r of runs) {
    const g = r.out_of_sample?.gate
    if (g?.unavailable?.length) {
      const missing = g.unavailable.map((u) => `${u.symbol} history unavailable from ${u.provider}`).join(", ")
      return g.judgedOn?.length ? `Gate judged on ${g.judgedOn.join(" + ")} only: ${missing}.` : `Gate not judged: ${missing}.`
    }
  }
  return null
}

export function isMarketHours(now = new Date()): boolean {
  const ist = new Date(now.getTime() + 330 * 60_000)
  const day = ist.getUTCDay()
  const m = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  return day >= 1 && day <= 5 && m >= 555 && m <= 930
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "·"
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })
}

export function fmtIst(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "Asia/Kolkata" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }),
  }
}

export const num = (n: number | string | null | undefined, digits = 2) =>
  n === null || n === undefined ? "·" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })
