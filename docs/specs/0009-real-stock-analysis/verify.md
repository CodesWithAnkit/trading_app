# Verify: Real Stock Analysis and Outcome Tracking · spec 0009 · updated 2026-09-29
_Steps derived from spec 0009 acceptance criteria (universe revised to stream every F&O stock). `/check verify` runs these; `/test` locks the durable ones._
_Most steps need a live NSE session (weekday, 09:15 to 15:30 IST) with `MARKET_DATA_PROVIDER=angelone`. Exit tracking steps live in [spec 0010's verify.md](../0010-live-exit-tracking/verify.md)._

## Before the session
- [ ] `npm run scanner:angelone:smoke` (apps/backend) during market hours → Quote mode ticks carry `close_price` as the previous close, prices in paise, `exchange_timestamp` in milliseconds, `vol_traded` cumulative → AC-14
- [ ] Backend log at startup or 08:45 IST shows "Universe: 228 F&O stock(s) watched (… source file)" (the count may change monthly) → AC-12

## UI / manual
- [ ] At 09:10 IST open `/dashboard` → "Waiting for the market to open", no mock data, no ranked stocks → AC-1
- [ ] After 09:20 open `/dashboard` → Momentum Leaders ranks stocks gainers first; stocks with no previous close yet show "unranked" → AC-1, AC-14
- [ ] Approaching Setups and Active Signals update live without a reload (SSE), and only ever show top 20 gainers → AC-2, AC-4, AC-11, AC-16
- [x] Open `/dashboard/analysis/<SYMBOL>` directly in a new tab → shows the signal, the approaching card, or "No Active Analysis" → AC-5
- [ ] After 15:32 IST open `/dashboard` → "Calls vs Reality" with the "X signals fired today, Y were winners" badge → AC-9, AC-10

## Commands
- [ ] `GET /api/v1/scanner/diagnostics` → `universe: { stocks: 228, source: 'file', error: null }` → AC-12
- [ ] SQL `select count(*) from instruments where last_selected_on = current_date` → 228; `select symbol, instrument_token from instruments where symbol in ('RELIANCE','M&M','BAJAJ-AUTO')` → 2885, 2031, 16669; no NIFTY or BANKNIFTY rows → AC-12, AC-13
- [ ] Break the instrument download (for example, block the host in a throwaway run) → the backend streams the saved list, diagnostics shows `source: 'fallback'` and the error → AC-12
- [ ] Backend log shows "Requested Quote mode subscription for 228 token(s) in 5 request(s)" → AC-12
- [ ] `GET /api/v1/scanner/momentum` → each `dayChangePct` matches Angel's app change vs previous close for that stock (±0.05) → AC-1, AC-14
- [ ] SQL sum of today's 1m `candles.volume` for one stock ≈ its day volume in Angel's app → AC-14
- [x] SQL `select symbol, timeframe, start_time, count(*) from candles group by 1,2,3 having count(*) > 1` → no rows → AC-15
- [ ] SQL count of today's 1m candles grows by about 228 a minute during the session → AC-15
- [ ] Restart the backend around 11:00 IST → log "Reloaded today's saved candles for 228 stock(s)"; `watching` in `/scanner/momentum` returns to its earlier count; strategies resume on the next 5m close → AC-15
- [ ] Every signal row created today belongs to a stock that was in the top 20 gainers at its 5m close (compare with `/scanner/momentum` at that time) → AC-16
- [ ] `GET /api/v1/scanner/approaching` → setups sorted by `closestDistancePct` ascending, all within 1% → AC-2, AC-3
- [ ] After 15:32 IST, SQL `select actual_high, actual_low, actual_close, outcome_status from signals where created_at::date = current_date` → filled for every signal → AC-6, AC-7
- [x] `npm run scanner:reconcile -- <today>` twice → same values both times → AC-8
- [x] After the close, `npm run scanner:replay -- <today>` → replays the day from saved candles with no Angel login, lists entries and exits per strategy, writes nothing → AC-17
- [ ] Leave the backend running overnight → at 09:00 IST the next day, histories reset and the F&O list reloads → AC-12
- [x] `npx vitest run` (apps/backend) → all tests pass

## Acceptance-criteria coverage
- AC-1 … waiting state, momentum ranking, momentum endpoint
- AC-2, AC-3 … approaching UI and endpoint
- AC-4, AC-11 … live SSE updates
- AC-5 … direct analysis navigation
- AC-6, AC-7, AC-8 … reconciliation SQL and CLI rerun
- AC-9, AC-10 … after hours comparison
- AC-12 … startup log, diagnostics, fallback, chunked subscribe, daily reload
- AC-13 … instruments rows and tokens
- AC-14 … smoke check, day change match, candle volume sum
- AC-15 … no duplicate candles, write volume, restart reload
- AC-16 … top 20 gate on signals and approaching
- AC-17 … replay from saved candles
