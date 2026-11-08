// Angel One's public instrument master (spec 0009 AC-12, AC-13). No API key needed.
export const INSTRUMENT_FILE_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

export type InstrumentRow = {
  token?: string;
  symbol?: string;
  name?: string;
  exch_seg?: string;
  instrumenttype?: string;
  lotsize?: string;
  expiry?: string;
};

/** A cash index the backtest lab reads (spec 0020): its spot token, exchange, and current futures lot size. */
export type IndexInstrument = { symbol: 'NIFTY' | 'SENSEX'; exchange: 'NSE' | 'BSE'; token: string; lot: number };

const INDEX_SPECS = [
  { symbol: 'NIFTY', exchange: 'NSE', spotSymbols: ['Nifty 50', 'NIFTY'], futSeg: 'NFO', futName: 'NIFTY' },
  { symbol: 'SENSEX', exchange: 'BSE', spotSymbols: ['SENSEX'], futSeg: 'BFO', futName: 'SENSEX' },
] as const;

/**
 * Spot index tokens (AMXIDX rows) and the lot size of the nearest index future (FUTIDX rows).
 * Throws when either is missing, so a changed master file fails loudly instead of guessing.
 */
export function parseIndexInstruments(rows: InstrumentRow[]): IndexInstrument[] {
  return INDEX_SPECS.map((spec) => {
    const spot = rows.find(
      (r) => r.exch_seg === spec.exchange && r.instrumenttype === 'AMXIDX' && (spec.spotSymbols as readonly string[]).includes(r.symbol ?? ''),
    );
    const futs = rows
      .filter((r) => r.exch_seg === spec.futSeg && r.instrumenttype === 'FUTIDX' && r.name === spec.futName && Number(r.lotsize) > 0)
      .sort((a, b) => parseExpiry(a.expiry) - parseExpiry(b.expiry));
    if (!spot?.token) throw new Error(`Index token for ${spec.symbol} not found in instrument file`);
    if (!futs.length) throw new Error(`Index future lot size for ${spec.symbol} not found in instrument file`);
    return { symbol: spec.symbol, exchange: spec.exchange, token: spot.token, lot: Number(futs[0].lotsize) };
  });
}

/** Expiry like "27NOV2026" to a sortable number; unknown sorts last. */
function parseExpiry(e?: string): number {
  const t = e ? Date.parse(`${e.slice(0, 2)} ${e.slice(2, 5)} ${e.slice(5)}`) : NaN;
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/** Downloads the master file and returns the NIFTY and SENSEX index instruments. */
export async function downloadIndexInstruments(fetchImpl: typeof fetch = fetch, timeoutMs = 60_000): Promise<IndexInstrument[]> {
  const res = await fetchImpl(INSTRUMENT_FILE_URL, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Instrument file download failed: HTTP ${res.status}`);
  return parseIndexInstruments((await res.json()) as InstrumentRow[]);
}

export type FnoStock = { symbol: string; token: string };

/** NSE's exchange test instruments (011NSETEST … 181NSETEST) look like stock futures but are not stocks. */
const NSE_TEST_INSTRUMENT = /^\d+NSETEST$/;

/**
 * Every underlying with a stock future (NFO FUTSTK), paired with its NSE cash token from
 * the row whose symbol is exactly `<name>-EQ`. Names with no such row, or several, are skipped.
 */
export function parseFnoStocks(rows: InstrumentRow[]): { stocks: FnoStock[]; skipped: string[]; nse: string[] } {
  const nseRaw = new Set<string>();
  const futureNames = new Set<string>();
  const equityTokens = new Map<string, string[]>();
  for (const r of rows) {
    if (r.exch_seg === 'NFO' && r.instrumenttype === 'FUTSTK' && r.name && !NSE_TEST_INSTRUMENT.test(r.name)) {
      futureNames.add(r.name);
    } else if (r.exch_seg === 'NSE' && r.symbol?.endsWith('-EQ') && r.token) {
      const name = r.symbol.slice(0, -3);
      if (!NSE_TEST_INSTRUMENT.test(name)) {
        nseRaw.add(name);
        equityTokens.set(name, [...(equityTokens.get(name) ?? []), r.token]);
      }
    }
  }

  const stocks: FnoStock[] = [];
  const skipped: string[] = [];
  for (const name of [...futureNames].sort()) {
    const tokens = equityTokens.get(name) ?? [];
    if (tokens.length === 1) stocks.push({ symbol: name, token: tokens[0] });
    else skipped.push(name);
  }

  const watched = new Set(stocks.map(s => s.symbol));
  const nse = [...nseRaw].filter(name => !watched.has(name)).sort();

  return { stocks, skipped, nse };
}

/** Downloads the file with a timeout and one retry, returning only the F&O stocks. */
export async function downloadFnoStocks(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 60_000
): Promise<{ stocks: FnoStock[]; skipped: string[]; nse: string[] }> {
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
