import { describe, it, expect, vi } from 'vitest';
import { parseFnoStocks, downloadFnoStocks, InstrumentRow } from './instrumentFile.js';
import { buildBackfill } from './backfill.js';
import { isAtOrAfterTimeExit, isInExitWindow, isIstWeekday } from './schedule.js';
import { UniverseService } from './UniverseService.js';

const ist = (hh: number, mm: number, ss = 0) => new Date(Date.UTC(2026, 8, 29, hh, mm, ss) - 330 * 60_000);

const FILE: InstrumentRow[] = [
  { token: '99926000', symbol: 'Nifty 50', name: 'NIFTY', exch_seg: 'NSE', instrumenttype: 'AMXIDX' },
  { token: '35001', symbol: 'NIFTY28OCT26FUT', name: 'NIFTY', exch_seg: 'NFO', instrumenttype: 'FUTIDX' },
  { token: '35002', symbol: 'RELIANCE28OCT26FUT', name: 'RELIANCE', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35003', symbol: 'RELIANCE25NOV26FUT', name: 'RELIANCE', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35004', symbol: 'M&M28OCT26FUT', name: 'M&M', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35005', symbol: 'BAJAJ-AUTO28OCT26FUT', name: 'BAJAJ-AUTO', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35006', symbol: 'ONLYBE28OCT26FUT', name: 'ONLYBE', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35007', symbol: 'TWOEQ28OCT26FUT', name: 'TWOEQ', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
  { token: '35008', symbol: 'RELIANCE28OCT261400CE', name: 'RELIANCE', exch_seg: 'NFO', instrumenttype: 'OPTSTK' },
  { token: '2885', symbol: 'RELIANCE-EQ', name: 'RELIANCE', exch_seg: 'NSE', instrumenttype: '' },
  { token: '2031', symbol: 'M&M-EQ', name: 'M&M', exch_seg: 'NSE', instrumenttype: '' },
  { token: '16669', symbol: 'BAJAJ-AUTO-EQ', name: 'BAJAJ-AUTO', exch_seg: 'NSE', instrumenttype: '' },
  { token: '500520', symbol: 'M&M-EQ', name: 'M&M', exch_seg: 'BSE', instrumenttype: '' },
  { token: '7001', symbol: 'ONLYBE-BE', name: 'ONLYBE', exch_seg: 'NSE', instrumenttype: '' },
  { token: '7002', symbol: 'TWOEQ-EQ', name: 'TWOEQ', exch_seg: 'NSE', instrumenttype: '' },
  { token: '7003', symbol: 'TWOEQ-EQ', name: 'TWOEQ', exch_seg: 'NSE', instrumenttype: '' },
];

describe('instrument file (0009 AC-12, AC-13)', () => {
  it('keeps stock futures with exactly one NSE -EQ token, skipping index futures, options and ambiguous names', () => {
    expect(parseFnoStocks(FILE)).toEqual({
      stocks: [
        { symbol: 'BAJAJ-AUTO', token: '16669' },
        { symbol: 'M&M', token: '2031' },
        { symbol: 'RELIANCE', token: '2885' },
      ],
      skipped: ['ONLYBE', 'TWOEQ'],
      nse: ['TWOEQ'],
    });
  });

  it('leaves out NSE test instruments, which are not real stocks (spec 0009 AC-12: every NSE stock with a stock future)', () => {
    // Angel's file lists exchange test symbols (011NSETEST … 181NSETEST) as stock futures with -EQ rows.
    const withTestSymbols: InstrumentRow[] = [
      ...FILE,
      { token: '36001', symbol: '011NSETEST28OCT26FUT', name: '011NSETEST', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
      { token: '11', symbol: '011NSETEST-EQ', name: '011NSETEST', exch_seg: 'NSE', instrumenttype: '' },
    ];
    expect(parseFnoStocks(withTestSymbols).stocks.map(s => s.symbol)).not.toContain('011NSETEST');
  });

  it('keeps a real stock whose name starts with a digit, like 360ONE', () => {
    const withDigitName: InstrumentRow[] = [
      ...FILE,
      { token: '36002', symbol: '360ONE28OCT26FUT', name: '360ONE', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
      { token: '13061', symbol: '360ONE-EQ', name: '360ONE', exch_seg: 'NSE', instrumenttype: '' },
      { token: '36001', symbol: '181NSETEST28OCT26FUT', name: '181NSETEST', exch_seg: 'NFO', instrumenttype: 'FUTSTK' },
      { token: '18', symbol: '181NSETEST-EQ', name: '181NSETEST', exch_seg: 'NSE', instrumenttype: '' },
    ];
    const symbols = parseFnoStocks(withDigitName).stocks.map(s => s.symbol);
    expect(symbols).toContain('360ONE');
    expect(symbols).not.toContain('181NSETEST');
    expect(symbols).toHaveLength(4); // BAJAJ-AUTO, M&M, RELIANCE, 360ONE
  });

  it('retries once, then reports the failure', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ ok: true, json: async () => FILE });
    expect((await downloadFnoStocks(fetchImpl as any)).stocks).toHaveLength(3);

    const failing = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(downloadFnoStocks(failing as any)).rejects.toThrow('HTTP 503');
    expect(failing).toHaveBeenCalledTimes(2);
  });
});

describe('buildBackfill (0009 AC-15)', () => {
  const row = (hh: number, mm: number, close: number) => ({ startTime: ist(hh, mm), open: close, high: close + 1, low: close - 1, close, volume: 100 });

  it('keeps completed minutes and builds 5m candles only from full, elapsed windows', () => {
    const rows = [0, 1, 2, 3, 4, 5, 6].map(i => row(9, 15 + i, 100 + i)); // 09:15 to 09:21
    const now = ist(9, 21, 30); // 09:21 is still forming

    const { oneMinute, fiveMinute } = buildBackfill('RELIANCE', '2885', rows, now);

    expect(oneMinute).toHaveLength(6);
    expect(fiveMinute).toHaveLength(1);
    expect(fiveMinute[0]).toMatchObject({ open: 100, close: 104, high: 105, low: 99, volume: 500, timeframe: '5m' });
  });

  it('skips a 5m window with a missing minute', () => {
    const rows = [0, 1, 3, 4].map(i => row(9, 15 + i, 100)); // 09:17 missing
    expect(buildBackfill('RELIANCE', '2885', rows, ist(9, 30)).fiveMinute).toEqual([]);
  });
});

describe('session times (0010 AC-2, AC-3)', () => {
  it('knows the exit window and the 15:15 cutoff', () => {
    expect(isInExitWindow(ist(9, 14))).toBe(false);
    expect(isInExitWindow(ist(9, 15))).toBe(true);
    expect(isInExitWindow(ist(15, 14, 59))).toBe(true);
    expect(isInExitWindow(ist(15, 15))).toBe(false);
    expect(isAtOrAfterTimeExit(ist(15, 14, 59))).toBe(false);
    expect(isAtOrAfterTimeExit(ist(15, 15))).toBe(true);
  });

  it('knows IST weekdays', () => {
    expect(isIstWeekday(ist(10, 0))).toBe(true); // Tue 29 Sep 2026
    expect(isIstWeekday(new Date(Date.UTC(2026, 9, 3, 6)))).toBe(false); // Sat
  });
});

describe('UniverseService (0009 AC-12, AC-13)', () => {
  function setup(opts: { download?: () => Promise<any>; saved?: { symbol: string; instrument_token: string }[]; savedDay?: string } = {}) {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client: any = {
      from: vi.fn(() => {
        const q: any = {};
        q.select = vi.fn(() => q);
        q.not = vi.fn(() => q);
        q.order = vi.fn(() => q);
        q.limit = vi.fn(() => Promise.resolve({ data: opts.savedDay ? [{ last_selected_on: opts.savedDay }] : [], error: null }));
        q.eq = vi.fn(() => Promise.resolve({ data: opts.saved ?? [], error: null }));
        q.upsert = upsert;
        return q;
      }),
    };
    const subscribe = vi.fn().mockResolvedValue(undefined);
    const onAdded = vi.fn().mockResolvedValue(undefined);
    const service = new UniverseService({
      client,
      download: opts.download ?? (async () => parseFnoStocks(FILE)),
      subscribe,
      onAdded,
    });
    vi.spyOn(service['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    return { service, subscribe, onAdded, upsert };
  }

  it('saves, registers and subscribes every F&O stock from the file', async () => {
    const { service, subscribe, onAdded, upsert } = setup();

    await service.load('2026-09-29');

    expect(subscribe).toHaveBeenCalledWith(['16669', '2031', '2885']);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0][0]).toEqual({ symbol: 'BAJAJ-AUTO', exchange: 'NSE', instrument_token: '16669', status: 'ACTIVE', last_selected_on: '2026-09-29' });
    expect(service.resolveSymbol('2031')).toBe('M&M');
    expect(service.getStatus()).toMatchObject({ stocks: 3, source: 'file', error: null });
  });

  it('never subscribes a stock twice and shares one run between overlapping loads', async () => {
    const download = vi.fn(async () => parseFnoStocks(FILE));
    const { service, subscribe } = setup({ download });

    await Promise.all([service.load('2026-09-29'), service.load('2026-09-29')]);
    await service.load('2026-09-29');

    expect(download).toHaveBeenCalledTimes(2); // one shared run, then one more
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to the last saved list when the download fails', async () => {
    const { service, subscribe, upsert } = setup({
      download: async () => { throw new Error('Instrument file download failed: HTTP 503'); },
      savedDay: '2026-09-28',
      saved: [{ symbol: 'SBIN', instrument_token: '3045' }],
    });

    await service.load('2026-09-29');

    expect(upsert).not.toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalledWith(['3045']);
    expect(service.getStatus()).toMatchObject({ stocks: 1, source: 'fallback', error: expect.stringMatching(/503/) });
  });

  it('streams nothing and says so when there is no saved list either', async () => {
    const { service, subscribe } = setup({ download: async () => { throw new Error('offline'); } });
    await service.load('2026-09-29');
    expect(subscribe).not.toHaveBeenCalled();
    expect(service.getStatus()).toMatchObject({ stocks: 0, source: 'none', error: 'offline' });
  });
});
