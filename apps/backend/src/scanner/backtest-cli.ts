// Backtest lab CLI (spec 0020 AC-1, AC-8). Run from apps/backend.
//   npm run backtest -- --backfill NIFTY,SENSEX
//   npm run backtest -- --run all --symbols NIFTY,SENSEX
//   npm run backtest -- --run UP_ORB --symbols NIFTY
import { SupabaseService } from '../supabase/supabase.service.js';
import { downloadIndexInstruments } from './universe/instrumentFile.js';
import { backfill, createHistoryFetcher, resolveProvider } from '../backtest/history/backfill.js';
import { executeRun, latestDoneRuns, Lots, queueRuns, recoverRuns, RULE_IDS } from '../backtest/runner.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const list = (v?: string) => (v ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

async function main() {
  const { client: db } = new SupabaseService();
  if (!db) fail('Missing Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');

  console.error('Reading index tokens and lot sizes from the Angel One instrument file…');
  const instruments = await downloadIndexInstruments();
  const lots = Object.fromEntries(instruments.map((i) => [i.symbol, i.lot])) as Lots;
  console.error(instruments.map((i) => `${i.symbol} ${i.exchange} token ${i.token} lot ${i.lot}`).join(' · '));

  const bf = arg('backfill');
  if (bf) {
    const want = list(bf);
    const provider = resolveProvider(arg('provider'));
    console.error(`History provider: ${provider}`);
    const fetcher = await createHistoryFetcher(provider);
    const res = await backfill({
      db,
      fetcher,
      provider,
      instruments: instruments.filter((i) => want.includes(i.symbol)),
      onEvent: (e) => {
        if (e.type === 'chunk') console.error(`${e.symbol} ${e.timeframe} ${e.from}..${e.to} · ${e.rows} rows · chunk ${e.chunk}/${e.chunks}`);
        else if (e.type === 'retry') console.error(`RETRY ${e.symbol} ${e.timeframe} ${e.from} attempt ${e.attempt}: ${e.error}`);
        else if (e.type === 'resume') console.error(`RESUME ${e.symbol} ${e.timeframe} from ${e.from}`);
        else if (e.type === 'unavailable') console.error(`UNAVAILABLE ${e.symbol} ${e.timeframe}: no history from ${e.provider}`);
        else console.error(`DONE ${e.symbol} ${e.timeframe} · ${e.rows} rows`);
      },
    });
    console.log(`Backfill complete: ${res.rows} candles stored.`);
  }

  const run = arg('run');
  if (run) {
    const ruleIds = run.toLowerCase() === 'all' ? [...RULE_IDS] : list(run);
    const symbols = list(arg('symbols') ?? 'NIFTY,SENSEX');
    const leftover = await recoverRuns(db);
    if (leftover.length) console.error(`Picking up ${leftover.length} queued run(s) left from before.`);
    // A conflict on the new request (409, all or nothing) must not strand the leftovers we just picked up.
    let queued: string[] = [];
    let queueError: Error | null = null;
    try {
      queued = await queueRuns(db, { ruleIds, symbols });
    } catch (err) {
      queueError = err as Error;
      console.error(queueError.message);
    }
    const ids = [...leftover, ...queued];
    for (const id of ids) {
      const t0 = Date.now();
      await executeRun(db, id, lots);
      const { data } = await db.from('backtest_runs').select('rule_id,symbol,status,error').eq('id', id).single();
      console.error(`${data?.rule_id} · ${data?.symbol}: ${data?.status}${data?.error ? ` (${data.error})` : ''} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    console.log(await leaderboard(db));
    const note = await gateNote(db);
    if (note) console.log(note);
    if (queueError) fail(`New runs were not queued: ${queueError.message}`);
  }

  if (!bf && !run) fail('Pass --backfill NIFTY,SENSEX and/or --run all|RULE_ID [--symbols NIFTY,SENSEX].');
}

async function leaderboard(db: any): Promise<string> {
  const latest = await latestDoneRuns(db);
  const lines = ['', 'RULE · SYMBOL            OOS TRADES  WIN%   NET R    PF    MAX DD  GATE'];
  for (const r of [...latest.values()].sort((a, b) => a.rule_id.localeCompare(b.rule_id) || a.symbol.localeCompare(b.symbol))) {
    if (r.rule_id === 'BASE_BUYHOLD') {
      const o = r.out_of_sample ?? {};
      lines.push(`${`${r.rule_id} · ${r.symbol}`.padEnd(24)} return ${o.returnPct}%  max DD ${o.maxDrawdownPct}%  (not gated)`);
      continue;
    }
    if (r.out_of_sample?.unavailable) {
      lines.push(`${`${r.rule_id} · ${r.symbol}`.padEnd(24)} no history from ${r.out_of_sample.provider} (NO DATA)`);
      continue;
    }
    const gate = r.rule_id === 'BASE_COIN' ? 'BASELINE' : r.passed_gate ? 'PASS' : 'FAIL';
    lines.push(
      `${`${r.rule_id} · ${r.symbol}`.padEnd(24)} ${String(r.trades).padStart(10)}  ${(Number(r.win_rate) * 100).toFixed(1).padStart(4)}  ${Number(r.net_pnl_r).toFixed(1).padStart(6)}  ${Number(r.profit_factor).toFixed(2).padStart(5)}  ${Number(r.max_drawdown_r).toFixed(1).padStart(6)}  ${gate}`,
    );
  }
  return lines.join('\n');
}

/** spec 0022 AC-5: say plainly when the gate was judged on fewer symbols. */
async function gateNote(db: any): Promise<string | null> {
  const latest = await latestDoneRuns(db);
  for (const r of latest.values()) {
    const g = r.out_of_sample?.gate;
    if (g?.unavailable?.length) {
      const missing = g.unavailable.map((u: { symbol: string; provider: string }) => `${u.symbol} history unavailable from ${u.provider}`).join(', ');
      return g.judgedOn.length ? `Gate judged on ${g.judgedOn.join(' + ')} only: ${missing}.` : `Gate not judged: ${missing}.`;
    }
  }
  return null;
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

main().catch((err) => fail(err?.message ?? String(err)));
