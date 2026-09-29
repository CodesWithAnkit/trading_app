import { Test, TestingModule } from '@nestjs/testing';
import { SignalsController } from './signals.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';

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
      ],
    }).compile();

    controller = module.get<SignalsController>(SignalsController);
  });

  describe('getSignals', () => {
    it('returns empty array if no signals', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: [], error: null }));
      const result = await controller.getSignals();
      expect(mockFrom).toHaveBeenCalledWith('signals');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('filters by status if provided', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: [{ id: '1', status: 'ACTIVE' }], error: null }));
      const result = await controller.getSignals('ACTIVE');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'ACTIVE');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('throws 500 on db error', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve) => resolve({ data: null, error: { message: 'db error' } }));
      await expect(controller.getSignals()).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.getSignals()).rejects.toThrow(HttpException);
    });
  });

  describe('getSignalById', () => {
    it('returns single signal', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: { id: 'test-1' }, error: null });
      const result = await controller.getSignalById('test-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'test-1');
      expect(result).toEqual({ id: 'test-1' });
    });

    it('throws 404 on db error', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      await expect(controller.getSignalById('test-1')).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.getSignalById('test-1')).rejects.toThrow(HttpException);
    });
  });
});
