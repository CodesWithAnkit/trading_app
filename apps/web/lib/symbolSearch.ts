// Top bar symbol search (spec 0012).

export const MAX_RESULTS = 8

/**
 * Case insensitive symbol match: symbols starting with the text first, then symbols
 * containing it elsewhere, each group alphabetical, capped at `limit` (spec 0012 AC-2, AC-3).
 */
export function matchSymbols(symbols: string[], text: string, limit = MAX_RESULTS): string[] {
  const q = text.trim().toUpperCase()
  if (!q) return []
  const unique = [...new Set(symbols)]
  const startsWith = unique.filter(s => s.toUpperCase().startsWith(q)).sort()
  const contains = unique.filter(s => !s.toUpperCase().startsWith(q) && s.toUpperCase().includes(q)).sort()
  return [...startsWith, ...contains].slice(0, limit)
}

/** Analysis page when the stock has an open plan today, else its market page (spec 0012 AC-5). */
export function searchTarget(symbol: string, openPlanSymbols: Set<string>): string {
  const page = openPlanSymbols.has(symbol) ? "analysis" : "markets"
  return `/dashboard/${page}/${encodeURIComponent(symbol)}`
}
