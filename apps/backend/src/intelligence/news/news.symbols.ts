// Spec 0024 AC-4: map raw items to a watched F&O symbol, or MARKET for macro news, or drop them.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INSTRUMENT_FILE_URL, InstrumentRow, parseFnoStocks } from '../../scanner/universe/instrumentFile.js';
import { isMacro } from './news.rules.js';
import { MARKET_SYMBOL, RawNewsItem } from './news.types.js';

/** What the mapper needs from the Angel One instrument file, compact enough to cache. */
export type InstrumentDirectory = {
  /** BSE scrip code (token) to NSE symbol, matched by the same name. */
  bseToNse: Record<string, string>;
  /** Every F&O stock symbol, the fallback universe. */
  fno: string[];
};

export function buildDirectory(rows: InstrumentRow[]): InstrumentDirectory {
  const nseEq = new Set<string>();
  for (const r of rows) if (r.exch_seg === 'NSE' && r.symbol?.endsWith('-EQ')) nseEq.add(r.symbol.slice(0, -3));
  const bseToNse: Record<string, string> = {};
  for (const r of rows) {
    if (r.exch_seg !== 'BSE' || !r.token || !r.name) continue;
    const name = r.name.toUpperCase();
    if (nseEq.has(name)) bseToNse[r.token] = name;
  }
  return { bseToNse, fno: parseFnoStocks(rows).stocks.map(s => s.symbol) };
}

const DIRECTORY_CACHE_FILE = join(tmpdir(), 'trading-news-directory.json');

/** Downloads (once per day, cached on disk) the instrument directory. */
export async function loadDirectory(today: string, fetchImpl: typeof fetch = fetch): Promise<InstrumentDirectory> {
  try {
    const c = JSON.parse(readFileSync(DIRECTORY_CACHE_FILE, 'utf8')) as { date: string; dir: InstrumentDirectory };
    if (c.date === today && c.dir?.fno?.length) return c.dir;
  } catch {
    // no cache yet
  }
  const res = await fetchImpl(INSTRUMENT_FILE_URL, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok) throw new Error(`Instrument file HTTP ${res.status}`);
  const dir = buildDirectory((await res.json()) as InstrumentRow[]);
  try {
    writeFileSync(DIRECTORY_CACHE_FILE, JSON.stringify({ date: today, dir }));
  } catch {
    // the next run downloads again
  }
  return dir;
}

export type WatchedUniverse = {
  symbols: Set<string>;
  /** Extra names to look for in free text, upper case, mapped to the symbol. */
  names: Map<string, string>;
};

const NAME_SUFFIX = /\b(LIMITED|LTD\.?|INDIA|CORPORATION|CORP\.?|COMPANY|CO\.?)\b/g;

export function buildUniverse(symbols: string[], names: Record<string, string | null | undefined> = {}): WatchedUniverse {
  const nameMap = new Map<string, string>();
  for (const [symbol, name] of Object.entries(names)) {
    const clean = (name ?? '').toUpperCase().replace(NAME_SUFFIX, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length >= 4 && clean !== symbol) nameMap.set(clean, symbol);
  }
  return { symbols: new Set(symbols.map(s => s.toUpperCase())), names: nameMap };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A watched symbol or company name appearing as a whole word in the headline, else null. */
export function matchHeadline(headline: string, universe: WatchedUniverse): string | null {
  const upper = headline.toUpperCase();
  for (const [name, symbol] of universe.names) if (new RegExp(`\\b${escape(name)}\\b`).test(upper)) return symbol;
  for (const token of upper.match(/[A-Z][A-Z0-9&-]{2,}/g) ?? []) if (universe.symbols.has(token)) return token;
  return null;
}

/** The stored symbol for an item, or null to drop it. */
export function mapSymbol(item: RawNewsItem, universe: WatchedUniverse, dir: InstrumentDirectory): string | null {
  let symbol: string | null = null;
  if (item.sourceKey === 'nse') {
    symbol = item.symbolHint && universe.symbols.has(item.symbolHint) ? item.symbolHint : null;
  } else if (item.sourceKey === 'bse') {
    const nse = item.symbolHint ? dir.bseToNse[item.symbolHint] : undefined;
    symbol = nse && universe.symbols.has(nse) ? nse : null;
  } else {
    symbol = (item.tickerHints ?? []).find(t => universe.symbols.has(t)) ?? matchHeadline(item.headline, universe);
  }
  if (symbol) return symbol;
  return isMacro(`${item.category ?? ''} ${item.headline}`) ? MARKET_SYMBOL : null;
}
