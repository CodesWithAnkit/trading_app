import { Test, TestingModule } from '@nestjs/testing';
import { SignalsController } from './signals.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Subject } from 'rxjs';
import { RiskService } from '../risk/risk.service.js';

const USER = { id: 'user-1', email: null, exp: Math.floor(Date.now() / 1000) + 3600 } as any;
const riskServiceMock = {
  changes$: new Subject<{ userId: string }>(),
  contextFor: vi.fn().mockResolvedValue({ limits: { riskPerTrade: 1500, dailyLossLimit: 6000, maxOpenTrades: 3, maxCapitalPerTrade: 50000 }, realizedLossToday: 0, openRisk: 0, openCount: 0, dailyRoom: 6000 }),
  withRisk: (signals: any[]) => signals,
  notify: vi.fn(),
};


describe('SignalsController', () => {
  let controller: SignalsController;
  let mockSupabaseService: Partial<SupabaseService>;
  
  const mockQueryBuilder = {
    eq: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };
  
  const mockSelect = vi.fn().mockReturnValue(mockQueryBuilder);
  
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  beforeEach(async () => {
    mockSelect.mockClear();
    mockQueryBuilder.eq.mockReset();
    mockQueryBuilder.single.mockReset();
    mockFrom.mockClear();

    mockQueryBuilder.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

    mockSupabaseService = {
      client: {
        from: mockFrom,
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignalsController],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: RiskService, useValue: riskServiceMock },
      ],
    }).compile();

    controller = module.get<SignalsController>(SignalsController);
  });

  describe('getSignals', () => {
    it('returns empty array if no signals', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: [], error: null }));
      const result = await controller.getSignals(USER);
      expect(mockFrom).toHaveBeenCalledWith('signals');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('filters by status if provided', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: [{ id: '1', status: 'ACTIVE' }], error: null }));
      const result = await controller.getSignals(USER, 'ACTIVE');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'ACTIVE');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('throws 500 on db error', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: null, error: { message: 'db error' } }));
      await expect(controller.getSignals(USER)).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.getSignals(USER)).rejects.toThrow(HttpException);
    });
  });

  describe('getSignalById', () => {
    it('returns single signal', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'test-1' }, error: null });
      const result = await controller.getSignalById(USER, 'test-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'test-1');
      // spec 0028 AC-6: the caller's verdict is attached; a row with no stop is skipped.
      expect(result).toMatchObject({ id: 'test-1', risk: { verdict: 'SKIP', skipReason: 'STOP_INVALID' } });
      expect(riskServiceMock.contextFor).toHaveBeenCalledWith('user-1');
    });

    it('throws 404 on db error', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      await expect(controller.getSignalById(USER, 'test-1')).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.getSignalById(USER, 'test-1')).rejects.toThrow(HttpException);
    });
  });
});
