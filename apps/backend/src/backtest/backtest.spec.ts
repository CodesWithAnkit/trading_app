import { describe, expect, it, vi } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { BacktestController } from './backtest.controller.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { queueRuns } from './runner.js';

/** Minimal chainable Supabase double for queueRuns. */
function fakeDb(active: { rule_id: string; symbol: string }[], insertError: any = null) {
  const insert = vi.fn().mockReturnValue({ select: () => Promise.resolve({ data: [{ id: 'r1' }, { id: 'r2' }], error: insertError }) });
  const chain: any = {
    select: () => chain,
    in: () => chain,
    then: (res: any) => res({ data: active, error: null }),
    insert,
  };
  return { db: { from: () => chain } as any, insert };
}

describe('backtest API (spec 0020)', () => {
  it('every route is behind AdminGuard (AC-11 via spec 0021)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, BacktestController) ?? [];
    expect(guards).toContain(AdminGuard);
  });

  it('queues all pairs in one insert', async () => {
    const { db, insert } = fakeDb([]);
    const ids = await queueRuns(db, { ruleIds: ['UP_ORB'], symbols: ['NIFTY', 'SENSEX'] });
    expect(ids).toEqual(['r1', 'r2']);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toHaveLength(2);
  });

  it('is all or nothing: one active pair rejects the whole request with 409 and inserts nothing (AC-8)', async () => {
    const { db, insert } = fakeDb([{ rule_id: 'UP_ORB', symbol: 'NIFTY' }]);
    await expect(queueRuns(db, { ruleIds: ['UP_ORB', 'GJ_PDHL'], symbols: ['NIFTY', 'SENSEX'] })).rejects.toMatchObject({ status: 409 });
    expect(insert).not.toHaveBeenCalled();
  });

  it('a race on the partial unique index is still a 409', async () => {
    const { db } = fakeDb([], { code: '23505', message: 'duplicate' });
    await expect(queueRuns(db, { ruleIds: ['UP_ORB'], symbols: ['NIFTY'] })).rejects.toMatchObject({ status: 409 });
  });

  it('rejects unknown rules and symbols with 422', async () => {
    const { db } = fakeDb([]);
    await expect(queueRuns(db, { ruleIds: ['NOPE'], symbols: ['NIFTY'] })).rejects.toMatchObject({ status: 422 });
    await expect(queueRuns(db, { ruleIds: ['UP_ORB'], symbols: ['BANKNIFTY'] })).rejects.toMatchObject({ status: 422 });
  });
});

describe('executeRun claim (regression: a run must execute once)', () => {
  /** Records every update; the claim update returns `claimRows`. */
  function claimDb(claimRows: any[]) {
    const updates: any[] = [];
    const db: any = {
      from: () => {
        const q: any = {
          _filters: {} as Record<string, unknown>,
          update(v: any) {
            updates.push(v);
            q._update = v;
            return q;
          },
          eq(k: string, v: unknown) {
            q._filters[k] = v;
            return q;
          },
          select: () => Promise.resolve({ data: q._update?.status === 'running' ? claimRows : [], error: null }),
          then: (res: any) => res({ data: null, error: null }),
        };
        return q;
      },
    };
    return { db, updates };
  }

  it('skips a run another worker already claimed (no second execution, no status overwrite)', async () => {
    const { executeRun } = await import('./runner.js');
    const { db, updates } = claimDb([]);
    await executeRun(db, 'run-1', { NIFTY: 65, SENSEX: 20 });
    expect(updates).toEqual([{ status: 'running', progress: 0 }]);
  });

  it('only claims rows that are still queued', async () => {
    const { executeRun } = await import('./runner.js');
    const seen: Record<string, unknown>[] = [];
    const { db } = claimDb([]);
    const orig = db.from;
    db.from = () => {
      const q = orig();
      const eq = q.eq;
      q.eq = (k: string, v: unknown) => {
        seen.push({ [k]: v });
        return eq(k, v);
      };
      return q;
    };
    await executeRun(db, 'run-1', { NIFTY: 65, SENSEX: 20 });
    expect(seen).toContainEqual({ status: 'queued' });
  });
});
