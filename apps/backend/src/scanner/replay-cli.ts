// Replays a full trading day through the live strategy engine to validate entries and exits.
// Read only: nothing is written to signals or candles.
// Usage: npm run scanner:replay -- [YYYY-MM-DD] [SYMBOL,SYMBOL,...] [--json <path>]
//   No symbols: today's Angel One F&O price gainers (the live universe). That list has no
//   date parameter, so a past date needs explicit symbols.
import { writeFileSync } from 'node:fs';
import { config } from './config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';
import { Candle } from './market-data/types.js';
import { extractGainerSymbols, pickEquityToken } from './universe/gainers.js';
import { replaySymbol, summarize, ReplayTrade } from './replay/replayDay.js';
import { istDateString, istDateTimeString, istDayRange, isValidDateString } from './time/ist.js';

async function main() {
  const args = process.argv.slice(2);
  const jsonAt = args.indexOf('--json');
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : undefined;
  const positional = args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1));
  const date = positional.find(isValidDateString) ?? istDateString();
  const symbolArg = positional.find(a => !isValidDateString(a));

  if (!config.angelOne.apiKey || !config.angelOne.clientCode || !config.angelOne.totpSecret) {
    fail('Missing Angel One credentials (ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_ID, ANGEL_ONE_TOTP_SECRET).');
  }
  const angel = new AngelOneMarketDataProvider(config.angelOne);
  await angel.loginForRest();

  let symbols: string[];
  if (symbolArg) {
    symbols = symbolArg.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  } else {
    if (date !== istDateString()) fail(`Angel's gainers list is always the latest session; pass symbols to replay ${date}.`);
    const { symbols: gainers } = extractGainerSymbols(await angel.fetchFnoPriceGainers());
    if (gainers.length === 0) fail('Angel returned no F&O price gainers. Pass symbols explicitly.');
    symbols = gainers;
    console.error(`Today's F&O price gainers: ${symbols.join(', ')}`);
  }

  const { client } = new SupabaseService();
  const { sessionStart, sessionEnd } = istDayRange(date);
  const to = new Date(Math.min(sessionEnd.getTime(), Date.now()));
  const trades: ReplayTrade[] = [];
  const skipped: string[] = [];

  for (const symbol of symbols) {
    const token = await resolveToken(symbol, angel, client);
    if (!token) {
      skipped.push(`${symbol} (no single NSE ${symbol}-EQ match)`);
      continue;
    }
    const rows = await angel.getCandles1m(token, sessionStart, to);
    const candles: Candle[] = rows
      .filter(r => r.startTime < to)
      .map(r => ({ ...r, symbol, instrumentToken: token, timeframe: '1m', endTime: new Date(r.startTime.getTime() + 60_000), isComplete: true }));
    if (candles.length === 0) {
      skipped.push(`${symbol} (no candles for ${date})`);
      continue;
    }
    trades.push(...replaySymbol(symbol, candles));
    console.error(`${symbol}: ${candles.length} 1m candles replayed`);
  }

  console.log(report(date, symbols, trades, skipped));
  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ date, symbols, skipped, summary: summarize(trades), trades }, null, 2));
    console.error(`JSON written to ${jsonPath}`);
  }
}

async function resolveToken(symbol: string, angel: AngelOneMarketDataProvider, client: SupabaseService['client']): Promise<string | null> {
  if (client) {
    const { data } = await client.from('instruments').select('instrument_token').eq('symbol', symbol).eq('exchange', 'NSE').limit(1);
    if (data?.[0]?.instrument_token) return data[0].instrument_token as string;
  }
  return pickEquityToken(await angel.searchScrip(symbol), symbol);
}

function report(date: string, symbols: string[], trades: ReplayTrade[], skipped: string[]): string {
  const hhmm = (iso: string | null) => (iso ? istDateTimeString(new Date(iso)).slice(11) : '15:30');
  const lines = [
    `# Strategy replay · ${date} · ${symbols.length} stock(s)`,
    '',
    'Entries are at the close of the 1m candle that triggered on a 5m close. Exits are the first candle to touch the stop (LOST) or target (WON), else the 15:30 close (NEUTRAL). A candle touching both counts as LOST. No costs or slippage.',
    '',
    '## Results by strategy (first signals only; repeats excluded)',
    '',
    '| Strategy | Trades | Won | Lost | Neutral | Win % | Avg P&L % | Total P&L % |',
    '|---|---|---|---|---|---|---|---|',
    ...summarize(trades).map(s => `| ${s.setup} | ${s.trades} | ${s.won} | ${s.lost} | ${s.neutral} | ${s.winRatePct} | ${s.avgPnlPct} | ${s.totalPnlPct} |`),
    '',
    '## Every entry and exit',
    '',
    '| Stock | Strategy | Entry time | Entry | Stop | Target | R:R | Result | Exit time | Exit | P&L % | Notes |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...trades.map(t => `| ${t.symbol} | ${t.setup} | ${hhmm(t.firedAt)} | ${t.entry} | ${t.stop} | ${t.target} | ${t.riskReward} | ${t.outcome} | ${hhmm(t.exitAt)} | ${t.exitPrice} | ${t.pnlPct} | ${[t.repeat ? 'repeat while open' : '', ...t.planIssues].filter(Boolean).join('; ')} |`),
  ];
  if (trades.length === 0) lines.push('', 'No strategy fired on any stock.');
  if (skipped.length > 0) lines.push('', `Skipped: ${skipped.join(', ')}`);
  return lines.join('\n');
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main().catch(err => fail(err?.message ?? String(err)));
