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

/**
 * Compares one signal against the session's candles.
 * actual_high/low/close cover the whole 09:15–15:30 session; WON/LOST walks only
 * the candles from the signal onward, in time order. When a single candle spans
 * both target and stop we cannot know which came first, so it counts as LOST.
 */
export function evaluateOutcome(signal: any, sessionCandles: OutcomeCandle[]): SignalOutcomeFields | null {
  if (sessionCandles.length === 0) return null;

  const entry = referenceEntryOf(signal);
  const stop = stopOf(signal);
  const target = target1Of(signal);
  if (!entry || target === null) return null;

  const isLong = signal.direction !== 'SHORT';
  const signalTime = new Date(signal.created_at).getTime();
  const actual_high = Math.max(...sessionCandles.map(c => c.high));
  const actual_low = Math.min(...sessionCandles.map(c => c.low));
  const actual_close = sessionCandles[sessionCandles.length - 1].close;

  let outcome_status: OutcomeStatus = 'NEUTRAL';
  let exitPrice = actual_close;
  for (const c of sessionCandles) {
    // created_at is the trigger candle's start; only candles after it can fill the plan.
    if (new Date(c.start_time).getTime() <= signalTime) continue;
    const hitTarget = isLong ? c.high >= target : c.low <= target;
    const hitStop = isLong ? c.low <= stop : c.high >= stop;
    if (hitStop) {
      outcome_status = 'LOST';
      exitPrice = stop;
      break;
    }
    if (hitTarget) {
      outcome_status = 'WON';
      exitPrice = target;
      break;
    }
  }

  const rawPct = ((exitPrice - entry) / entry) * 100;
  return {
    actual_high,
    actual_low,
    actual_close,
    outcome_status,
    outcome_pnl_pct: Math.round((isLong ? rawPct : -rawPct) * 100) / 100,
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
