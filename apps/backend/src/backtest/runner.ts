// Backtest runner (spec 0020 AC-3..AC-8): loads candles, runs a rule, stores the run and trades,
// and recomputes the gate across both symbols.
import { SupabaseClient } from '@supabase/supabase-js';
import { Bar, DailyBar, DEFINITIONS_VERSION, istDate, ruleById } from '../scanner/strategy/guru/index.js';
import { COST_MODEL_V1, Exchange } from './engine/costModel.js';
import { simulate, SimTrade } from './engine/simulate.js';
import { buyAndHold, computeMetrics, fullYearsBetween, Metrics, oosStartDate } from './engine/metrics.js';
import { gateForSymbol, ruleGate, SymbolGate } from './engine/gate.js';

export const SYMBOLS = ['NIFTY', 'SENSEX'] as const;
export type BacktestSymbol = (typeof SYMBOLS)[number];
export const EXCHANGE: Record<BacktestSymbol, Exchange> = { NIFTY: 'NSE', SENSEX: 'BSE' };
export const RULE_IDS = ['GJ_PDHL', 'MR_EMA_PIN', 'UP_ORB', 'SP_5EMA', 'AST_RG', 'BASE_COIN', 'BASE_BUYHOLD'] as const;
export const COIN_SEEDS = 1000;
const PAGE = 1000;

export type RunRequest = { ruleIds: string[]; symbols: string[] };

/** Creates queued runs, all or nothing (AC-8). Throws a 409 style error if any pair is already active. */
export async function queueRuns(db: SupabaseClient, req: RunRequest, createdBy?: string): Promise<string[]> {
  for (const r of req.ruleIds) if (!(RULE_IDS as readonly string[]).includes(r)) throw httpError(422, `Unknown rule ${r}`);
  for (const s of req.symbols) if (!(SYMBOLS as readonly string[]).includes(s)) throw httpError(422, `Unknown symbol ${s}`);
  const { data: active, error } = await db
    .from('backtest_runs')
    .select('rule_id,symbol')
    .in('status', ['queued', 'running'])
    .in('rule_id', req.ruleIds)
    .in('symbol', req.symbols);
  if (error) throw new Error(error.message);
  if (active && active.length) {
    throw httpError(409, `Already active: ${active.map((a) => `${a.rule_id} · ${a.symbol}`).join(', ')}. Nothing was queued.`);
  }
  const rows = req.ruleIds.flatMap((rule_id) =>
    req.symbols.map((symbol) => ({ rule_id, symbol, definitions_version: DEFINITIONS_VERSION, cost_model: COST_MODEL_V1, status: 'queued', created_by: createdBy ?? null })),
  );
  // One insert: the partial unique index makes a race fail the whole batch, never half of it.
  const { data, error: insErr } = await db.from('backtest_runs').insert(rows).select('id');
  if (insErr) {
    if (insErr.code === '23505') throw httpError(409, 'A run for one of these pairs became active. Nothing was queued.');
    throw new Error(insErr.message);
  }
  return (data ?? []).map((d) => d.id as string);
}

/** On boot: runs left `running` are failed; `queued` ones are returned to pick up again. */
export async function recoverRuns(db: SupabaseClient): Promise<string[]> {
  await db
    .from('backtest_runs')
    .update({ status: 'failed', error: 'interrupted by restart', finished_at: new Date().toISOString() })
    .eq('status', 'running');
  const { data } = await db.from('backtest_runs').select('id').eq('status', 'queued').order('created_at');
  return (data ?? []).map((d) => d.id as string);
}

export async function loadBars(db: SupabaseClient, symbol: string): Promise<{ bars: Bar[]; daily: DailyBar[] }> {
  const read = async (tf: string) => {
    const out: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from('candles')
        .select('start_time,open,high,low,close,volume')
        .eq('symbol', symbol)
        .eq('timeframe', tf)
        .order('start_time', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Loading ${symbol} ${tf} candles failed: ${error.message}`);
      out.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return out;
  };
  const bars: Bar[] = (await read('5m')).map((r) => ({ t: new Date(r.start_time), o: +r.open, h: +r.high, l: +r.low, c: +r.close, v: +(r.volume ?? 0) }));
  const daily: DailyBar[] = (await read('1d')).map((r) => ({ date: istDate(new Date(r.start_time)), o: +r.open, h: +r.high, l: +r.low, c: +r.close }));
  return { bars, daily };
}

export type Lots = Record<BacktestSymbol, number>;

/** Executes one queued run end to end. Never throws: failures are stored on the run (AC-12). */
export async function executeRun(db: SupabaseClient, runId: string, lots: Lots, data?: { bars: Bar[]; daily: DailyBar[] }): Promise<void> {
  const { data: run, error } = await db.from('backtest_runs').select('*').eq('id', runId).single();
  if (error || !run) return;
  await db.from('backtest_runs').update({ status: 'running', progress: 0 }).eq('id', runId);
  try {
    const symbol = run.symbol as BacktestSymbol;
    const { bars, daily } = data ?? (await loadBars(db, symbol));
    if (bars.length === 0) throw new Error(`No 5m history for ${symbol}. Run the backfill first.`);

    const setProgress = async (done: number, total: number) => {
      await db.from('backtest_runs').update({ progress: Math.round((done / total) * 100) }).eq('id', runId);
      await new Promise((r) => setImmediate(r)); // yield so the live scanner is never starved
    };

    if (run.rule_id === 'BASE_BUYHOLD') {
      await storeBuyHold(db, runId, bars);
    } else {
      const rule = ruleById(run.rule_id)!;
      const base = { rule, symbol, exchange: EXCHANGE[symbol], lot: lots[symbol], bars, daily, costModel: COST_MODEL_V1 };
      let sim;
      if (rule.id === 'BASE_COIN') {
        // 1000 seeds; keep the seed whose net R is the median.
        const results: { seed: number; netR: number }[] = [];
        for (let seed = 1; seed <= COIN_SEEDS; seed++) {
          const s = await simulate({ ...base, seed });
          results.push({ seed, netR: s.trades.reduce((a, t) => a + t.rNet, 0) });
          if (seed % 25 === 0) await setProgress(seed, COIN_SEEDS);
        }
        results.sort((a, b) => a.netR - b.netR);
        sim = await simulate({ ...base, seed: results[Math.floor(results.length / 2)].seed });
      } else {
        sim = await simulate({ ...base, onProgress: setProgress });
      }
      await storeSim(db, runId, sim.trades, sim.tradingDays, sim.gapDays.length);
    }
    await db.from('backtest_runs').update({ status: 'done', progress: 100, finished_at: new Date().toISOString() }).eq('id', runId);
    await recomputeGate(db, run.rule_id);
  } catch (err) {
    await db
      .from('backtest_runs')
      .update({ status: 'failed', error: (err as Error).message, finished_at: new Date().toISOString() })
      .eq('id', runId);
  }
}

async function storeSim(db: SupabaseClient, runId: string, trades: SimTrade[], tradingDays: string[], gapDays: number) {
  const windowStart = tradingDays[0];
  const windowEnd = tradingDays[tradingDays.length - 1];
  const oosStart = oosStartDate(tradingDays);
  const isTrades = trades.filter((t) => t.tradeDate < oosStart);
  const oosTrades = trades.filter((t) => t.tradeDate >= oosStart);
  const all = computeMetrics(trades, fullYearsBetween(windowStart, windowEnd));
  const inS = computeMetrics(isTrades, fullYearsBetween(windowStart, prevDay(tradingDays, oosStart)));
  const oos = computeMetrics(oosTrades, fullYearsBetween(oosStart, windowEnd));

  await db.from('backtest_trades').delete().eq('run_id', runId);
  const rows = trades.map((t) => ({
    run_id: runId,
    trade_date: t.tradeDate,
    side: t.side,
    entry_time: t.entryTime.toISOString(),
    entry: t.entry,
    stop: t.stop,
    target: t.target,
    exit_time: t.exitTime.toISOString(),
    exit: t.exit,
    exit_reason: t.exitReason,
    r_gross: t.rGross,
    cost_r: t.costR,
    r_net: t.rNet,
    is_oos: t.tradeDate >= oosStart,
  }));
  for (let k = 0; k < rows.length; k += PAGE) {
    const { error } = await db.from('backtest_trades').insert(rows.slice(k, k + PAGE));
    if (error) throw new Error(`Saving trades failed: ${error.message}`);
  }
  await db
    .from('backtest_runs')
    .update({
      window_start: windowStart,
      window_end: windowEnd,
      oos_start: oosStart,
      gap_days: gapDays,
      trades: oos.trades,
      win_rate: oos.winRate,
      net_pnl_r: oos.netR,
      profit_factor: oos.profitFactor,
      max_drawdown_r: oos.maxDrawdownR,
      per_year: all.perYear,
      in_sample: inS,
      out_of_sample: { ...oos, equity: equityCurve(oosTrades) },
    })
    .eq('id', runId);
}

async function storeBuyHold(db: SupabaseClient, runId: string, bars: Bar[]) {
  // Daily closes from 5m bars (last bar of each IST day), after warm up like the rules.
  const byDay = new Map<string, number>();
  for (const b of bars) byDay.set(istDate(b.t), b.c);
  const closes = [...byDay.entries()].map(([date, c]) => ({ date, c })).slice(20);
  if (closes.length < 2) throw new Error('Not enough history for buy and hold.');
  const days = closes.map((c) => c.date);
  const oosStart = oosStartDate(days);
  const windowEnd = days[days.length - 1];
  const oos = buyAndHold(closes.filter((c) => c.date >= oosStart), fullYearsBetween(oosStart, windowEnd));
  const all = buyAndHold(closes, fullYearsBetween(days[0], windowEnd));
  await db
    .from('backtest_runs')
    .update({
      window_start: days[0],
      window_end: windowEnd,
      oos_start: oosStart,
      trades: 1,
      per_year: all.perYear,
      in_sample: buyAndHold(closes.filter((c) => c.date < oosStart), fullYearsBetween(days[0], prevDay(days, oosStart))),
      out_of_sample: oos,
    })
    .eq('id', runId);
}

/** Recomputes passed_gate for a rule's latest done run on each symbol (AC-7). */
export async function recomputeGate(db: SupabaseClient, ruleId: string): Promise<void> {
  if (ruleId === 'BASE_BUYHOLD') return;
  if (ruleId === 'BASE_COIN') {
    // Coin results changed: every guru rule's gate depends on them.
    for (const r of ['GJ_PDHL', 'MR_EMA_PIN', 'UP_ORB', 'SP_5EMA', 'AST_RG']) await recomputeGate(db, r);
    return;
  }
  const latest = await latestDoneRuns(db, [ruleId, 'BASE_COIN']);
  const bySymbol: Record<string, SymbolGate | undefined> = {};
  for (const s of SYMBOLS) {
    const run = latest.get(`${ruleId}|${s}`);
    const coin = latest.get(`BASE_COIN|${s}`);
    if (run?.out_of_sample) bySymbol[s] = gateForSymbol(run.out_of_sample as Metrics, coin ? Number(coin.net_pnl_r) : null);
  }
  const passed = ruleGate(bySymbol, [...SYMBOLS]);
  for (const s of SYMBOLS) {
    const run = latest.get(`${ruleId}|${s}`);
    if (!run) continue;
    await db
      .from('backtest_runs')
      .update({ passed_gate: passed, out_of_sample: { ...run.out_of_sample, gate: bySymbol[s] } })
      .eq('id', run.id);
  }
}

export async function latestDoneRuns(db: SupabaseClient, ruleIds?: string[]) {
  let q = db.from('backtest_runs').select('*').eq('status', 'done').order('created_at', { ascending: false });
  if (ruleIds) q = q.in('rule_id', ruleIds);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const map = new Map<string, any>();
  for (const r of data ?? []) {
    const k = `${r.rule_id}|${r.symbol}`;
    if (!map.has(k)) map.set(k, r);
  }
  return map;
}

function equityCurve(trades: SimTrade[]): number[] {
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  let eq = 0;
  // Keep at most 400 points for the UI.
  const step = Math.max(1, Math.ceil(sorted.length / 400));
  const out: number[] = [0];
  sorted.forEach((t, i) => {
    eq += t.rNet;
    if (i % step === 0 || i === sorted.length - 1) out.push(Math.round(eq * 100) / 100);
  });
  return out;
}

function prevDay(days: string[], d: string): string {
  const i = days.indexOf(d);
  return i > 0 ? days[i - 1] : d;
}

export function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}
