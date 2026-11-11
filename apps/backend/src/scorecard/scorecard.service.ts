import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { istDateString, istDayRange } from '../scanner/time/ist.js';
import {
  buildScorecard,
  DEFAULT_MIN_SAMPLE,
  DEFAULT_RISK_BUDGET_INR,
  Scorecard,
  ScorecardSignal,
} from './aggregate.js';

export const PAGE_SIZE = 1000;

export type ScorecardQuery = {
  all: boolean;
  from: string;
  to: string;
  direction: 'LONG' | 'SHORT' | null;
  strategyId: string | null;
  strategyVersion: string | null;
};

const SIGNAL_COLUMNS =
  'id,created_at,direction,setup_family,strategy_id,strategy_version,market_regime,news_gate,outcome_status,outcome_pnl_pct,entry_low,snapshot_json';

/** Spec 0027: loads reconciled signals for a range and turns them into the scorecard. */
@Injectable()
export class ScorecardService {
  constructor(private readonly supabase: SupabaseService) {}

  private db(): SupabaseClient {
    const client = this.supabase.client;
    if (!client) throw new ServiceUnavailableException('Database is not configured');
    return client;
  }

  async scorecard(userId: string, q: ScorecardQuery) {
    const db = this.db();
    const settings = await this.settingsFor(userId);
    const [signals, unreconciled, filterOptions] = await Promise.all([
      this.loadSignals(db, q, true),
      this.countUnreconciled(db, q),
      this.filterOptions(db),
    ]);
    const charges = await this.loadCharges(db, signals.map(s => s.id));
    const card: Scorecard = buildScorecard(signals, charges, {
      minSample: settings.minSample,
      riskBudget: settings.riskBudget ?? DEFAULT_RISK_BUDGET_INR,
    });

    return {
      range: q.all ? { all: true, from: null, to: null } : { all: false, from: q.from, to: q.to },
      settings: {
        minSample: settings.minSample,
        riskBudget: settings.riskBudget ?? DEFAULT_RISK_BUDGET_INR,
        riskBudgetAssumed: settings.riskBudget === null,
      },
      excluded: { unreconciled, invalidRisk: card.invalidRisk },
      overall: card.overall,
      cuts: card.cuts,
      curve: card.curve,
      curveOmitted: card.curveOmitted,
      filterOptions,
    };
  }

  /** AC-12: the caller's min sample and risk budget (column defaults when no row exists). */
  async settingsFor(userId: string): Promise<{ minSample: number; riskBudget: number | null }> {
    const { data, error } = await this.db()
      .from('user_settings')
      .select('scorecard_min_sample,risk_budget')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load settings: ${error.message}`);
    const rb = data?.risk_budget;
    return {
      minSample: data?.scorecard_min_sample ?? DEFAULT_MIN_SAMPLE,
      riskBudget: rb === null || rb === undefined ? null : Number(rb),
    };
  }

  /** AC-12: writes only scorecard_min_sample, never other settings columns. */
  async updateMinSample(userId: string, minSample: number): Promise<{ minSample: number }> {
    const db = this.db();
    const { data: existing, error: readError } = await db
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) throw new Error(`Failed to load settings: ${readError.message}`);

    const { error } = existing
      ? await db.from('user_settings').update({ scorecard_min_sample: minSample }).eq('user_id', userId)
      : await db.from('user_settings').insert({ user_id: userId, scorecard_min_sample: minSample });
    if (error) throw new Error(`Failed to save settings: ${error.message}`);
    return { minSample };
  }

  /** Pages through results so the PostgREST row cap can never undercount (AC-9, AC-13). */
  private async loadSignals(db: SupabaseClient, q: ScorecardQuery, reconciled: boolean): Promise<ScorecardSignal[]> {
    const out: ScorecardSignal[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      let query = db.from('signals').select(SIGNAL_COLUMNS);
      query = reconciled ? query.not('outcome_status', 'is', null) : query.is('outcome_status', null);
      query = this.applyFilters(query, q)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) throw new Error(`Failed to load signals: ${error.message}`);
      out.push(...((data ?? []) as unknown as ScorecardSignal[]));
      if (!data || data.length < PAGE_SIZE) return out;
    }
  }

  private async countUnreconciled(db: SupabaseClient, q: ScorecardQuery): Promise<number> {
    const query = this.applyFilters(
      db.from('signals').select('id', { count: 'exact', head: true }).is('outcome_status', null),
      q
    );
    const { count, error } = await query;
    if (error) throw new Error(`Failed to count signals: ${error.message}`);
    return count ?? 0;
  }

  private applyFilters<T extends { gte: any; lt: any; eq: any }>(query: T, q: ScorecardQuery): T {
    let out: any = query;
    if (!q.all) {
      out = out
        .gte('created_at', istDayRange(q.from).dayStart.toISOString())
        .lt('created_at', istDayRange(q.to).dayEnd.toISOString());
    }
    if (q.direction) out = out.eq('direction', q.direction);
    if (q.strategyId) out = out.eq('strategy_id', q.strategyId);
    if (q.strategyVersion) out = out.eq('strategy_version', q.strategyVersion);
    return out;
  }

  /**
   * AC-6: the latest evidence `estimated_charges` per signal, one query per chunk of ids
   * (never one per signal). Rows arrive newest first, so the first seen per id wins.
   */
  private async loadCharges(db: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
    const charges = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await db
          .from('evidence_snapshots')
          .select('signal_id,estimated_charges,created_at')
          .in('signal_id', chunk)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw new Error(`Failed to load evidence charges: ${error.message}`);
        for (const row of data ?? []) {
          if (row.signal_id && !charges.has(row.signal_id)) charges.set(row.signal_id, Number(row.estimated_charges));
        }
        if (!data || data.length < PAGE_SIZE) break;
      }
    }
    return charges;
  }

  /** Distinct strategies and versions over all reconciled signals, for the filter bar. */
  private async filterOptions(db: SupabaseClient): Promise<{ strategies: string[]; versions: string[] }> {
    const strategies = new Set<string>();
    const versions = new Set<string>();
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await db
        .from('signals')
        .select('strategy_id,strategy_version')
        .not('outcome_status', 'is', null)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Failed to load filter options: ${error.message}`);
      for (const r of data ?? []) {
        if (r.strategy_id) strategies.add(r.strategy_id);
        if (r.strategy_version) versions.add(r.strategy_version);
      }
      if (!data || data.length < PAGE_SIZE) break;
    }
    return { strategies: [...strategies].sort(), versions: [...versions].sort() };
  }
}

/** Default range: the last 30 IST days, ending today. */
export function defaultRange(now = new Date()): { from: string; to: string } {
  const to = istDateString(now);
  const from = istDateString(new Date(now.getTime() - 30 * 24 * 3600 * 1000));
  return { from, to };
}
