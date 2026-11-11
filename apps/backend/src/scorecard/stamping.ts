import type { SupabaseClient } from '@supabase/supabase-js';
import { istDateString, istDayRange } from '../scanner/time/ist.js';

/** Spec 0027 AC-11: the strategy key a scanner signal is grouped by. */
export function scannerStrategyId(setupFamily: string): string {
  return setupFamily.toLowerCase();
}

/** Spec 0027 AC-11: the strategy key a guru live signal is grouped by. */
export function guruStrategyId(ruleId: string): string {
  return `guru:${ruleId}`;
}

/**
 * Spec 0027 AC-11: the market regime in force when a signal fires, the latest
 * `market_context_snapshots` row at or before `at` on the same IST day. Never throws:
 * a failed read returns null so the signal insert is never blocked.
 */
export async function regimeAt(client: SupabaseClient | null, at: Date): Promise<string | null> {
  if (!client) return null;
  try {
    const { dayStart } = istDayRange(istDateString(at));
    const { data, error } = await client
      .from('market_context_snapshots')
      .select('market_regime')
      .gte('snapshot_time', dayStart.toISOString())
      .lte('snapshot_time', at.toISOString())
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data?.market_regime ?? null;
  } catch {
    return null;
  }
}
