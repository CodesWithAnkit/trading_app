import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from './trades.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { HttpException } from '@nestjs/common';

describe('TradesController', () => {
  let controller: TradesController;
  let mockSupabaseService: Partial<SupabaseService>;
  
  const mockSelect = Object.assign(vi.fn(), {
    single: vi.fn(),
  });
  
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSelect.single }) })
  });

  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: mockSelect.single })
  });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  });

  beforeEach(async () => {
    mockSelect.mockReset();
    mockSelect.single.mockReset();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockFrom.mockClear();

    mockSelect.mockResolvedValue({ data: [], error: null });
    mockSelect.single.mockResolvedValue({ data: null, error: null });

    mockSupabaseService = {
      client: {
        from: mockFrom,
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    controller = module.get<TradesController>(TradesController);
  });

  describe('getTrades', () => {
    it('returns empty array if no trades', async () => {
      mockSelect.mockResolvedValueOnce({ data: [], error: null });
      const result = await controller.getTrades();
      expect(mockFrom).toHaveBeenCalledWith('trades');
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('throws 500 on db error', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: { message: 'db err' } });
      await expect(controller.getTrades()).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.getTrades()).rejects.toThrow(HttpException);
    });
  });

  describe('createTrade', () => {
    it('creates trade successfully', async () => {
      const dto = { direction: 'LONG' };
      mockSelect.single.mockResolvedValueOnce({ data: { id: 'new', ...dto }, error: null });
      const result = await controller.createTrade(dto);
      expect(mockInsert).toHaveBeenCalledWith([dto]);
      expect(result.id).toBe('new');
    });

    it('throws 500 on insert error', async () => {
      mockSelect.single.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
      await expect(controller.createTrade({})).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.createTrade({})).rejects.toThrow(HttpException);
    });
  });

  describe('exitTrade', () => {
    it('updates trade status', async () => {
      mockSelect.single.mockResolvedValueOnce({ data: { id: '1', status: 'CLOSED' }, error: null });
      const result = await controller.exitTrade('1', { price: 100 });
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'CLOSED', price: 100 });
      expect(result.status).toBe('CLOSED');
    });

    it('throws 500 on db error', async () => {
      mockSelect.single.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(controller.exitTrade('1', {})).rejects.toThrow(HttpException);
    });

    it('throws 500 if database not configured', async () => {
      (mockSupabaseService as any).client = null;
      await expect(controller.exitTrade('1', {})).rejects.toThrow(HttpException);
    });
  });
});
