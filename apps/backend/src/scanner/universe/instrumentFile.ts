// Angel One's public instrument master (spec 0009 AC-12, AC-13). No API key needed.
export const INSTRUMENT_FILE_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

export type InstrumentRow = { token?: string; symbol?: string; name?: string; exch_seg?: string; instrumenttype?: string };

export type FnoStock = { symbol: string; token: string };

/** NSE's exchange test instruments (011NSETEST … 181NSETEST) look like stock futures but are not stocks. */
const NSE_TEST_INSTRUMENT = /^\d+NSETEST$/;

/**
 * Every underlying with a stock future (NFO FUTSTK), paired with its NSE cash token from
 * the row whose symbol is exactly `<name>-EQ`. Names with no such row, or several, are skipped.
 */
export function parseFnoStocks(rows: InstrumentRow[]): { stocks: FnoStock[]; skipped: string[] } {
  const futureNames = new Set<string>();
  const equityTokens = new Map<string, string[]>();
  for (const r of rows) {
    if (r.exch_seg === 'NFO' && r.instrumenttype === 'FUTSTK' && r.name && !NSE_TEST_INSTRUMENT.test(r.name)) {
      futureNames.add(r.name);
    } else if (r.exch_seg === 'NSE' && r.symbol?.endsWith('-EQ') && r.token) {
      const name = r.symbol.slice(0, -3);
      equityTokens.set(name, [...(equityTokens.get(name) ?? []), r.token]);
    }
  }

  const stocks: FnoStock[] = [];
  const skipped: string[] = [];
  for (const name of [...futureNames].sort()) {
    const tokens = equityTokens.get(name) ?? [];
    if (tokens.length === 1) stocks.push({ symbol: name, token: tokens[0] });
    else skipped.push(name);
  }
  return { stocks, skipped };
}

/** Downloads the file with a timeout and one retry, returning only the F&O stocks. */
export async function downloadFnoStocks(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 60_000
): Promise<{ stocks: FnoStock[]; skipped: string[] }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(INSTRUMENT_FILE_URL, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // The parsed file (about 143k rows) is dropped as soon as this returns.
      return parseFnoStocks((await res.json()) as InstrumentRow[]);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Instrument file download failed: ${(lastError as Error)?.message ?? lastError}`);
}
