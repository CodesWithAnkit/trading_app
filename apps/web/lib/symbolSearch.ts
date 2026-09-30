// Top bar symbol search (spec 0012).

export const MAX_RESULTS = 8

export function matchSymbols(source: { fno: string[]; nse: string[] }, text: string, limit = MAX_RESULTS): { fno: string[]; nse: string[] } {
  const q = text.trim().toUpperCase()
  if (!q) return { fno: [], nse: [] }
  
  const match = (symbols: string[], limit: number) => {
    const unique = [...new Set(symbols)]
    const startsWith = unique.filter(s => s.toUpperCase().startsWith(q)).sort()
    const contains = unique.filter(s => !s.toUpperCase().startsWith(q) && s.toUpperCase().includes(q)).sort()
    return [...startsWith, ...contains].slice(0, limit)
  }

  return {
    fno: match(source.fno, limit),
    nse: match(source.nse, 5),
  }
}

/** Analysis page when the stock has an open plan today, else its market page (spec 0012 AC-5). */
export function searchTarget(symbol: string, openPlanSymbols: Set<string>): string {
  const page = openPlanSymbols.has(symbol) ? "analysis" : "markets"
  return `/dashboard/${page}/${encodeURIComponent(symbol)}`
}
