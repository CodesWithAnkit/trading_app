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
    service.latestTicks.set('RELIANCE', { symbol: 'RELIANCE', ltp: 99.5, timestamp: new Date(), dayOpen: 98, volume: 5000, change1dPct: 1.53 });

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
});

