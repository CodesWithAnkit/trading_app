import { describe, expect, it, vi } from 'vitest';
import { AG8004_MESSAGE, angelOneError, backfill, createHistoryFetcher, resolveProvider } from './backfill.js';
import { judgedSymbols, ruleGate } from '../engine/gate.js';

const inst = [{ symbol: 'NIFTY', exchange: 'NSE', token: '99926000', lot: 65 }] as const;

/** Supabase double: no stored candles, lock free, upserts succeed. */
function db() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ error: null }),
    delete: () => chain,
    then: (res: any) => res({ error: null }),
  };
  return { from: () => chain } as any;
}

describe('provider selection (spec 0022 AC-1)', () => {
  it('flag beats env, env beats the default', () => {
    expect(resolveProvider('kite', { HISTORY_PROVIDER: 'angelone' } as any)).toBe('kite');
    expect(resolveProvider(undefined, { HISTORY_PROVIDER: 'KITE' } as any)).toBe('kite');
    expect(resolveProvider(undefined, {} as any)).toBe('angelone');
  });

  it('rejects an unknown provider with 422', () => {
    expect(() => resolveProvider('upstox', {} as any)).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('kite is not configured yet: 409 with a pointer to the spec', async () => {
    await expect(createHistoryFetcher('kite')).rejects.toMatchObject({ status: 409, message: expect.stringContaining('spec 0022') });
  });
});

describe('Angel One AG8004 (spec 0022 AC-2)', () => {
  it('maps AG8004 to a clear, non retryable error', () => {
    const e = angelOneError({ errorcode: 'AG8004', message: 'Invalid API Key' }) as any;
    expect(e.message).toBe(AG8004_MESSAGE);
    expect(e.retryable).toBe(false);
    expect((angelOneError({ errorcode: 'AB1004', message: 'Something' }) as any).retryable).toBeUndefined();
  });

  it('backfill does not retry AG8004 and stops with that message', async () => {
    const fetcher = vi.fn().mockRejectedValue(angelOneError({ errorcode: 'AG8004' }));
    await expect(
      backfill({ db: db(), fetcher, instruments: [...inst], timeframes: ['5m'], today: '2024-01-10', sleepMs: async () => undefined }),
    ).rejects.toThrow(AG8004_MESSAGE);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('unavailable history (spec 0022 AC-4, AC-5)', () => {
  it('a series with nothing stored and nothing returned is reported unavailable, not done', async () => {
    const events: any[] = [];
    await backfill({
      db: db(),
      fetcher: async () => [],
      instruments: [...inst],
      timeframes: ['5m'],
      today: '2015-02-10',
      provider: 'kite' as any,
      sleepMs: async () => undefined,
      onEvent: (e) => events.push(e),
    });
    expect(events.at(-1)).toEqual({ type: 'unavailable', symbol: 'NIFTY', timeframe: '5m', provider: 'kite' });
  });

  it('the gate judges on the symbols that have data, and never passes on none', () => {
    const ok = { ok: true, reasons: [], fullYears: 3, positiveYears: 3 };
    const judged = judgedSymbols(['NIFTY', 'SENSEX'], ['SENSEX']);
    expect(judged).toEqual(['NIFTY']);
    expect(ruleGate({ NIFTY: ok }, judged)).toBe(true);
    expect(ruleGate({ NIFTY: ok }, ['NIFTY', 'SENSEX'])).toBe(false);
    expect(ruleGate({}, judgedSymbols(['NIFTY', 'SENSEX'], ['NIFTY', 'SENSEX']))).toBe(false);
  });
});
