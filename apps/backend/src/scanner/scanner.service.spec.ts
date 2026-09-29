import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScannerService } from './scanner.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';

// Mock the provider to avoid actual connections
vi.mock('./market-data/AngelOneMarketDataProvider.js', () => {
  return {
    AngelOneMarketDataProvider: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      subscribe: vi.fn(),
      onTick: vi.fn(),
      getHealth: vi.fn().mockReturnValue({ status: 'CONNECTED', reconnectCount: 0 })
    }))
  };
});

describe('ScannerService', () => {
  let service: ScannerService;
  let supabaseMock: any;

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null })
      }
    };
    
    service = new ScannerService(supabaseMock as any);
    // Suppress logs in tests
    vi.spyOn(service['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'error').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});
  });

  it('flushes feed health to supabase (covers AC-6)', async () => {
    // Override the mock to return a specific state
    (AngelOneMarketDataProvider as Mock).mockImplementation(() => ({
      getHealth: vi.fn().mockReturnValue({ status: 'RECONNECTING', reconnectCount: 3 })
    }));
    
    // Mock provider directly on service instance
    (service as any).provider = {
      getHealth: vi.fn().mockReturnValue({ status: 'RECONNECTING', reconnectCount: 3 })
    };
    
    // Call the private flushHealth manually for testing
    await (service as any).flushHealth();
    
    expect(supabaseMock.client.from).toHaveBeenCalledWith('feed_health');
    expect(supabaseMock.client.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'RECONNECTING',
      reconnect_count: 3
    }));
  });

  it('measures day change from the previous close and leaves stocks without one unranked (covers 0009 AC-14)', () => {
    const at = new Date(Date.UTC(2026, 8, 29, 5, 0)); // 10:30 IST
    service.processTick({ instrumentToken: '2885', exchange: 'NSE', symbol: 'RELIANCE', ltp: 102.5, timestamp: at, prevClose: 100, cumulativeVolume: 5000 });
    service.processTick({ instrumentToken: '3045', exchange: 'NSE', symbol: 'SBIN', ltp: 800, timestamp: at });

    const [first, second] = service.getMomentumRanking();
    expect(first).toMatchObject({ symbol: 'RELIANCE', dayChangePct: 2.5, ranked: true, volume: 5000 });
    expect(second).toMatchObject({ symbol: 'SBIN', ranked: false, momentumScore: 0 });
  });

  it('drops ticks for tokens outside today\'s universe (covers 0009 AC-12)', () => {
    (service as any).universe = { resolveSymbol: (t: string) => (t === '2885' ? 'RELIANCE' : undefined) };
    const at = new Date(Date.UTC(2026, 8, 29, 5, 0));
    service.processTick({ instrumentToken: '9999', exchange: 'NSE', symbol: 'UNKNOWN_9999', ltp: 10, timestamp: at });
    service.processTick({ instrumentToken: '2885', exchange: 'NSE', symbol: 'RELIANCE', ltp: 100, timestamp: at });
    expect([...service.latestTicks.keys()]).toEqual(['RELIANCE']);
  });

  it('merges backfilled candles under live ones by start time (covers 0009 AC-15)', () => {
    const candle = (min: number, close: number) => ({
      symbol: 'SBIN', instrumentToken: '3045', timeframe: '1m' as const, open: close, high: close, low: close, close, volume: 1,
      startTime: new Date(Date.UTC(2026, 8, 29, 3, 45 + min)), endTime: new Date(Date.UTC(2026, 8, 29, 3, 46 + min)), isComplete: true
    });
    // A live candle for minute 2 arrived while the stock was warming.
    (service as any).history1m.set('SBIN', [(service as any).mapCandleForStrategy(candle(2, 999))]);

    service.seedHistory('SBIN', [candle(0, 10), candle(1, 11), candle(2, 12)], []);

    expect((service as any).history1m.get('SBIN').map((c: any) => c.close)).toEqual([10, 11, 999]);
  });

  it('upserts candles on symbol, timeframe and start time (covers 0009 AC-15)', async () => {
    supabaseMock.client.upsert = vi.fn().mockResolvedValue({ error: null });
    await service.persistCandle({
      symbol: 'SBIN', instrumentToken: '3045', timeframe: '1m', open: 1, high: 1, low: 1, close: 1, volume: 1,
      startTime: new Date(), endTime: new Date(), isComplete: true
    });
    expect(supabaseMock.client.upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'symbol,timeframe,start_time' });
  });

  it('tracks approaching setups and pushes coalesced updates (covers 0009 AC-2, AC-4)', async () => {
    vi.useFakeTimers();
    const events: any[] = [];
    service.events$.subscribe(e => events.push(e));

    const hist = Array.from({ length: 30 }, (_, i) => ({
      symbol: 'RELIANCE', timestamp: new Date(Date.UTC(2026, 8, 29, 4, i)).toISOString(),
      open: 100, high: 102, low: 98, close: i === 29 ? 99.5 : 100, volume: 1000,
    }));
    (service as any).history1m.set('RELIANCE', hist);
    service.latestTicks.set('RELIANCE', { symbol: 'RELIANCE', ltp: 99.5, timestamp: new Date(), dayOpen: 98, volume: 5000, change1dPct: 1.53, prevClose: 98 });

    service.updateApproaching('RELIANCE');
    (service as any).schedulePush();
    (service as any).schedulePush();
    await vi.advanceTimersByTimeAsync(1000);
    vi.useRealTimers();

    const [setup] = service.getApproachingSetups();
    expect(setup.symbol).toBe('RELIANCE');
    expect(setup.dayChangePct).toBe(1.53);
    expect(setup.strategies.map(s => s.setupFamily)).toContain('VWAP_TREND');
    expect(events.map(e => e.type)).toEqual(['approaching:update', 'momentum:update']);
    expect(events[1].data).toMatchObject({ watching: 1, stocks: [{ symbol: 'RELIANCE', trend: 'UNKNOWN', momentumScore: 0.77 }] });

    // Nothing within range any more (too little history to evaluate) drops the setup.
    (service as any).history1m.set('RELIANCE', hist.slice(0, 10));
    service.updateApproaching('RELIANCE');
    expect(service.getApproachingSetups()).toEqual([]);
  });

  // --- spec 0009 steps 19 to 22, spec 0010 ---

  const IST = (hh: number, mm: number) => new Date(Date.UTC(2026, 8, 29, hh, mm) - 330 * 60_000);
  const setTick = (symbol: string, ltp: number, change1dPct: number, at = IST(10, 30)) =>
    service.latestTicks.set(symbol, { symbol, ltp, timestamp: at, dayOpen: ltp, volume: 0, change1dPct, prevClose: 100 });

  function signalsClient(extra: Record<string, any> = {}) {
    const inserted: any[] = [];
    const chain: any = {};
    chain.insert = vi.fn((row: any) => { inserted.push(row); return chain; });
    chain.select = vi.fn(() => chain);
    chain.single = vi.fn(async () => ({ data: { id: `sig-${inserted.length}`, ...inserted[inserted.length - 1] }, error: null }));
    supabaseMock.client = {
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      ...extra
    };
    return { inserted, chain };
  }

  function vwapCrossHistory() {
    // 30 flat 1m candles from 09:40 IST, the last one crossing above VWAP (the engine's VWAP_TREND trigger).
    const hist1m = Array.from({ length: 30 }, (_, i) => ({
      symbol: 'RELIANCE', timestamp: new Date(IST(9, 40).getTime() + i * 60_000).toISOString(),
      open: 100, high: 102, low: 98, close: i === 28 ? 99 : i === 29 ? 102 : 100, volume: 1000,
    }));
    const hist5m = [{ ...hist1m[25], timestamp: new Date(IST(10, 5).getTime()).toISOString() }];
    (service as any).history1m.set('RELIANCE', hist1m);
    (service as any).history5m.set('RELIANCE', hist5m);
  }

  it('saves an engine trigger as a valid signal row and tracks its plan (covers the insert fix, 0010 AC-1)', async () => {
    const { inserted } = signalsClient();
    vwapCrossHistory();
    setTick('RELIANCE', 102, 2);

    await (service as any).evaluateStrategy('RELIANCE');

    const vwap = inserted.find(r => r.setup_family === 'VWAP_TREND');
    expect(vwap).toMatchObject({ direction: 'LONG', status: 'ACTIVE' });
    expect(typeof vwap.target_1).toBe('number');
    expect(vwap.snapshot_json.reference_entry).toBe(102);
    expect(typeof vwap.snapshot_json.stop.level).toBe('number');
    expect(service.planBook.has('RELIANCE', 'VWAP_TREND')).toBe(true);
  });

  it('opens one plan per stock and strategy, only for top 20 gainers, and none from 15:15 (covers 0009 AC-16, 0010 AC-3, AC-4)', async () => {
    const { inserted } = signalsClient();
    vwapCrossHistory();
    setTick('RELIANCE', 102, 2);

    await (service as any).evaluateStrategy('RELIANCE');
    const firstCount = inserted.length;
    (service as any).topGainers = null;
    await (service as any).evaluateStrategy('RELIANCE');
    expect(inserted.length).toBe(firstCount); // every strategy already has an open plan

    // Outside the top 20: 20 stronger gainers push RELIANCE to rank 21.
    service.planBook.clear();
    (service as any).topGainers = null;
    for (let i = 0; i < 20; i++) setTick(`S${String(i).padStart(2, '0')}`, 100, 5 + i);
    await (service as any).evaluateStrategy('RELIANCE');
    expect(inserted.length).toBe(firstCount);

    // At 15:15 no plan opens even for a top gainer.
    for (let i = 0; i < 20; i++) service.latestTicks.delete(`S${String(i).padStart(2, '0')}`);
    (service as any).topGainers = null;
    const late = (service as any).history1m.get('RELIANCE').map((c: any, i: number) => ({ ...c, timestamp: new Date(IST(14, 45).getTime() + i * 60_000).toISOString() }));
    (service as any).history1m.set('RELIANCE', late);
    await (service as any).evaluateStrategy('RELIANCE');
    expect(inserted.length).toBe(firstCount);
  });

  it('breaks top 20 ties by symbol', () => {
    for (let i = 0; i < 21; i++) setTick(`S${String(i).padStart(2, '0')}`, 100, 3);
    expect(service.isTopGainer('S19', 'bucket-1')).toBe(true);
    expect(service.isTopGainer('S20', 'bucket-1')).toBe(false);
  });

  it('closes a plan on the tick that reaches its target, once, and alerts (covers 0010 AC-2, AC-5, AC-6)', async () => {
    signalsClient();
    const events: any[] = [];
    service.events$.subscribe(e => events.push(e));
    service.planBook.reserve({ signalId: 'sig-7', symbol: 'RELIANCE', setup: 'VWAP_TREND', direction: 'LONG', entry: 100, stop: 99, target: 102, firedAt: IST(10, 0).toISOString() });

    const tick = (ltp: number) => ({ instrumentToken: '2885', exchange: 'NSE' as const, symbol: 'RELIANCE', ltp, timestamp: IST(10, 30), prevClose: 100 });
    service.processTick(tick(100.5));
    service.processTick(tick(102.1));
    service.processTick(tick(102.5));
    await new Promise(r => setTimeout(r, 0));

    expect(supabaseMock.client.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.client.rpc).toHaveBeenCalledWith('close_signal_plan', expect.objectContaining({ p_signal_id: 'sig-7', p_to_status: 'TARGET_HIT', p_exit_price: 102.1, p_exit_reason: 'TARGET' }));
    const exits = events.filter(e => e.type === 'signal:exit');
    expect(exits).toHaveLength(1);
    expect(exits[0].data).toMatchObject({ id: 'sig-7', reason: 'TARGET', exitPrice: 102.1, pnlPct: 2.1 });
    expect(service.planBook.all()).toEqual([]);
  });

  it('never closes a plan on a bad tick or after 15:15 (covers 0010 AC-2)', () => {
    signalsClient();
    service.planBook.reserve({ signalId: 'sig-8', symbol: 'RELIANCE', setup: 'VWAP_TREND', direction: 'LONG', entry: 100, stop: 99, target: 102, firedAt: IST(10, 0).toISOString() });
    service.processTick({ instrumentToken: '2885', exchange: 'NSE', symbol: 'RELIANCE', ltp: 0, timestamp: IST(10, 30) });
    service.processTick({ instrumentToken: '2885', exchange: 'NSE', symbol: 'RELIANCE', ltp: 90, timestamp: IST(15, 20) });
    expect(supabaseMock.client.rpc).not.toHaveBeenCalled();
    expect(service.planBook.all()).toHaveLength(1);
  });

  it('closes every open plan at 15:15 at its last price (covers 0010 AC-3)', async () => {
    signalsClient();
    setTick('RELIANCE', 101.2, 1.2, new Date());
    service.planBook.reserve({ signalId: 'sig-9', symbol: 'RELIANCE', setup: 'VWAP_TREND', direction: 'LONG', entry: 100, stop: 99, target: 102, firedAt: IST(10, 0).toISOString() });

    await service.handleTimeExit(IST(15, 15));

    expect(supabaseMock.client.rpc).toHaveBeenCalledWith('close_signal_plan', expect.objectContaining({ p_signal_id: 'sig-9', p_to_status: 'TIME_EXIT', p_exit_price: 101.2 }));
    expect(service.planBook.all()).toEqual([]);
  });

  it("on startup closes stale plans, and reloads today's open plans for tracking (covers 0010 AC-7)", async () => {
    const row = (id: string, createdAt: Date) => ({
      id, status: 'ACTIVE', direction: 'LONG', setup_family: 'VWAP_TREND', target_1: 102, created_at: createdAt.toISOString(),
      snapshot_json: { symbol: 'RELIANCE', reference_entry: 100, stop: { level: 99 } }
    });
    const rows = [row('old', new Date(IST(10, 0).getTime() - 24 * 3600_000)), row('today', IST(10, 0))];
    const q: any = { select: vi.fn(() => q), eq: vi.fn(() => q), lt: vi.fn(async () => ({ data: rows, error: null })) };
    supabaseMock.client = { from: vi.fn(() => q), rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };

    await service.catchUpPlans(IST(11, 0));

    expect(supabaseMock.client.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.client.rpc).toHaveBeenCalledWith('close_signal_plan', expect.objectContaining({ p_signal_id: 'old', p_to_status: 'TIME_EXIT', p_exit_price: 100 }));
    expect(service.planBook.all().map(p => p.signalId)).toEqual(['today']);
  });

  it('on a restart after 15:15 closes today\'s open plans as a time exit at the last saved close (covers 0010 AC-7)', async () => {
    const today = {
      id: 'today', status: 'ACTIVE', direction: 'LONG', setup_family: 'VWAP_TREND', target_1: 102, created_at: IST(10, 0).toISOString(),
      snapshot_json: { symbol: 'RELIANCE', reference_entry: 100, stop: { level: 99 } }
    };
    const signalsQ: any = { select: vi.fn(() => signalsQ), eq: vi.fn(() => signalsQ), lt: vi.fn(async () => ({ data: [today], error: null })) };
    const candlesQ: any = { select: vi.fn(() => candlesQ), eq: vi.fn(() => candlesQ), order: vi.fn(() => candlesQ), limit: vi.fn(async () => ({ data: [{ close: '101.4' }] })) };
    supabaseMock.client = { from: vi.fn((t: string) => (t === 'candles' ? candlesQ : signalsQ)), rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };

    await service.catchUpPlans(IST(15, 20));

    expect(supabaseMock.client.rpc).toHaveBeenCalledWith('close_signal_plan', expect.objectContaining({ p_signal_id: 'today', p_to_status: 'TIME_EXIT', p_exit_price: 101.4 }));
    expect(service.planBook.all()).toEqual([]);
  });

  it('skips an open plan whose snapshot is incomplete instead of guessing its levels (covers 0010 AC-7)', async () => {
    const broken = { id: 'broken', status: 'ACTIVE', direction: 'LONG', setup_family: 'VWAP_TREND', target_1: null, created_at: IST(10, 0).toISOString(), snapshot_json: {} };
    const q: any = { select: vi.fn(() => q), eq: vi.fn(() => q), lt: vi.fn(async () => ({ data: [broken], error: null })) };
    supabaseMock.client = { from: vi.fn(() => q), rpc: vi.fn() };

    await service.catchUpPlans(IST(11, 0));

    expect(service.planBook.all()).toEqual([]);
    expect(supabaseMock.client.rpc).not.toHaveBeenCalled();
  });

  it('time exits at the last candle close, marked stale, when no tick is known (covers 0010 AC-3)', async () => {
    signalsClient();
    const events: any[] = [];
    service.events$.subscribe(e => events.push(e));
    (service as any).history1m.set('SBIN', [{ timestamp: IST(15, 10).toISOString(), close: 812.4 }]);
    service.planBook.reserve({ signalId: 'sig-s', symbol: 'SBIN', setup: 'VWAP_TREND', direction: 'LONG', entry: 800, stop: 790, target: 820, firedAt: IST(11, 0).toISOString() });

    await service.handleTimeExit(IST(15, 15));

    expect(supabaseMock.client.rpc).toHaveBeenCalledWith('close_signal_plan', expect.objectContaining({ p_exit_price: 812.4, p_exit_reason: 'TIME' }));
    expect(events.find(e => e.type === 'signal:exit').data).toMatchObject({ reason: 'TIME', stale: true, pnlPct: 1.55 });
  });

  it('batches candle writes, keeping the latest per minute and re-queuing on failure (covers 0009 AC-15)', async () => {
    const upsert = vi.fn().mockResolvedValueOnce({ error: { message: 'down' } }).mockResolvedValueOnce({ error: null });
    supabaseMock.client = { from: vi.fn(() => ({ upsert })) };
    const candle = (close: number) => ({
      symbol: 'SBIN', instrumentToken: '3045', timeframe: '1m' as const, open: 1, high: 1, low: 1, close, volume: 1,
      startTime: IST(10, 0), endTime: IST(10, 1), isComplete: true
    });

    service.queueCandle(candle(1));
    service.queueCandle(candle(2)); // same minute: replaces the first
    await service.flushCandles(); // fails, re-queued
    await service.flushCandles(); // succeeds

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[1][0]).toHaveLength(1);
    expect(upsert.mock.calls[1][0][0].close).toBe(2);
  });
});

