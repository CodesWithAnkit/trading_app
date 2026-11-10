import { describe, expect, it } from 'vitest';
import { deriveState, listToggles, LiveStatusRegistry, setToggle } from './liveToggles.js';

const passing = { id: 'r1', passed_gate: true, out_of_sample: {}, definitions_version: 'v1' };
const failing = { ...passing, id: 'r2', passed_gate: false };

/** Minimal Supabase double: `runs` for backtest_runs, `toggles` for strategy_live_toggles. */
function db(runs: any[], toggles: any[] = []) {
  const upserts: any[] = [];
  const from = (table: string) => {
    const rows = table === 'backtest_runs' ? runs : toggles;
    const q: any = {
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      upsert: (v: any) => {
        upserts.push(v);
        return Promise.resolve({ error: null });
      },
      then: (res: any) => res({ data: rows, error: null }),
    };
    return q;
  };
  return { client: { from } as any, upserts };
}

describe('deriveState (spec 0023 AC-7, AC-8)', () => {
  it('covers every state', () => {
    expect(deriveState(true, null, null).state).toBe('no run');
    expect(deriveState(false, passing, null).state).toBe('off');
    expect(deriveState(true, failing, null).state).toBe('blocked');
    expect(deriveState(true, passing, 'Needs 30 bars, have 12').state).toBe('warming up');
    expect(deriveState(true, passing, null).state).toBe('live');
  });
});

describe('setToggle (spec 0023 AC-1)', () => {
  it('turns on only when the latest run for that rule and symbol passes', async () => {
    const ok = db([{ ...passing, rule_id: 'UP_ORB', symbol: 'NIFTY' }]);
    await setToggle(ok.client, 'UP_ORB', 'NIFTY', true, 'u1');
    expect(ok.upserts[0]).toMatchObject({ rule_id: 'UP_ORB', symbol: 'NIFTY', enabled: true, updated_by: 'u1' });

    const bad = db([{ ...failing, rule_id: 'UP_ORB', symbol: 'NIFTY' }]);
    await expect(setToggle(bad.client, 'UP_ORB', 'NIFTY', true, 'u1')).rejects.toMatchObject({ status: 409 });
    await expect(setToggle(db([]).client, 'UP_ORB', 'NIFTY', true, 'u1')).rejects.toMatchObject({ status: 409 });
  });

  it('turning off is always allowed, baselines are 422, unknown ids are 404', async () => {
    const d = db([]);
    await setToggle(d.client, 'UP_ORB', 'NIFTY', false, null);
    expect(d.upserts).toHaveLength(1);
    await expect(setToggle(d.client, 'BASE_COIN', 'NIFTY', true, null)).rejects.toMatchObject({ status: 422 });
    await expect(setToggle(d.client, 'NOPE', 'NIFTY', true, null)).rejects.toMatchObject({ status: 404 });
    await expect(setToggle(d.client, 'UP_ORB', 'BANKNIFTY', true, null)).rejects.toMatchObject({ status: 404 });
  });
});

describe('listToggles (spec 0023 AC-8)', () => {
  it('lists every guru rule and symbol pair, including pairs with no row', async () => {
    const reg = new LiveStatusRegistry();
    reg.setWarming('UP_ORB', 'NIFTY', 'Needs 30 bars, have 12');
    const d = db([{ ...passing, rule_id: 'UP_ORB', symbol: 'NIFTY' }], [{ rule_id: 'UP_ORB', symbol: 'NIFTY', enabled: true, updated_at: null }]);
    const all = await listToggles(d.client, reg);
    expect(all).toHaveLength(10);
    expect(all.find((t) => t.ruleId === 'UP_ORB' && t.symbol === 'NIFTY')).toMatchObject({ enabled: true, state: 'warming up', runId: 'r1' });
    expect(all.find((t) => t.ruleId === 'GJ_PDHL' && t.symbol === 'SENSEX')).toMatchObject({ enabled: false, state: 'no run' });
  });
});
