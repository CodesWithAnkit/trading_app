import { Test, TestingModule } from '@nestjs/testing';
import { JournalController } from './journal.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { HttpException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('JournalController', () => {
  let controller: JournalController;
  let supabaseServiceMock: any;

  beforeEach(async () => {
    supabaseServiceMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalController],
      providers: [
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
      ],
    }).compile();

    controller = module.get<JournalController>(JournalController);
  });

  describe('getJournalEntries', () => {
    it('returns a list of journal entries (covers AC-10)', async () => {
      const mockData = [{ id: '1', symbol: 'AAPL', status: 'PENDING' }];
      supabaseServiceMock.client.order.mockResolvedValue({ data: mockData, error: null });

      const result = await controller.getJournalEntries();
      expect(result.data).toEqual(mockData);
      expect(supabaseServiceMock.client.from).toHaveBeenCalledWith('journal_entries');
      expect(supabaseServiceMock.client.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('throws when DB query fails', async () => {
      supabaseServiceMock.client.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      await expect(controller.getJournalEntries()).rejects.toThrow(HttpException);
    });
  });

  describe('createJournalEntry', () => {
    it('creates and returns a new journal entry (covers AC-9)', async () => {
      const payload = {
        symbol: 'RELIANCE',
        strategy_name: 'Breakout',
        entry_price: 100,
        stop_price: 90,
        target_price: 120,
        notes: 'Looks good'
      };
      
      const mockReturnedData = { id: '2', ...payload, status: 'PENDING' };
      supabaseServiceMock.client.single.mockResolvedValue({ data: mockReturnedData, error: null });

      const result = await controller.createJournalEntry(payload);
      
      expect(supabaseServiceMock.client.insert).toHaveBeenCalledWith({
        ...payload,
        status: 'PENDING'
      });
      expect(result).toEqual(mockReturnedData);
    });

    it('throws when insertion fails', async () => {
      supabaseServiceMock.client.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      await expect(controller.createJournalEntry({})).rejects.toThrow(HttpException);
    });
  });
});
