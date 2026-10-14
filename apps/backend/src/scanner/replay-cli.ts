// Replays a trading day from our own saved candles through the live strategy engine, to
// validate entries and exits (spec 0009 AC-17). Read only: nothing is written anywhere.
// Usage: npm run scanner:replay -- [YYYY-MM-DD] [SYMBOL,SYMBOL,...] [--json <path>]
//   No symbols: that day's F&O list from `instruments` (last_selected_on = that day).
import { writeFileSync } from 'node:fs';
import { SupabaseService } from '../supabase/supabase.service.js';
import { Candle } from './market-data/types.js';
import { replayDay, summarize, ReplayTrade } from './replay/replayDay.js';
import { istDateString, istDateTimeString, istDayRange, isValidDateString } from './time/ist.js';

const PAGE_SIZE = 1000;

async function main() {
  const args = process.argv.slice(2);
  const jsonAt = args.indexOf('--json');
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : undefined;
  const positional = args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1));
  const date = positional.find(isValidDateString) ?? istDateString();
  const symbolArg = positional.find(a => !isValidDateString(a));

  const { client } = new SupabaseService();
  if (!client) fail('Missing Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');

  let symbols: string[];
  if (symbolArg) {
    symbols = symbolArg.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  } else {
    const { data, error } = await client.from('instruments').select('symbol').eq('last_selected_on', date);
    if (error) fail(`Failed to load the F&O list for ${date}: ${error.message}`);
    symbols = (data || []).map(r => r.symbol as string).sort();
    if (symbols.length === 0) fail(`No F&O list saved for ${date}. Pass symbols explicitly.`);
  }

  const { sessionStart, sessionEnd } = istDayRange(date);
  const bySymbol = new Map<string, Candle[]>();
  const skipped: string[] = [];
  for (const symbol of symbols) {
    const candles = await loadCandles(client, symbol, sessionStart, sessionEnd);
    if (candles.length === 0) skipped.push(symbol);
    else bySymbol.set(symbol, candles);
  }
  console.error(`Replaying ${bySymbol.size} stock(s) with saved candles for ${date}${skipped.length ? `; ${skipped.length} had none` : ''}.`);

  const trades = replayDay(bySymbol);
  console.log(report(date, bySymbol.size, trades, skipped));
  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ date, symbols: [...bySymbol.keys()], skipped, summary: summarize(trades), trades }, null, 2));
    console.error(`JSON written to ${jsonPath}`);
  }
}

async function loadCandles(client: NonNullable<SupabaseService['client']>, symbol: string, from: Date, to: Date): Promise<Candle[]> {
  const candles: Candle[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from('candles')
      .select('instrument_token, start_time, open, high, low, close, volume')
      .eq('symbol', symbol)
      .eq('timeframe', '1m')
      .gte('start_time', from.toISOString())
      .lt('start_time', to.toISOString())
      .order('start_time', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) fail(`Failed to load candles for ${symbol}: ${error.message}`);
    for (const r of data || []) {
      const startTime = new Date(r.start_time);
      candles.push({
        symbol, instrumentToken: r.instrument_token ?? '', timeframe: '1m',
        open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume),
        startTime, endTime: new Date(startTime.getTime() + 60_000), isComplete: true
      });
    }
    if (!data || data.length < PAGE_SIZE) return candles;
  }
}

function report(date: string, stockCount: number, trades: ReplayTrade[], skipped: string[]): string {
  const hhmm = (iso: string | null) => (iso ? istDateTimeString(new Date(iso)).slice(11) : '15:15');
  const lines = [
    `# Strategy replay · ${date} · ${stockCount} stock(s)`,
    '',
    'Same rules as live: strategies run on each 5m close, only the top 20 gainers may open a plan (approximated from each stock\'s first open of the day, since the previous close is not stored), one open plan per stock and strategy, no new plan from 15:15. Exits: first candle to touch the stop (LOST) or target (WON), else a time exit at 15:15 (NEUTRAL). A candle touching both counts as LOST. No costs or slippage.',
    '',
    '## Results by strategy',
    '',
    '| Strategy | Trades | Won | Lost | Time exit | Win % | Avg P&L % | Total P&L % |',
    '|---|---|---|---|---|---|---|---|',
    ...summarize(trades).map(s => `| ${s.setup} | ${s.trades} | ${s.won} | ${s.lost} | ${s.neutral} | ${s.winRatePct} | ${s.avgPnlPct} | ${s.totalPnlPct} |`),
    '',
    '## Every entry and exit',
    '',
    '| Stock | Strategy | Entry time | Entry | Stop | Target | R:R | Result | Exit time | Exit | P&L % | Notes |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...trades.map(t => `| ${t.symbol} | ${t.setup} | ${hhmm(t.firedAt)} | ${t.entry} | ${t.stop} | ${t.target} | ${t.riskReward} | ${t.outcome === 'NEUTRAL' ? 'TIME EXIT' : t.outcome} | ${hhmm(t.exitAt)} | ${t.exitPrice} | ${t.pnlPct} | ${t.planIssues.join('; ')} |`),
  ];
  if (trades.length === 0) lines.push('', 'No strategy fired on any stock.');
  if (skipped.length > 0) lines.push('', `No saved candles: ${skipped.join(', ')}`);
  return lines.join('\n');
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main().catch(err => fail(err?.message ?? String(err)));
