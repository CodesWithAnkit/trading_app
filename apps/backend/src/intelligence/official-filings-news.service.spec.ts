import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('OfficialFilingsAndNewsService', () => {
  let service: OfficialFilingsAndNewsService;
  let mockSupabase: any;

  beforeEach(async () => {
    mockSupabase = {
      client: null,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficialFilingsAndNewsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<OfficialFilingsAndNewsService>(OfficialFilingsAndNewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // covers: AC-3, AC-4
  it('returns corporate filings and news with provenance separation', async () => {
    const res = await service.getNews();

    expect(res).toBeDefined();
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.totalCount).toBe(res.events.length);
    expect(res.officialCount).toBeGreaterThan(0);
    expect(res.highImpactCount).toBeGreaterThan(0);
    expect(res.lastIngestionAt).toBeDefined();

    const officialEvent = res.events.find(e => e.isOfficialFiling);
    expect(officialEvent).toBeDefined();
    expect(officialEvent?.source).toBeDefined();
    expect(officialEvent?.clockSkewMs).toBeGreaterThan(0);
  });

  // covers: AC-3
  it('filters news events by specific stock symbol', async () => {
    const res = await service.getNews('TATASTEEL');

    expect(res).toBeDefined();
    expect(res.events.every(e => e.symbol === 'TATASTEEL')).toBe(true);
    expect(res.events.length).toBeGreaterThanOrEqual(1);
  });

  // covers: AC-4
  it('synthesizes normal trading session notice when symbol has no filings', async () => {
    const res = await service.getNews('UNKNOWNSTOCK');

    expect(res).toBeDefined();
    expect(res.events.length).toBe(1);
    expect(res.events[0].symbol).toBe('UNKNOWNSTOCK');
    expect(res.events[0].direction).toBe('NEUTRAL');
    expect(res.events[0].isOfficialFiling).toBe(true);
    expect(res.events[0].headline).toContain('Maintains Normal Trading Session');
  });

  // covers: AC-4, 0018 AC-9
  it('ingests a new filing into Supabase when connected', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    mockSupabase.client = { from: mockFrom };

    await service.ingestFiling({
      symbol: 'INFOSYS',
      headline: 'Quarterly Earnings Announcement Date Confirmed',
      excerpt: 'Board meeting scheduled for financial results approval.',
      source: 'NSE Corporate Announcement',
      eventType: 'OFFICIAL_FILING',
      impactLevel: 'HIGH',
      direction: 'NEUTRAL',
      confidence: 1.0,
      isOfficialFiling: true,
      extractedKeyTerms: ['Earnings Date', 'Board Meeting'],
    });

    expect(mockFrom).toHaveBeenCalledWith('news_and_events');
    expect(mockInsert).toHaveBeenCalled();
  });
});
