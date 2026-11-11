import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JournalController } from './journal.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { RiskService } from '../risk/risk.service.js';

const USER = { id: 'user-1', email: null, exp: 0 } as any;

/** A chainable query mock: every builder call records itself; awaiting resolves `result`. */
function query(result: { data: any; error: any }) {
  const q: any = { calls: [] as any[] };
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'in', 'gte', 'lt']) {
    q[m] = vi.fn((...args: any[]) => {
      q.calls.push([m, ...args]);
      return q;
    });
  }
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: any) => resolve(result);
  return q;
}

describe('JournalController (spec 0028)', () => {
  let controller: JournalController;
  let queue: any[];
  let supabase: any;
  const risk = { notify: vi.fn() };

  beforeEach(async () => {
    queue = [];
    risk.notify.mockClear();
    supabase = { client: { from: vi.fn(() => queue.shift()) } };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalController],
      providers: [
        { provide: SupabaseService, useValue: supabase },
        { provide: RiskService, useValue: risk },
      ],
    }).compile();
    controller = module.get(JournalController);
  });

  describe('GET', () => {
    it("lists only the caller's entries and flags legacy rows (AC-11, AC-12)", async () => {
      const q = query({ data: [{ id: '1', quantity: null, direction: null }, { id: '2', quantity: 5, direction: 'LONG' }], error: null });
      queue.push(q);
      const result = await controller.getJournalEntries(USER);
      expect(q.calls).toContainEqual(['eq', 'user_id', 'user-1']);
      expect(result.data[0].flags).toEqual(['NO_QUANTITY', 'CHECK_DIRECTION']);
      expect(result.data[1].flags).toEqual([]);
    });

    it('throws when the query fails', async () => {
      queue.push(query({ data: null, error: { message: 'DB error' } }));
      await expect(controller.getJournalEntries(USER)).rejects.toThrow(HttpException);
    });
  });

  describe('POST', () => {
    const body = { symbol: 'INFY', strategy_name: 'guru:orb_15m', entry_price: 1876, stop_price: 1812, target_price: 2004, direction: 'LONG', quantity: 23 };

    it('sets user_id from the token, PENDING, and notifies (AC-9, AC-12)', async () => {
      const q = query({ data: { id: '9' }, error: null });
      queue.push(q);
      await controller.createJournalEntry(USER, { ...body, user_id: 'someone-else', status: 'WON' });
      const insert = q.calls.find((c: any[]) => c[0] === 'insert')[1];
      expect(insert).toMatchObject({ ...body, user_id: 'user-1', status: 'PENDING' });
      expect(risk.notify).toHaveBeenCalledWith('user-1');
    });

    it('rejects a missing quantity or direction', async () => {
      await expect(controller.createJournalEntry(USER, { ...body, quantity: undefined })).rejects.toThrow(BadRequestException);
      await expect(controller.createJournalEntry(USER, { ...body, direction: 'UP' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH close (AC-9)', () => {
    const pending = { id: 'e1', status: 'PENDING', direction: 'SHORT', quantity: 10, entry_price: 200 };

    it('computes P&L on the server and updates only a PENDING row', async () => {
      const read = query({ data: pending, error: null });
      const write = query({ data: { id: 'e1', realized_pnl: 100 }, error: null });
      queue.push(read, write);
      await controller.closeJournalEntry(USER, 'e1', { status: 'WON', exit_price: 190, realized_pnl: 99999 });
      const update = write.calls.find((c: any[]) => c[0] === 'update')[1];
      expect(update).toMatchObject({ status: 'WON', exit_price: 190, realized_pnl: 100 });
      expect(write.calls).toContainEqual(['eq', 'status', 'PENDING']);
      expect(write.calls).toContainEqual(['eq', 'user_id', 'user-1']);
      expect(risk.notify).toHaveBeenCalledWith('user-1');
    });

    it('requires an exit price for WON or LOST', async () => {
      queue.push(query({ data: pending, error: null }));
      await expect(controller.closeJournalEntry(USER, 'e1', { status: 'LOST' })).rejects.toThrow(BadRequestException);
    });

    it('cancels with P&L 0 and no exit price', async () => {
      const write = query({ data: { id: 'e1' }, error: null });
      queue.push(query({ data: pending, error: null }), write);
      await controller.closeJournalEntry(USER, 'e1', { status: 'CANCELLED' });
      expect(write.calls.find((c: any[]) => c[0] === 'update')[1]).toMatchObject({ status: 'CANCELLED', realized_pnl: 0, exit_price: null });
    });

    it("404s another user's entry and 409s a closed one", async () => {
      queue.push(query({ data: null, error: null }));
      await expect(controller.closeJournalEntry(USER, 'x', { status: 'CANCELLED' })).rejects.toThrow(NotFoundException);
      queue.push(query({ data: { ...pending, status: 'WON' }, error: null }));
      await expect(controller.closeJournalEntry(USER, 'e1', { status: 'CANCELLED' })).rejects.toThrow(ConflictException);
    });

    it('409s when a second close wins the race (conditional update matched nothing)', async () => {
      queue.push(query({ data: pending, error: null }), query({ data: null, error: null }));
      await expect(controller.closeJournalEntry(USER, 'e1', { status: 'WON', exit_price: 190 })).rejects.toThrow(ConflictException);
    });
  });
});
