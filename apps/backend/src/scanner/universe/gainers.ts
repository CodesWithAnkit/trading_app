// Pure helpers for turning Angel One F&O gainers into NSE cash symbols (spec 0009 AC-12, AC-13).

/** Index futures also show up in gainersLosers; they have no cash stock to stream. */
export const INDEX_UNDERLYINGS = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50', 'SENSEX', 'BANKEX']);

const FUTURE_SYMBOL = /^(.+?)\d{2}[A-Z]{3}\d{2}FUT$/;

/** `RELIANCE28OCT26FUT` -> `RELIANCE`; null for anything that is not a dated future. */
export function parseUnderlying(tradingSymbol: string): string | null {
  const match = FUTURE_SYMBOL.exec(tradingSymbol.trim().toUpperCase());
  return match ? match[1] : null;
}

export type GainerRow = { tradingSymbol?: string; percentChange?: number | string };

/** Unique cash symbols in response order, with index underlyings and unparseable rows dropped. */
export function extractGainerSymbols(rows: GainerRow[]): { symbols: string[]; skipped: string[] } {
  const symbols: string[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const raw = row.tradingSymbol ?? '';
    const underlying = parseUnderlying(raw);
    if (!underlying) {
      skipped.push(raw);
      continue;
    }
    if (INDEX_UNDERLYINGS.has(underlying) || symbols.includes(underlying)) continue;
    symbols.push(underlying);
  }
  return { symbols, skipped };
}

export type ScripResult = { exchange?: string; tradingsymbol?: string; symboltoken?: string };

/** The one NSE `<SYMBOL>-EQ` row, or null when there are none or several. */
export function pickEquityToken(results: ScripResult[], symbol: string): string | null {
  const wanted = `${symbol.toUpperCase()}-EQ`;
  const matches = results.filter(r => r.exchange === 'NSE' && r.tradingsymbol === wanted && r.symboltoken);
  return matches.length === 1 ? matches[0].symboltoken! : null;
}
