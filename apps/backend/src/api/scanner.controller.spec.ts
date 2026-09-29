import { Test, TestingModule } from '@nestjs/testing';
import { ScannerController } from './scanner.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';
import { Subject, firstValueFrom, take, toArray } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ScannerController', () => {
  let controller: ScannerController;
  let supabaseServiceMock: any;
  let scannerServiceMock: any;

  beforeEach(async () => {
    supabaseServiceMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn()
      }
    };

    scannerServiceMock = {
      latestTicks: new Map([['RELIANCE', {}], ['TCS', {}]]),
      events$: new Subject(),
      getApproachingSetups: vi.fn().mockReturnValue([{ symbol: 'TCS', closestDistancePct: 0.4 }]),
      getApproachingSetup: vi.fn().mockReturnValue(undefined),
      getMomentumRanking: vi.fn().mockReturnValue([{ symbol: 'RELIANCE', momentumScore: 3.2 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScannerController],
      providers: [
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
        { provide: ScannerService, useValue: scannerServiceMock },
      ],
    }).compile();

    controller = module.get<ScannerController>(ScannerController);
  });

  it('returns sorted and formatted setups (covers AC-4, AC-5)', async () => {
    // Mock the DB response
    const mockData = [
      {
        id: '1',
        direction: 'LONG',
        setup_family: 'Breakout',
        status: 'ACTIVE',
        entry_low: 100,
        entry_high: 102,
        target_1: 110,
        created_at: new Date().toISOString(),
        snapshot_json: {
          symbol: 'RELIANCE',
          confidence: 80,
          confidence_band: 'HIGH',
          reference_entry: 101,
          stop: { level: 95 },
          metrics: { relativeVolume: "2x" }
        }
      },
      {
        id: '2',
        direction: 'SHORT',
        setup_family: 'MeanReversion',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        snapshot_json: {
          symbol: 'INFY',
          confidence: 90, // Higher confidence, should be sorted first
          confidence_band: 'HIGH',
          reference_entry: 1500,
          stop: { level: 1550 },
          metrics: { relativeVolume: "1.5x" }
        }
      }
    ];

    supabaseServiceMock.client.gte.mockResolvedValue({ data: mockData, error: null });

    const result = await controller.getTopSetups();

    expect(result.data).toHaveLength(2);
    // Assert sorting by confidence descending
    expect(result.data[0].symbol).toBe('INFY');
    expect(result.data[1].symbol).toBe('RELIANCE');
    
    // Assert formatting mapping
    expect(result.data[0].setup).toBe('MeanReversion');
    expect(result.data[0].confidence).toBe(90);
    expect(result.data[0].entryZone).toEqual({ low: 1499.25, high: 1500.75 }); // Derived from reference_entry * 0.9995 / 1.0005
    expect(result.data[0].stop).toBe(1550);
  });

  it('handles database errors gracefully', async () => {
    supabaseServiceMock.client.gte.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

    await expect(controller.getTopSetups()).rejects.toThrow(HttpException);
    await expect(controller.getTopSetups()).rejects.toThrow('DB Error');
  });

  it('throws when database is not configured', async () => {
    supabaseServiceMock.client = null;
    
    await expect(controller.getTopSetups()).rejects.toThrow(HttpException);
    await expect(controller.getTopSetups()).rejects.toThrow('Database not configured');
  });

  it('lists every open plan first, then closed plans newest exit first, with exit fields (covers 0010 AC-8)', async () => {
    const row = (id: string, status: string, confidence: number, exit?: { at: string; reason: string; price: string }) => ({
      id, direction: 'LONG', setup_family: 'VWAP_TREND', status, created_at: '2026-09-30T04:00:00Z',
      snapshot_json: { symbol: id.toUpperCase(), confidence, reference_entry: 100 },
      exit_at: exit?.at ?? null, exit_reason: exit?.reason ?? null, exit_price: exit?.price ?? null
    });
    supabaseServiceMock.client.gte.mockResolvedValue({
      data: [
        row('closed-early', 'STOP_HIT', 99, { at: '2026-09-30T05:00:00Z', reason: 'STOP', price: '98.9' }),
        row('open-low', 'ACTIVE', 60),
        row('closed-late', 'TARGET_HIT', 99, { at: '2026-09-30T06:00:00Z', reason: 'TARGET', price: '102.1' }),
        row('open-high', 'ACTIVE', 90),
      ],
      error: null
    });

    const result = await controller.getTopSetups();

    expect(result.data.map(s => s.id)).toEqual(['open-high', 'open-low', 'closed-late', 'closed-early']);
    expect(result.data[2]).toMatchObject({ status: 'TARGET_HIT', exitReason: 'TARGET', exitPrice: 102.1, exitAt: '2026-09-30T06:00:00Z' });
    expect(result.data[0]).toMatchObject({ exitPrice: null, exitReason: null, exitAt: null });
  });

  it('never drops an open plan behind closed ones, even past the old 10 row limit (covers 0010 AC-8)', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: `open-${i}`, direction: 'LONG', setup_family: 'VWAP_TREND', status: 'ACTIVE', created_at: '2026-09-30T04:00:00Z',
      snapshot_json: { symbol: `S${i}`, confidence: 50 + i, reference_entry: 100 }
    }));
    supabaseServiceMock.client.gte.mockResolvedValue({ data: rows, error: null });

    const result = await controller.getTopSetups();

    expect(result.data).toHaveLength(12);
  });

  it('includes approaching setups when requested (covers 0009 AC-3)', async () => {
    supabaseServiceMock.client.gte.mockResolvedValue({ data: [], error: null });

    const result: any = await controller.getTopSetups('approaching');

    expect(result.data).toEqual([]);
    expect(result.approaching).toEqual([{ symbol: 'TCS', closestDistancePct: 0.4 }]);
  });

  it('returns momentum ranking with the watched count (covers 0009 AC-1)', () => {
    expect(controller.getMomentum()).toEqual({ watching: 2, data: [{ symbol: 'RELIANCE', momentumScore: 3.2 }] });
  });

  it('streams a snapshot then live scanner events (covers 0009 AC-4)', async () => {
    const received = firstValueFrom(controller.stream().pipe(take(3), toArray()));
    scannerServiceMock.events$.next({ type: 'signal:new', data: { id: 'sig-1' } });

    const events = await received;
    expect(events.map((e: any) => e.type)).toEqual(['approaching:update', 'momentum:update', 'signal:new']);
    expect(events[2].data).toEqual({ id: 'sig-1' });
  });

  it('returns 404 from analysis when a symbol has no signal or approaching setup (covers 0009 AC-5)', async () => {
    supabaseServiceMock.client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    await expect(controller.getAnalysis('reliance')).rejects.toMatchObject({ status: 404 });
    expect(supabaseServiceMock.client.eq).toHaveBeenCalledWith('snapshot_json->>symbol', 'RELIANCE');
  });

  it('summarises outcomes for a day (covers 0009 AC-9, AC-10)', async () => {
    const row = (id: string, outcome_status: string | null) => ({
      id, direction: 'LONG', setup_family: 'VWAP_TREND', status: 'ACTIVE', created_at: '2026-09-29T05:00:00Z',
      snapshot_json: { symbol: 'RELIANCE', reference_entry: 100 }, actual_high: '103', outcome_status,
    });
    supabaseServiceMock.client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [row('a', 'WON'), row('b', 'LOST'), row('c', null)], error: null }),
    };

    const result = await controller.getOutcomes('2026-09-29');

    expect(result.summary).toEqual({ total: 3, winners: 1, losers: 1, neutral: 0, pending: 1 });
    expect(result.data[0].actualHigh).toBe(103);
  });

  it('rejects malformed outcome dates', async () => {
    await expect(controller.getOutcomes('29-09-2026')).rejects.toMatchObject({ status: 400 });
  });
});
