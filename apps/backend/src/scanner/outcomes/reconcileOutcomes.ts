import { Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { istDayRange } from '../time/ist.js';
import { referenceEntryOf, stopOf, target1Of } from '../signalMapper.js';

export type OutcomeStatus = 'WON' | 'LOST' | 'NEUTRAL';

export type OutcomeCandle = { high: number; low: number; close: number; start_time: string };

export type SignalOutcomeFields = {
  actual_high: number;
  actual_low: number;
  actual_close: number;
  outcome_status: OutcomeStatus;
  outcome_pnl_pct: number;
};

const logger = new Logger('ReconcileOutcomes');

export type PlanExit = { status: OutcomeStatus; exitPrice: number; exitAt: string | null; pnlPct: number };

/**
 * Walks the candles after a trade plan fired and finds how it ended: the first candle
 * to touch the stop (LOST) or the target (WON), else the last close (NEUTRAL). When a
 * single candle spans both we cannot know which came first, so it counts as LOST.
 * `firedAt` is the trigger candle's start; only candles after it can fill the plan.
 */
export function findPlanExit(
  plan: { direction: string; entry: number; stop: number; target: number; firedAt: string },
  candles: OutcomeCandle[]
): PlanExit | null {
  if (candles.length === 0 || !plan.entry) return null;
  const isLong = plan.direction !== 'SHORT';
  const firedAt = new Date(plan.firedAt).getTime();

  let status: OutcomeStatus = 'NEUTRAL';
  let exitPrice = candles[candles.length - 1].close;
  let exitAt: string | null = null;
  for (const c of candles) {
    if (new Date(c.start_time).getTime() <= firedAt) continue;
    const hitTarget = isLong ? c.high >= plan.target : c.low <= plan.target;
    const hitStop = isLong ? c.low <= plan.stop : c.high >= plan.stop;
    if (hitStop || hitTarget) {
      status = hitStop ? 'LOST' : 'WON';
      exitPrice = hitStop ? plan.stop : plan.target;
      exitAt = c.start_time;
      break;
    }
  }

  const rawPct = ((exitPrice - plan.entry) / plan.entry) * 100;
  return { status, exitPrice, exitAt, pnlPct: Math.round((isLong ? rawPct : -rawPct) * 100) / 100 };
}

/**
 * Compares one signal against the session's candles.
 * actual_high/low/close cover the whole 09:15–15:30 session; WON/LOST comes from
 * `findPlanExit` over the candles from the signal onward.
 */
export function evaluateOutcome(signal: any, sessionCandles: OutcomeCandle[]): SignalOutcomeFields | null {
  if (sessionCandles.length === 0) return null;

  const entry = referenceEntryOf(signal);
  const target = target1Of(signal);
  if (!entry || target === null) return null;

  const exit = findPlanExit(
    { direction: signal.direction, entry, stop: stopOf(signal), target, firedAt: signal.created_at },
    sessionCandles
  )!;
  return {
    actual_high: Math.max(...sessionCandles.map(c => c.high)),
    actual_low: Math.min(...sessionCandles.map(c => c.low)),
    actual_close: sessionCandles[sessionCandles.length - 1].close,
    outcome_status: exit.status,
    outcome_pnl_pct: exit.pnlPct,
  };
}

/**
 * Writes actual high/low/close and the outcome onto every signal fired on `date`
 * (IST, YYYY-MM-DD). Deterministic, so reruns write the same values.
 */
export async function reconcileOutcomes(client: SupabaseClient, date: string): Promise<{ reconciled: number; skipped: number }> {
  const { dayStart, dayEnd, sessionStart, sessionEnd } = istDayRange(date);

  const { data: signals, error } = await client
    .from('signals')
    .select('*')
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString());
  if (error) throw new Error(`Failed to load signals for ${date}: ${error.message}`);

  const candlesBySymbol = new Map<string, OutcomeCandle[]>();
  let reconciled = 0;
  let skipped = 0;

  for (const signal of signals || []) {
    const symbol: string | undefined = signal.snapshot_json?.symbol;
    if (!symbol) {
      skipped++;
      continue;
    }

    if (!candlesBySymbol.has(symbol)) {
      candlesBySymbol.set(symbol, await loadSessionCandles(client, symbol, sessionStart, sessionEnd));
    }

    const outcome = evaluateOutcome(signal, candlesBySymbol.get(symbol)!);
    if (!outcome) {
      logger.warn(`No candles or plan levels for ${symbol} (signal ${signal.id}); skipping.`);
      skipped++;
      continue;
    }

    const { error: updateError } = await client
      .from('signals')
      .update({ ...outcome, reconciled_at: sessionEnd.toISOString() })
      .eq('id', signal.id);
    if (updateError) throw new Error(`Failed to update signal ${signal.id}: ${updateError.message}`);
    reconciled++;
  }

  logger.log(`Reconciled ${reconciled} signal(s) for ${date}, skipped ${skipped}.`);
  return { reconciled, skipped };
}

/** 1m candles for the session, falling back to 5m when 1m were not persisted. */
async function loadSessionCandles(client: SupabaseClient, symbol: string, from: Date, to: Date): Promise<OutcomeCandle[]> {
  for (const timeframe of ['1m', '5m']) {
    const { data, error } = await client
      .from('candles')
      .select('high, low, close, start_time')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .gte('start_time', from.toISOString())
      .lt('start_time', to.toISOString())
      .order('start_time', { ascending: true });
    if (error) throw new Error(`Failed to load candles for ${symbol}: ${error.message}`);
    if (data && data.length > 0) {
      return data.map(c => ({ high: Number(c.high), low: Number(c.low), close: Number(c.close), start_time: c.start_time }));
    }
  }
  return [];
}
