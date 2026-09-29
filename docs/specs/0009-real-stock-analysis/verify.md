# Verify: Real Stock Analysis and Outcome Tracking · spec 0009 · updated 2026-09-29
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Most steps need a live NSE session (weekday, 09:15 to 15:30 IST) with `MARKET_DATA_PROVIDER=angelone`._

## Before the session (smoke checks from the spec's Follow-up)
- [ ] `npm run scanner:angelone:smoke` (apps/backend) during market hours → Quote mode ticks carry `close_price` as the previous close, prices in paise, `exchange_timestamp` in milliseconds, `vol_traded` cumulative → AC-14
- [ ] `searchScrip` for `M&M` returns exactly one NSE `M&M-EQ` row → AC-13

## UI / manual
- [ ] At 09:10 IST open `/dashboard` → "Waiting for today's gainers. Next pull at 09:22 IST", 0 watched stocks, no mock data → AC-1
- [ ] After 09:22 open `/dashboard` → Momentum Leaders lists gainers ranked by score, gainers first; stocks with no previous close yet show "unranked" → AC-1, AC-14
- [ ] Approaching Setups and Active Signals update live without a reload (SSE) → AC-2, AC-4, AC-11
- [ ] Open `/dashboard/analysis/<SYMBOL>` directly in a new tab → shows the signal, the approaching card, or "No Active Analysis" → AC-5
- [ ] After 15:32 IST open `/dashboard` → "Calls vs Reality" with WON/LOST/NEUTRAL and the "X signals fired today, Y were winners" badge → AC-9, AC-10

## Commands
- [ ] `GET /api/v1/scanner/diagnostics` after 09:22 → `universe.gainers > 0`, recent `lastRefreshAt`, `lastRefreshError` null, `nextRefreshAt` = next quarter hour slot (09:37, …) → AC-12
- [ ] SQL `select symbol, instrument_token, last_selected_on from instruments where last_selected_on = current_date` → today's gainers, base symbols (no `-EQ`), no NIFTY/BANKNIFTY/FINNIFTY/MIDCPNIFTY rows → AC-12, AC-13
- [ ] `GET /api/v1/scanner/momentum` → each `dayChangePct` matches Angel's app change vs previous close for that stock (±0.05) → AC-1, AC-14
- [ ] SQL sum of today's 1m `candles.volume` for one stock since it joined ≈ its day volume change in Angel's app over the same span → AC-14
- [ ] Backend log shows "Backfilled N 1m candle(s) for <SYMBOL>" for a stock added at 09:37 or later; SQL shows its 1m candles from 09:15 → AC-15
- [ ] SQL `select symbol, timeframe, start_time, count(*) from candles group by 1,2,3 having count(*) > 1` → no rows → AC-15
- [ ] Restart the backend around 11:00 IST → today's stocks subscribed again and backfilled before the next slot; `watching` in `/scanner/momentum` returns to its earlier count → AC-13, AC-15
- [ ] Force a failed pull (for example a wrong API key in a throwaway run) → watched stocks unchanged, `lastRefreshError` set, next slot retries; the 09:22 slot retries once after 60 s → AC-12
- [ ] Leave the backend running overnight → at 09:00 IST the next day `watching` drops to 0 until the 09:22 pull → AC-12, AC-13
- [ ] `GET /api/v1/scanner/approaching` → setups sorted by `closestDistancePct` ascending, all within 1% → AC-2, AC-3
- [ ] After 15:32 IST, SQL `select actual_high, actual_low, actual_close, outcome_status from signals where created_at::date = current_date` → filled for every signal; a stock added mid session has session wide high/low from 09:15 → AC-6, AC-7, AC-15
- [ ] `npm run scanner:reconcile -- <today>` twice → same values both times → AC-8
- [ ] `npx vitest run` (apps/backend) → all tests pass

## Acceptance-criteria coverage
- AC-1 … dashboard waiting state, momentum ranking, momentum endpoint
- AC-2, AC-3 … approaching UI and endpoint
- AC-4, AC-11 … live SSE updates
- AC-5 … direct analysis navigation
- AC-6, AC-7, AC-8 … reconciliation SQL and CLI rerun
- AC-9, AC-10 … after hours comparison
- AC-12 … diagnostics, instruments rows, failed pull, daily reset
- AC-13 … token matching, restart recovery
- AC-14 … smoke check, day change match, candle volume sum
- AC-15 … backfill log, duplicate check, session wide high/low
