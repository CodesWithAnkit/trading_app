// Historical backfill for the backtest lab (spec 0020 AC-1, AC-12).
// Fetches NIFTY (NSE) and SENSEX (BSE) 5m and 1d candles from Angel One in chunks, retries with backoff,
// respects the rate limit, upserts into `candles` (no duplicates), and resumes from the last stored candle.
import { SupabaseClient } from '@supabase/supabase-js';
import { SmartAPI } from 'smartapi-javascript';
import * as OTPAuth from 'otpauth';
import { config } from '../../scanner/config.js';
import { IndexInstrument } from '../../scanner/universe/instrumentFile.js';

export type Timeframe = '5m' | '1d';

const INTERVAL: Record<Timeframe, string> = { '5m': 'FIVE_MINUTE', '1d': 'ONE_DAY' };
/** Max days per request Angel One accepts for each interval. */
const CHUNK_DAYS: Record<Timeframe, number> = { '5m': 90, '1d': 1900 };
/** How far back to ask for. The API returns what it has; empty early chunks are skipped. */
export const EARLIEST_DATE = '2015-01-01';
const MIN_GAP_MS = 400; // about 2.5 requests per second, under the historical API limit
const MAX_ATTEMPTS = 3;
export const LOCK_NAME = 'backfill';
export const LOCK_STALE_MS = 2 * 60 * 60 * 1000;

export type BackfillEvent =
  | { type: 'chunk'; symbol: string; timeframe: Timeframe; from: string; to: string; rows: number; chunk: number; chunks: number }
  | { type: 'retry'; symbol: string; timeframe: Timeframe; from: string; attempt: number; error: string }
  | { type: 'resume'; symbol: string; timeframe: Timeframe; from: string }
  | { type: 'done'; symbol: string; timeframe: Timeframe; rows: number }
  | { type: 'unavailable'; symbol: string; timeframe: Timeframe; provider: string };

export type CandleFetcher = (p: { exchange: string; token: string; interval: string; from: string; to: string }) => Promise<
  [string, number, number, number, number, number][]
>;

// spec 0022: the history source is pluggable. Every provider returns the same raw rows.
export const HISTORY_PROVIDERS = ['angelone', 'kite'] as const;
export type HistoryProviderName = (typeof HISTORY_PROVIDERS)[number];

export const AG8004_MESSAGE = 'Angel One rejected historical data for this API key (AG8004). See docs/specs/0022.';

/** An error the backfill must not retry (a retry can never succeed). */
export class NonRetryableError extends Error {
  readonly retryable = false;
}

/** --provider flag, else request body, else HISTORY_PROVIDER, else angelone (spec 0022 AC-1). */
export function resolveProvider(explicit?: string | null, env = process.env): HistoryProviderName {
  const v = (explicit || env.HISTORY_PROVIDER || 'angelone').trim().toLowerCase();
  if (!(HISTORY_PROVIDERS as readonly string[]).includes(v)) {
    throw Object.assign(new Error(`Unknown history provider "${v}". Use one of: ${HISTORY_PROVIDERS.join(', ')}.`), { status: 422 });
  }
  return v as HistoryProviderName;
}

/** Builds the fetcher for a provider. Kite is blocked until its token flow is decided (spec 0022 Follow-up). */
export async function createHistoryFetcher(provider: HistoryProviderName): Promise<CandleFetcher> {
  if (provider === 'kite') {
    throw Object.assign(new Error('Kite history provider is not configured yet: its daily token flow is still undecided (spec 0022).'), { status: 409 });
  }
  return createAngelOneFetcher();
}

/** Turns an Angel One error response into an Error; AG8004 is not retryable (spec 0022 AC-2). */
export function angelOneError(res: { errorcode?: string; errorCode?: string; message?: string } | null | undefined): Error {
  const code = res?.errorcode || res?.errorCode || '';
  if (code === 'AG8004') return new NonRetryableError(AG8004_MESSAGE);
  return new Error(`getCandleData ${code} ${res?.message ?? 'failed'}`.replace(/\s+/g, ' ').trim());
}

/**
 * Logs in once and returns a fetcher that throws on API errors (so the caller can retry).
 * Uses ANGEL_ONE_HISTORICAL_API_KEY for candle calls when set, else the trading key (spec 0022 AC-2).
 */
export async function createAngelOneFetcher(env = process.env): Promise<CandleFetcher> {
  const a = config.angelOne;
  const apiKey = env.ANGEL_ONE_HISTORICAL_API_KEY || a.apiKey;
  if (!apiKey || !a.clientCode || !a.totpSecret) throw new Error('Missing Angel One credentials (ANGEL_ONE_API_KEY, _CLIENT_ID, _TOTP_SECRET).');
  const api = new SmartAPI({ api_key: apiKey });
  const totp = new OTPAuth.TOTP({ secret: a.totpSecret }).generate();
  const session = await api.generateSession(a.clientCode, a.password || a.clientCode, totp);
  if (!session?.data?.jwtToken) throw new Error('Angel One login failed: no session token.');
  return async ({ exchange, token, interval, from, to }) => {
    const res = await api.getCandleData({ exchange, symboltoken: token, interval, fromdate: from, todate: to });
    if (!res?.status) throw angelOneError(res as any);
    return res.data ?? [];
  };
}

/** Date chunks [from, to] (inclusive, YYYY-MM-DD) covering start..end. */
export function planChunks(start: string, end: string, days: number): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  let cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    const to = new Date(Math.min(cur.getTime() + (days - 1) * 86_400_000, last.getTime()));
    out.push({ from: iso(cur), to: iso(to) });
    cur = new Date(to.getTime() + 86_400_000);
  }
  return out;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Maps API rows to `candles` rows. Times arrive as IST ISO strings; stored as UTC instants. */
export function toCandleRows(inst: IndexInstrument, tf: Timeframe, rows: [string, number, number, number, number, number][]) {
  const durMs = tf === '5m' ? 5 * 60_000 : 24 * 60 * 60_000;
  return rows.map(([t, o, h, l, c, v]) => {
    const start = new Date(t);
    return {
      symbol: inst.symbol,
      instrument_token: inst.token,
      timeframe: tf,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v ?? 0,
      start_time: start.toISOString(),
      end_time: new Date(start.getTime() + durMs).toISOString(),
      is_complete: true,
    };
  });
}

async function lastStored(db: SupabaseClient, symbol: string, tf: Timeframe): Promise<string | null> {
  const { data, error } = await db
    .from('candles')
    .select('start_time')
    .eq('symbol', symbol)
    .eq('timeframe', tf)
    .order('start_time', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Reading last candle failed: ${error.message}`);
  return data?.[0]?.start_time ?? null;
}

/** Takes the DB lock, or throws a 409 style error. A lock older than 2 hours counts as stale. */
export async function acquireLock(db: SupabaseClient): Promise<void> {
  const { data } = await db.from('backtest_locks').select('acquired_at').eq('name', LOCK_NAME).maybeSingle();
  if (data && Date.now() - new Date(data.acquired_at).getTime() < LOCK_STALE_MS) {
    throw Object.assign(new Error(`Backfill already running since ${data.acquired_at}`), { status: 409 });
  }
  const { error } = await db.from('backtest_locks').upsert({ name: LOCK_NAME, acquired_at: new Date().toISOString() });
  if (error) throw new Error(`Could not take the backfill lock: ${error.message}`);
}

export async function releaseLock(db: SupabaseClient): Promise<void> {
  await db.from('backtest_locks').delete().eq('name', LOCK_NAME);
}

export async function backfill(opts: {
  db: SupabaseClient;
  fetcher: CandleFetcher;
  instruments: IndexInstrument[];
  timeframes?: Timeframe[];
  today?: string;
  onEvent?: (e: BackfillEvent) => void;
  sleepMs?: (ms: number) => Promise<void>;
  provider?: HistoryProviderName;
}): Promise<{ rows: number }> {
  const { db, fetcher, instruments } = opts;
  const wait = opts.sleepMs ?? sleep;
  const today = opts.today ?? iso(new Date());
  const tfs = opts.timeframes ?? ['1d', '5m'];
  let total = 0;

  await acquireLock(db);
  try {
    for (const inst of instruments) {
      for (const tf of tfs) {
        const last = await lastStored(db, inst.symbol, tf);
        const start = last ? last.slice(0, 10) : EARLIEST_DATE;
        if (last) opts.onEvent?.({ type: 'resume', symbol: inst.symbol, timeframe: tf, from: start });
        const chunks = planChunks(start, today, CHUNK_DAYS[tf]);
        let rowsForSeries = 0;
        for (let c = 0; c < chunks.length; c++) {
          const ch = chunks[c];
          let rows: [string, number, number, number, number, number][] = [];
          for (let attempt = 1; ; attempt++) {
            try {
              await wait(MIN_GAP_MS);
              rows = await fetcher({ exchange: inst.exchange, token: inst.token, interval: INTERVAL[tf], from: `${ch.from} 09:00`, to: `${ch.to} 15:30` });
              break;
            } catch (err) {
              const msg = (err as Error).message;
              if ((err as { retryable?: boolean }).retryable === false) throw err;
              if (attempt >= MAX_ATTEMPTS) throw new Error(`${inst.symbol} ${tf} ${ch.from}..${ch.to} failed after ${MAX_ATTEMPTS} attempts: ${msg}`);
              opts.onEvent?.({ type: 'retry', symbol: inst.symbol, timeframe: tf, from: ch.from, attempt, error: msg });
              await wait(1000 * 2 ** attempt);
            }
          }
          if (rows.length) {
            const mapped = toCandleRows(inst, tf, rows);
            for (let k = 0; k < mapped.length; k += 1000) {
              const { error } = await db.from('candles').upsert(mapped.slice(k, k + 1000), { onConflict: 'symbol,timeframe,start_time' });
              if (error) throw new Error(`Saving candles failed: ${error.message}`);
            }
            rowsForSeries += mapped.length;
          }
          opts.onEvent?.({ type: 'chunk', symbol: inst.symbol, timeframe: tf, from: ch.from, to: ch.to, rows: rows.length, chunk: c + 1, chunks: chunks.length });
        }
        total += rowsForSeries;
        // spec 0022 AC-4: nothing stored before and nothing returned now = the provider has no history.
        if (!last && rowsForSeries === 0) {
          opts.onEvent?.({ type: 'unavailable', symbol: inst.symbol, timeframe: tf, provider: opts.provider ?? 'angelone' });
        } else {
          opts.onEvent?.({ type: 'done', symbol: inst.symbol, timeframe: tf, rows: rowsForSeries });
        }
      }
    }
  } finally {
    await releaseLock(db);
  }
  return { rows: total };
}
