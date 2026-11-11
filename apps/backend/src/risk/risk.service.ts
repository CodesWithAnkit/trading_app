import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Subject } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service.js';
import { istDateString, istDayRange } from '../scanner/time/ist.js';
import { buildContext, DEFAULT_LIMITS, JournalRow, RiskContext, RiskLimits, RiskVerdict, sizeSignal } from './sizing.js';

const JOURNAL_COLUMNS = 'status,direction,quantity,entry_price,stop_price,realized_pnl,exit_at';

/** Spec 0028: per user risk context, limits, and the per user change push. */
@Injectable()
export class RiskService {
  /** AC-7: one event per user write; the SSE stream filters by the ticket's user. */
  readonly changes$ = new Subject<{ userId: string }>();

  constructor(private readonly supabase: SupabaseService) {}

  private db(): SupabaseClient {
    const client = this.supabase.client;
    if (!client) throw new ServiceUnavailableException('Database is not configured');
    return client;
  }

  notify(userId: string) {
    this.changes$.next({ userId });
  }

  async limitsFor(userId: string): Promise<RiskLimits> {
    const { data, error } = await this.db()
      .from('user_settings')
      .select('risk_budget,daily_loss_limit_inr,max_open_trades,max_capital_per_trade_inr')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load risk limits: ${error.message}`);
    if (!data) return { ...DEFAULT_LIMITS };
    return {
      riskPerTrade: Number(data.risk_budget ?? DEFAULT_LIMITS.riskPerTrade),
      dailyLossLimit: Number(data.daily_loss_limit_inr ?? DEFAULT_LIMITS.dailyLossLimit),
      maxOpenTrades: Number(data.max_open_trades ?? DEFAULT_LIMITS.maxOpenTrades),
      maxCapitalPerTrade: Number(data.max_capital_per_trade_inr ?? DEFAULT_LIMITS.maxCapitalPerTrade),
    };
  }

  /** AC-1: validates the MERGED row (stored values plus the patch), then upserts only these columns. */
  async updateLimits(userId: string, patch: Partial<RiskLimits>): Promise<RiskLimits> {
    const merged = { ...(await this.limitsFor(userId)), ...patch };
    const errors = validateLimits(merged);
    if (errors.length) throw new BadRequestException(errors.join(' '));
    const { error } = await this.db().from('user_settings').upsert(
      {
        user_id: userId,
        risk_budget: merged.riskPerTrade,
        daily_loss_limit_inr: merged.dailyLossLimit,
        max_open_trades: merged.maxOpenTrades,
        max_capital_per_trade_inr: merged.maxCapitalPerTrade,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw new Error(`Failed to save risk limits: ${error.message}`);
    this.notify(userId);
    return merged;
  }

  /** AC-4, AC-8, AC-12: the caller's open entries and today's closes (IST), never another user's. */
  async contextFor(userId: string, now = new Date()): Promise<RiskContext> {
    const db = this.db();
    const { dayStart, dayEnd } = istDayRange(istDateString(now));
    const [limits, open, closed] = await Promise.all([
      this.limitsFor(userId),
      db.from('journal_entries').select(JOURNAL_COLUMNS).eq('user_id', userId).eq('status', 'PENDING'),
      db
        .from('journal_entries')
        .select(JOURNAL_COLUMNS)
        .eq('user_id', userId)
        .in('status', ['WON', 'LOST'])
        .gte('exit_at', dayStart.toISOString())
        .lt('exit_at', dayEnd.toISOString()),
    ]);
    if (open.error) throw new Error(`Failed to load open entries: ${open.error.message}`);
    if (closed.error) throw new Error(`Failed to load closed entries: ${closed.error.message}`);
    return buildContext(limits, (open.data ?? []) as JournalRow[], (closed.data ?? []) as JournalRow[]);
  }

  /** Attaches a verdict to each already mapped API signal, from one context load per request. */
  withRisk<T extends object>(apiSignals: T[], rawRows: any[], ctx: RiskContext): (T & { risk: RiskVerdict })[] {
    return apiSignals.map((s, i) => ({ ...s, risk: sizeSignal(rawRows[i], ctx) }));
  }
}

export function validateLimits(l: RiskLimits): string[] {
  const errors: string[] = [];
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!isNum(l.riskPerTrade) || l.riskPerTrade < 100) errors.push('Risk per trade must be ₹100 or more.');
  if (!isNum(l.dailyLossLimit) || l.dailyLossLimit < l.riskPerTrade) errors.push('Daily loss limit must be at least your risk per trade.');
  if (!Number.isInteger(l.maxOpenTrades) || l.maxOpenTrades < 1 || l.maxOpenTrades > 20) errors.push('Max open trades must be a whole number from 1 to 20.');
  if (!isNum(l.maxCapitalPerTrade) || l.maxCapitalPerTrade < 1000) errors.push('Max capital per trade must be ₹1,000 or more.');
  return errors;
}

/** Next 00:00 IST, when the daily room resets (AC-8). */
export function nextIstMidnight(now = new Date()): string {
  return istDayRange(istDateString(now)).dayEnd.toISOString();
}
