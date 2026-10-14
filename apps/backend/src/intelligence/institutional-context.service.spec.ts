import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InstitutionalContextService } from './institutional-context.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('InstitutionalContextService', () => {
  let service: InstitutionalContextService;
  let mockSupabase: any;

  beforeEach(async () => {
    mockSupabase = {
      client: null,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionalContextService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<InstitutionalContextService>(InstitutionalContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // covers: AC-6, AC-7
  it('returns delayed EOD flows and bulk deals with explicit regulatory disclaimer', async () => {
    const context = await service.getInstitutionalContext();

    expect(context).toBeDefined();
    expect(context.flows).toBeDefined();
    expect(context.flows.reportingPeriod).toBe('PREVIOUS_DAY_EOD');
    expect(context.flows.fiiNetCr).toBeDefined();
    expect(context.flows.diiNetCr).toBeDefined();
    expect(context.recentDeals.length).toBeGreaterThan(0);
    expect(context.disclaimer).toContain('Delayed End of Day regulatory disclosure');
  });

  // covers: AC-6
  it('reads institutional flow records from Supabase when client is connected', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'institutional_flows') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                report_date: '2026-10-14',
                fii_gross_buy: 15000.5,
                fii_gross_sell: 13200.0,
                fii_net: 1800.5,
                dii_gross_buy: 10200.0,
                dii_gross_sell: 9900.0,
                dii_net: 300.0,
                reporting_period: 'PREVIOUS_DAY_EOD',
              },
            ],
          }),
        };
      }
      if (table === 'bulk_block_deals') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'deal-supabase-1',
                deal_date: '2026-10-14',
                deal_time: '14:30:00',
                symbol: 'TATASTEEL',
                client_name: 'TEST INSTITUTION',
                deal_type: 'BLOCK',
                action: 'BUY',
                quantity: 500000,
                price: 158.0,
                value_in_crores: 7.9,
                source: 'NSE',
              },
            ],
          }),
        };
      }
      return {};
    });

    mockSupabase.client = { from: mockFrom };

    const context = await service.getInstitutionalContext();

    expect(context.flows.reportDate).toBe('2026-10-14');
    expect(context.flows.fiiNetCr).toBe(1800.5);
    expect(context.recentDeals[0].clientName).toBe('TEST INSTITUTION');
  });

  // covers: AC-7
  it('records daily flow upsert into Supabase without throwing', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
    mockSupabase.client = { from: mockFrom };

    await service.recordDailyFlow({
      reportDate: '2026-10-14',
      fiiGrossBuyCr: 1000,
      fiiGrossSellCr: 800,
      fiiNetCr: 200,
      diiGrossBuyCr: 500,
      diiGrossSellCr: 600,
      diiNetCr: -100,
      reportingPeriod: 'PREVIOUS_DAY_EOD',
      disclaimer: 'Delayed EOD',
    });

    expect(mockFrom).toHaveBeenCalledWith('institutional_flows');
    expect(mockUpsert).toHaveBeenCalled();
  });
});
