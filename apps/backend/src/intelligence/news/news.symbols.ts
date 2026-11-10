// Spec 0024 AC-4: map raw items to a watched F&O symbol, or MARKET for macro news, or drop them.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

export type CompanyNames = Record<string, string | string[]>;

export const normalizeName = (name: string) => name.toUpperCase().replace(NAME_SUFFIX, ' ').replace(/\s+/g, ' ').trim();

/** Only watched symbols get names; names under 4 characters or equal to the symbol are ignored. */
export function buildUniverse(symbols: string[], names: CompanyNames = {}): WatchedUniverse {
  const watched = new Set(symbols.map(s => s.toUpperCase()));
  const nameMap = new Map<string, string>();
  for (const [raw, value] of Object.entries(names)) {
    const symbol = raw.toUpperCase();
    if (!watched.has(symbol)) continue;
    for (const name of Array.isArray(value) ? value : [value]) {
      if (typeof name !== 'string') continue;
      const clean = normalizeName(name);
      if (clean.length >= 4 && clean !== symbol) nameMap.set(clean, symbol);
    }
  }
  return { symbols: watched, names: nameMap };
}

export const COMPANY_NAMES_FILE = 'company-names.json';

/**
 * The committed names file, read from the source folder (it is not copied into `dist`).
 * A missing or invalid file logs a warning (through `warn`) and gives an empty map.
 */
export function loadCompanyNames(warn: (msg: string) => void, path = defaultNamesPath()): CompanyNames {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('expected an object of SYMBOL to name');
    return parsed as CompanyNames;
  } catch (err) {
    warn(`Company names file unusable (${path}): ${(err as Error).message}. Name matching is off.`);
    return {};
  }
}

function defaultNamesPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Running from dist: dist/intelligence/news -> src/intelligence/news.
  return join(here.replace(/([\\/])dist([\\/])/, '$1src$2'), COMPANY_NAMES_FILE);
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
  // AC-4 order: a symbol or scrip code carried in the item, then names file, then a symbol word.
  const hinted =
    item.sourceKey === 'bse'
      ? (item.symbolHint ? dir.bseToNse[item.symbolHint] : undefined)
      : (item.symbolHint ?? (item.tickerHints ?? []).find(t => universe.symbols.has(t)));
  if (hinted && universe.symbols.has(hinted)) return hinted;
  const symbol = matchHeadline(item.headline, universe);
  if (symbol) return symbol;
  return isMacro(`${item.category ?? ''} ${item.headline}`) ? MARKET_SYMBOL : null;
}
