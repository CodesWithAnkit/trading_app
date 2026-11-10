import { SupabaseClient } from '@supabase/supabase-js';
import { GURU_RULES } from '../../scanner/strategy/guru/index.js';
import { httpError, SYMBOLS } from '../runner.js';

// spec 0023: toggles and the derived live state per (guru rule, index).

export type LiveState = 'off' | 'no run' | 'warming up' | 'live' | 'blocked';
export const GURU_IDS: string[] = GURU_RULES.map((r) => r.id);
export const GATE_CACHE_MS = 5 * 60_000;

export type ToggleRow = { rule_id: string; symbol: string; enabled: boolean; updated_at: string | null; updated_by: string | null };
export type LatestRun = { id: string; passed_gate: boolean; out_of_sample: any; definitions_version: string } | null;

/**
 * What the live engine reports per pair (warming up); everything else is derived from DB state.
 * Held in memory by the live service; the API reads it to show the state.
 */
export class LiveStatusRegistry {
  private readonly warming = new Map<string, string>();
  setWarming(ruleId: string, symbol: string, reason: string | null) {
    const k = `${ruleId}|${symbol}`;
    if (reason) this.warming.set(k, reason);
    else this.warming.delete(k);
  }
  warmingReason(ruleId: string, symbol: string): string | null {
    return this.warming.get(`${ruleId}|${symbol}`) ?? null;
  }
}

/** Pure state derivation (AC-7, AC-8). */
export function deriveState(
  enabled: boolean,
  run: LatestRun,
  warmingReason: string | null,
): { state: LiveState; reason: string | null } {
  if (!run) return { state: 'no run', reason: 'No done backtest run for this rule and symbol.' };
  if (!enabled) return { state: 'off', reason: null };
  if (!run.passed_gate) return { state: 'blocked', reason: 'The latest backtest run no longer passes the gate.' };
  if (warmingReason) return { state: 'warming up', reason: warmingReason };
  return { state: 'live', reason: null };
}

/** Latest done run per (rule, symbol) for the guru rules. */
export async function latestRunsByPair(db: SupabaseClient): Promise<Map<string, LatestRun>> {
  const { data, error } = await db
    .from('backtest_runs')
    .select('id,rule_id,symbol,passed_gate,out_of_sample,definitions_version,created_at')
    .eq('status', 'done')
    .in('rule_id', GURU_IDS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, LatestRun>();
  for (const r of data ?? []) {
    const k = `${r.rule_id}|${r.symbol}`;
    if (!map.has(k)) map.set(k, r as LatestRun);
  }
  return map;
}

export async function listToggles(db: SupabaseClient, registry: LiveStatusRegistry) {
  const [{ data, error }, runs] = await Promise.all([db.from('strategy_live_toggles').select('*'), latestRunsByPair(db)]);
  if (error) throw new Error(error.message);
  const rows = new Map((data ?? []).map((r: ToggleRow) => [`${r.rule_id}|${r.symbol}`, r]));
  // AC-8: every guru rule and symbol pair, including pairs with no row yet.
  return GURU_IDS.flatMap((ruleId) =>
    SYMBOLS.map((symbol) => {
      const row = rows.get(`${ruleId}|${symbol}`);
      const run = runs.get(`${ruleId}|${symbol}`) ?? null;
      const { state, reason } = deriveState(Boolean(row?.enabled), run, registry.warmingReason(ruleId, symbol));
      return { ruleId, symbol, enabled: Boolean(row?.enabled), state, reason, runId: run?.id ?? null, updatedAt: row?.updated_at ?? null };
    }),
  );
}

/** AC-1: on only while the latest run for this rule and symbol passes; off always allowed. */
export async function setToggle(db: SupabaseClient, ruleId: string, symbol: string, enabled: boolean, userId: string | null) {
  if (ruleId.startsWith('BASE_')) throw httpError(422, 'Baselines cannot go live.');
  if (!GURU_IDS.includes(ruleId)) throw httpError(404, `Unknown rule ${ruleId}`);
  if (!(SYMBOLS as readonly string[]).includes(symbol)) throw httpError(404, `Unknown symbol ${symbol}`);
  if (enabled) {
    const run = (await latestRunsByPair(db)).get(`${ruleId}|${symbol}`) ?? null;
    if (!run) throw httpError(409, 'No done backtest run for this rule and symbol.');
    if (!run.passed_gate) throw httpError(409, 'The latest backtest run does not pass the gate.');
  }
  const { error } = await db
    .from('strategy_live_toggles')
    .upsert({ rule_id: ruleId, symbol, enabled, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
