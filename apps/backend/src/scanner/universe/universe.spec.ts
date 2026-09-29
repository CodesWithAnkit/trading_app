import { describe, it, expect, vi } from 'vitest';
import { extractGainerSymbols, parseUnderlying, pickEquityToken } from './gainers.js';
import { buildBackfill } from './backfill.js';
import { isInRefreshWindow, isIstWeekday, nextRefreshAt } from './schedule.js';
import { UniverseService } from './UniverseService.js';

const ist = (hh: number, mm: number, ss = 0) => new Date(Date.UTC(2026, 8, 29, hh, mm, ss) - 330 * 60_000);

describe('gainers mapping (0009 AC-12, AC-13)', () => {
  it('parses the underlying of dated futures only', () => {
    expect(parseUnderlying('RELIANCE28OCT26FUT')).toBe('RELIANCE');
    expect(parseUnderlying('M&M28OCT26FUT')).toBe('M&M');
    expect(parseUnderlying('BAJAJ-AUTO28OCT26FUT')).toBe('BAJAJ-AUTO');
    expect(parseUnderlying('RELIANCE28OCT261400CE')).toBeNull();
    expect(parseUnderlying('garbage')).toBeNull();
  });

  it('dedupes by underlying and drops indices and malformed rows', () => {
    const rows = ['RELIANCE28OCT26FUT', 'RELIANCE25NOV26FUT', 'M&M28OCT26FUT', 'NIFTY28OCT26FUT', 'BANKNIFTY28OCT26FUT', 'oops']
      .map(tradingSymbol => ({ tradingSymbol }));
    expect(extractGainerSymbols(rows)).toEqual({ symbols: ['RELIANCE', 'M&M'], skipped: ['oops'] });
  });

  it('accepts only a single exact NSE -EQ match', () => {
    const results = [
      { exchange: 'NSE', tradingsymbol: 'M&MFIN-EQ', symboltoken: '13285' },
      { exchange: 'NSE', tradingsymbol: 'M&M-EQ', symboltoken: '2031' },
      { exchange: 'BSE', tradingsymbol: 'M&M-EQ', symboltoken: '500520' },
    ];
    expect(pickEquityToken(results, 'M&M')).toBe('2031');
    expect(pickEquityToken([], 'M&M')).toBeNull();
    expect(pickEquityToken([results[1], { ...results[1], symboltoken: '9999' }], 'M&M')).toBeNull();
  });
});

describe('buildBackfill (0009 AC-15)', () => {
  const row = (hh: number, mm: number, close: number) => ({ startTime: ist(hh, mm), open: close, high: close + 1, low: close - 1, close, volume: 100 });

  it('keeps completed minutes and builds 5m candles from fully elapsed windows only', () => {
    const rows = [9, 10, 11, 12, 13, 14, 15, 16, 17].map((m, i) => row(9, 15 + i, 100 + i)).slice(0, 7); // 09:15 to 09:21
    const now = ist(9, 21, 30); // 09:21 is still forming

    const { oneMinute, fiveMinute } = buildBackfill('RELIANCE', '2885', rows, now);

    expect(oneMinute).toHaveLength(6); // 09:15 to 09:20
    expect(fiveMinute).toHaveLength(1); // 09:15 to 09:20 window only; 09:20 window is still open
    expect(fiveMinute[0]).toMatchObject({ open: 100, close: 104, high: 105, low: 99, volume: 500, timeframe: '5m' });
  });
});

describe('refresh schedule (0009 AC-12)', () => {
  it('runs 09:22 to 15:22 IST', () => {
    expect(isInRefreshWindow(ist(9, 21))).toBe(false);
    expect(isInRefreshWindow(ist(9, 22))).toBe(true);
    expect(isInRefreshWindow(ist(15, 22))).toBe(true);
    expect(isInRefreshWindow(ist(15, 23))).toBe(false);
  });

  it('finds the next slot, none after the last', () => {
    expect(nextRefreshAt(ist(9, 0))?.getTime()).toBe(ist(9, 22).getTime());
    expect(nextRefreshAt(ist(9, 22, 5))?.getTime()).toBe(ist(9, 37).getTime());
    expect(nextRefreshAt(ist(15, 22, 5))).toBeNull();
  });

  it('knows IST weekdays', () => {
    expect(isIstWeekday(ist(10, 0))).toBe(true); // Tue 29 Sep 2026
    expect(isIstWeekday(new Date(Date.UTC(2026, 9, 3, 6)))).toBe(false); // Sat
  });
});

describe('UniverseService (0009 AC-12, AC-13)', () => {
  function setup(opts: { gainers?: string[]; cached?: Record<string, string>; today?: { symbol: string; instrument_token: string }[] } = {}) {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client: any = {
      from: vi.fn(() => {
        const q: any = { filters: {} as Record<string, string> };
        q.select = vi.fn(() => q);
        q.eq = vi.fn((col: string, val: string) => {
          q.filters[col] = val;
          if (col === 'last_selected_on') return Promise.resolve({ data: opts.today ?? [], error: null });
          return q;
        });
        q.limit = vi.fn(() => {
          const token = opts.cached?.[q.filters.symbol];
          return Promise.resolve({ data: token ? [{ instrument_token: token }] : [], error: null });
        });
        q.upsert = upsert;
        return q;
      }),
    };
    const rest = {
      fetchFnoPriceGainers: vi.fn().mockResolvedValue((opts.gainers ?? []).map(tradingSymbol => ({ tradingSymbol }))),
      searchScrip: vi.fn(async (symbol: string) => [{ exchange: 'NSE', tradingsymbol: `${symbol}-EQ`, symboltoken: `T_${symbol}` }]),
      getCandles1m: vi.fn(),
    };
    const subscribe = vi.fn().mockResolvedValue(undefined);
    const onAdded = vi.fn().mockResolvedValue(undefined);
    const service = new UniverseService({ client, rest, subscribe, onAdded });
    vi.spyOn(service['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    return { service, rest, subscribe, onAdded, upsert };
  }

  it('adds new gainers, stamps every returned stock, and never drops one', async () => {
    const { service, rest, subscribe, onAdded, upsert } = setup({ gainers: ['RELIANCE28OCT26FUT', 'SBIN28OCT26FUT'], cached: { RELIANCE: '2885' } });

    await service.refresh('2026-09-29');
    expect(rest.searchScrip).toHaveBeenCalledTimes(1); // RELIANCE came from the cache
    expect(subscribe).toHaveBeenCalledWith(['2885', 'T_SBIN']);
    expect(onAdded).toHaveBeenCalledWith([{ symbol: 'RELIANCE', token: '2885' }, { symbol: 'SBIN', token: 'T_SBIN' }]);
    expect(upsert.mock.calls[0][0]).toEqual([
      { symbol: 'RELIANCE', exchange: 'NSE', instrument_token: '2885', status: 'ACTIVE', last_selected_on: '2026-09-29' },
      { symbol: 'SBIN', exchange: 'NSE', instrument_token: 'T_SBIN', status: 'ACTIVE', last_selected_on: '2026-09-29' },
    ]);

    // Next slot returns fewer stocks: nothing is dropped, only the known one is stamped again.
    rest.fetchFnoPriceGainers.mockResolvedValue([{ tradingSymbol: 'SBIN28OCT26FUT' }]);
    const second = await service.refresh('2026-09-29');
    expect(second?.added).toEqual([]);
    expect(service.watching().map(s => s.symbol)).toEqual(['RELIANCE', 'SBIN']);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('treats an empty pull as a failure: nothing stamped, error recorded', async () => {
    const { service, upsert } = setup({ gainers: [] });
    await expect(service.refresh('2026-09-29')).rejects.toThrow('empty');
    expect(upsert).not.toHaveBeenCalled();
    expect(service.getStatus().lastRefreshError).toMatch(/empty/);
  });

  it('skips a symbol without a single exact match and does not search it again that day', async () => {
    const { service, rest } = setup({ gainers: ['WEIRD28OCT26FUT'] });
    rest.searchScrip.mockResolvedValue([]);
    await service.refresh('2026-09-29');
    await service.refresh('2026-09-29');
    expect(rest.searchScrip).toHaveBeenCalledTimes(1);
    expect(service.watching()).toEqual([]);
  });

  it('restores today rows after a restart and resolves their tokens', async () => {
    const { service, subscribe } = setup({ today: [{ symbol: 'SBIN', instrument_token: '3045' }] });
    await service.restoreToday('2026-09-29');
    expect(subscribe).toHaveBeenCalledWith(['3045']);
    expect(service.resolveSymbol('3045')).toBe('SBIN');
  });

  it('skips a refresh while another is running', async () => {
    const { service, rest } = setup({ gainers: ['SBIN28OCT26FUT'] });
    let release!: () => void;
    rest.fetchFnoPriceGainers.mockReturnValueOnce(new Promise(r => { release = () => r([{ tradingSymbol: 'SBIN28OCT26FUT' }]); }));
    const first = service.refresh('2026-09-29');
    expect(await service.refresh('2026-09-29')).toBeNull();
    release();
    await first;
  });
});
