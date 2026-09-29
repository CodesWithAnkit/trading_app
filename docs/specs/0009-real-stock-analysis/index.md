---
status: In Progress
date: 2026-09-29
---

# 0009. Real Stock Analysis and Outcome Tracking

**Date**: 2026-09-29
**Status**: In Progress
**Updated**: 2026-09-29 (AC-1 stock universe revised; AC-12 to AC-15 added)

## Summary

Replaces the mock data fallback on the dashboard and analysis page with real stock data from Angel One. The watched stocks are today's top gainers only, taken from Angel One's futures and options (F&O) gainers list and mapped to the matching NSE cash stock, because Angel has no gainers list for cash stocks. Adds "approaching" setups (stocks close to triggering a strategy), a daily momentum score to rank all watched stocks, real time updates via Server Sent Events (SSE), and end of day outcome reconciliation that compares our predictions against actual price movement. After market hours, users see a comparison view showing how each signal performed.

## Requirements

**User stories**:
- As a trader, I want the dashboard to show real bullish stocks from the market (not hardcoded mock data) so that I can act on live opportunities.
- As a trader, I want to see stocks that are "approaching" a strategy trigger so I can prepare before the signal fires.
- As a trader, I want to see after market hours how my signals performed against actual price movement so I can learn from the system's accuracy.

**Acceptance criteria**:
- **AC-1**: During market hours, the dashboard ranks every watched stock by a daily momentum score (% change from the previous close * relative volume * trend alignment), gainers first, with no mock data fallback. The watched stocks are only today's top gainers from Angel One's F&O price gainers list, mapped to their NSE cash stock. Before the first gainers pull (09:22), the dashboard shows an honest "waiting for today's gainers" state.
- **AC-2**: Stocks that are within 1% of triggering a strategy are shown as "Approaching" setups with a lightweight review card (current price, day change %, volume, and which strategies are close to triggering).
- **AC-3**: A new `GET /api/v1/scanner/approaching` endpoint returns approaching setups ranked by proximity to trigger, refreshed in real time.
- **AC-4**: The frontend receives approaching and triggered setup updates via Server Sent Events (SSE) from NestJS, with no polling.
- **AC-5**: The analysis page at `/dashboard/analysis/[symbol]` works when navigated to directly (not only from a signal card click), by fetching the latest signal for that symbol from the API.
- **AC-6**: The `signals` table gains `actual_high`, `actual_low`, `actual_close` columns, populated by an end of day reconciliation task.
- **AC-7**: A scheduled NestJS cron task runs at 15:32 IST (Monday to Friday) to query the `candles` table for each signal's symbol and write the actual high, low, and close into the signals table.
- **AC-8**: A standalone CLI script can also trigger the reconciliation manually (for backfills or reruns).
- **AC-9**: After market hours, the dashboard shows a comparison view: "We said Entry at X, it went to Y, result +Z%" for each signal fired that day.
- **AC-10**: A summary badge shows "X signals fired today, Y were winners" on the dashboard after hours.
- **AC-11**: The `SignalContext` gains an `approachingSignals` category alongside `activeSignals` and `expiredSignals`, fed by SSE.
- **AC-12**: At 09:22 IST, and then every 15 minutes until 15:22 IST on weekdays, the scanner pulls Angel One's F&O price gainers (`gainersLosers`, `PercPriceGainers`, near expiry). It maps each future to its underlying cash symbol, keeps one entry per underlying, drops index underlyings (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY), and starts streaming any stock it isn't already watching. Stocks are only ever added during a session, never dropped. There is no cap beyond what the API returns. If the 09:22 pull fails, it is retried once after 60 seconds.
- **AC-13**: Each watched stock's NSE cash token is found once with SmartAPI `searchScrip` and cached in the `instruments` table under its base name (`RELIANCE`, not `RELIANCE-EQ`). Only a result whose `tradingsymbol` is exactly `<SYMBOL>-EQ` on NSE counts. Zero or several matches means the stock is skipped for the day. The row records the IST day the stock was last selected. A backend restart during the session rebuilds today's universe from these rows.
- **AC-14**: The live stream uses Quote mode, so each tick carries the day's open, high, low, previous close, and cumulative day volume. Day change % is measured against the previous close. A stock with no previous close yet shows as unranked (score 0) rather than a wrong number. Candle volume is the change in cumulative day volume between ticks.
- **AC-15**: When a stock joins mid session, or is restored after a restart, today's completed 1m candles since 09:15 are backfilled from SmartAPI `getCandleData`. They are saved to `candles` (upsert, no duplicates) and seeded into the in memory history, and its 5m history is rebuilt from them. Until the backfill finishes the stock is "warming" and skips strategy checks. After that, strategies, approaching checks, and the opening range work on it right away, and end of day reconciliation sees its full session.

## Decision

We enhance the existing scanner pipeline and dashboard to eliminate mock data entirely. The approach uses the existing Angel One integration for the live stock universe, extends the multi strategy engine to detect "approaching" conditions, adds SSE for real time push, and adds a cron plus CLI based reconciliation for outcome tracking.

**Stock universe (AC-1, AC-12 to AC-15).** Watched stocks = Angel One's F&O price gainers mapped to their cash stock, and nothing else (no pinned list). It refreshes every 15 minutes, only ever adds stocks, has no cap, and caches tokens in `instruments`. The feed switches to Quote mode, and stocks added mid session get today's 1m candles backfilled. Angel One is the only source: its `gainersLosers` list covers F&O only, so the universe is limited to stocks that have futures. We accept that because those are the liquid names intraday trading wants anyway. Options weighed: [rationale.md](rationale.md#stock-universe-ac-1-revision).

**Implementation skills**: `supabase` (`.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`.agents/skills/supabase-postgres-best-practices/`) · `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Rationale

See [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Entity | Field | Type | Notes |
|---|---|---|---|
| `signals` (existing) | `actual_high` | NUMERIC | Nullable, populated by EOD reconciliation |
| `signals` (existing) | `actual_low` | NUMERIC | Nullable, populated by EOD reconciliation |
| `signals` (existing) | `actual_close` | NUMERIC | Nullable, populated by EOD reconciliation |
| `signals` (existing) | `outcome_status` | TEXT | Nullable: WON, LOST, NEUTRAL (derived from actual vs targets) |
| `signals` (existing) | `outcome_pnl_pct` | NUMERIC | Nullable: percentage gain or loss |
| `instruments` (existing) | `last_selected_on` | DATE | Nullable. The IST day the stock was last in the universe. |
| `candles` (existing) | unique `(symbol, timeframe, start_time)` | constraint | New. Every candle write becomes an upsert on this key, so backfill, restarts, and reconnects never create duplicate candles. The migration first deletes existing duplicates, keeping the latest `created_at` per key. |

No new tables needed. The `instruments` table (core schema: `id`, `symbol`, `exchange`, `instrument_token` UNIQUE, `status`, `last_price`) and the `candles` table already exist. Upsert key for `instruments` is `instrument_token`. Today's universe = rows with `last_selected_on` = today (IST). `instruments.symbol` holds the base name that `candles`, `signals`, and the web app already use. The scanner reads `instrument_token`, not `token`. The `token` and `is_active` columns from `20260929161500_create_instruments_table.sql` never applied, because the table already existed.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/scanner/approaching` | GET | none | `{ data: ApproachingSetup[] }` | none (internal) | 500 if DB fails |
| `/api/v1/scanner/top-setups` | GET (enhanced) | `?include=approaching` | `{ data: Signal[], approaching: ApproachingSetup[] }` | none | 500 |
| `/api/v1/scanner/outcomes` | GET | `?date=YYYY-MM-DD` | `{ data: SignalOutcome[], summary: { total, winners, losers } }` | none | 500, 404 if no signals |
| `/api/v1/scanner/stream` | GET (SSE) | none | EventSource stream of `signal:new`, `approaching:update` | none | connection errors |
| `/api/v1/scanner/reconcile` | POST | `{ date?: string }` | `{ reconciled: number }` | none | 500 |
| `/api/v1/scanner/analysis/:symbol` | GET | symbol param | `{ signal?: Signal, approaching?: ApproachingSetup }` | none | 404 if no data |
| `/api/v1/scanner/momentum` | GET | none | `{ watching, data: MomentumStock[] }` (unchanged shape) | none | none |
| `/api/v1/scanner/diagnostics` | GET (enhanced) | none | adds `universe: { gainers, lastRefreshAt, lastRefreshError, nextRefreshAt }` | none | none |

Angel One calls (all through the logged in session the feed provider already holds): `gainersLosers({ datatype: 'PercPriceGainers', expirytype: 'NEAR' })`, `searchScrip({ exchange: 'NSE', searchscrip })`, `getCandleData({ exchange: 'NSE', symboltoken, interval: 'ONE_MINUTE', fromdate, todate })`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Daily momentum score | `% change * relativeVolume * trendAlignment` | % change = `(ltp - prevClose) / prevClose * 100`, where `prevClose` is the Quote mode tick's `close_price`, stored on `MarketTick` and `latestTicks`; missing or 0 means unranked (score 0). Relative volume = last completed 5m volume / mean volume of the earlier 5m candles, 1 when fewer than 2 exist or the mean is 0. Trend alignment from the 5m EMA 9/21 cross: UP 1, UNKNOWN 0.5 (fewer than 21 candles), DOWN 0.25. Always positive, so the score's sign is the sign of the day change, and gainers rank first. |
| Watched stocks | symbol list | `gainersLosers` response `tradingSymbol` only, underlying = the text before the trailing `DDMMMYYFUT` (regex `^(.+?)\d{2}[A-Z]{3}\d{2}FUT$`) |
| Cash token | `instrument_token` | `instruments` row if present, else `searchScrip` result whose `tradingsymbol` equals `<SYMBOL>-EQ` |
| Day open, high, low, previous close | tick fields | Quote mode tick `open_price_day`, `high_price_day`, `low_price_day`, `close_price`, strings in paise, divide by 100 |
| Candle volume | per candle volume | change in the Quote mode tick's cumulative `vol_traded` since that symbol's last seen value, added to the candle the tick's timestamp falls in. The first tick after a start, reconnect, or daily reset only sets the starting point (adds 0). A drop counts as 0 and resets the starting point. |
| Token to symbol | `symbol` on each tick | the universe service's token to symbol map (from `instruments`), handed to `TickNormalizer`; replaces the normalizer's hardcoded map and the scanner's separate map. Tokens are cleaned of quotes and NUL bytes. |
| History for a stock added mid session or restored | 1m and 5m candle history | `getCandleData` 1m candles from 09:15 IST today up to, but not including, the current minute (`fromdate`/`todate` as `YYYY-MM-DD HH:mm` IST); 5m built from complete 5 minute groups only |
| Approaching status | distance to trigger (%) per strategy | `multiStrategyEngine` proximity check against current candle data |
| Actual outcome | `actual_high`, `actual_low`, `actual_close` | `candles` table, queried by symbol and date range (09:15 to 15:30) |
| Outcome WON/LOST | comparison of `actual_high` vs `target_1` (LONG) or `actual_low` vs `target_1` (SHORT) | `signals.target_1`, `signals.direction`, `signals.actual_high/low` |
| User's local day | IST (hardcoded, Indian market only) | `Asia/Kolkata` timezone constant |

**Key invariants**:
- No mock data is ever shown during market hours. If the scanner has no data, show an honest "Scanner is starting up, watching N stocks" state.
- Outcome reconciliation is idempotent: running it twice for the same date writes the same values.
- SSE connections are cleaned up on client disconnect.
- The universe only grows during a session: a stock is never unsubscribed before 15:30, so its history and any open signal stay intact.
- A failed or empty gainers call never shrinks or clears the universe. The scanner keeps streaming what it has, records the error for diagnostics, and tries again at the next 15 minute slot.
- Only one universe refresh runs at a time. A slot that fires while the previous refresh is still running is skipped.
- A symbol whose underlying can't be parsed, or has no exact `-EQ` match, is skipped and logged, never guessed.
- The 1m history holds a full session (400 candles) and the 5m history 80, so the opening range (the first 15 1m candles of the day) stays real all day.
- `subscribe()` merges new tokens into one set; it never replaces the set. A reconnect replays the full set, all in Quote mode.
- A token is registered in the token to symbol map before it is subscribed, so no tick ever arrives as `UNKNOWN_<token>`.
- An empty or failed gainers response is a failure, not "no gainers": nothing is stamped, nothing is dropped.
- Every refresh stamps `last_selected_on` = today on every stock it returns, including ones already known.
- A daily reset at 09:00 IST clears the in memory universe, candle histories, volume starting points, and the skip list, because the process can run across days. Yesterday's rows are not restored.
- Angel One REST calls (gainers, `searchScrip`, `getCandleData`) run one at a time, about 400 ms apart, retry once on a rate limit error, and log in again and retry once on an auth error.
- Backfilled candles merge with live ones by `start_time`; a later write for the same key replaces the earlier one.

**Security model**:
No auth changes needed. All endpoints are internal (same origin). Outcome data is read only from the frontend.

**Configuration required**:
- No new env vars needed. The existing `MARKET_DATA_PROVIDER` and Angel One credentials are sufficient.
- `SCANNER_INSTRUMENTS` is no longer read. Remove it from `.env` files and docs.
- No holiday calendar is in scope. On an exchange holiday the gainers pull comes back empty or stale and is treated as a failure, and backfill is skipped whenever the session state is not `OPEN`.

**Critical test scenarios**:
- Happy path: During market hours, dashboard shows real stocks ranked by momentum score, with approaching setups updating in real time via SSE, verifies **AC-1**, **AC-2**, **AC-4**
- Approaching detection: A stock at 99.5% of its VWAP breakout level is shown as "Approaching VWAP Breakout", verifies **AC-2**, **AC-3**
- Direct navigation: Navigating to `/dashboard/analysis/RELIANCE` fetches the latest signal or shows "no active setup", verifies **AC-5**
- EOD reconciliation: At 15:32, the cron populates actual_high/low/close and computes outcome_status for all today's signals, verifies **AC-6**, **AC-7**
- After hours view: After 15:30, dashboard shows prediction vs actual comparison with win/loss summary, verifies **AC-9**, **AC-10**
- Gainers mapping: a `gainersLosers` response with `RELIANCE28OCT26FUT`, `RELIANCE25NOV26FUT`, `M&M28OCT26FUT`, `BAJAJ-AUTO28OCT26FUT`, and `NIFTY28OCT26FUT` yields `RELIANCE` (once), `M&M`, `BAJAJ-AUTO`; NIFTY and a malformed symbol are skipped, verifies **AC-12**
- searchScrip matching: `M&M` resolves only to `M&M-EQ` on NSE; a search returning two `-EQ` rows or none skips the stock and does not call `searchScrip` again that day, verifies **AC-13**
- Reconnect keeps everything: after adding gainers, a socket reconnect resubscribes every gainer token added so far, verifies **AC-12**, **AC-14**
- Add only refresh: a refresh that returns fewer stocks than before unsubscribes nothing; a failed call keeps the universe and sets `lastRefreshError`, verifies **AC-12**
- Token cache: a symbol already in `instruments` triggers no `searchScrip` call, verifies **AC-13**
- Before the first pull: at 09:10 the dashboard shows the "waiting for today's gainers" state with zero watched stocks, verifies **AC-1**
- Restart mid session: after a restart at 11:00, today's rows are subscribed again before the next refresh, verifies **AC-13**
- Quote mode math: a tick with `close_price` 10000 (paise) and `last_traded_price` 10250 gives +2.50%. Ticks with `vol_traded` 5000 (first seen), 5600, then 5400 add 0, 600, then 0 to the candle. A stock with no `close_price` shows as unranked, verifies **AC-14**
- Backfill: a stock added at 11:00 has about 105 1m candles, persisted without duplicates, and a real opening range straight away. It skips strategy checks while warming, and can appear as approaching on the next 5m close, verifies **AC-15**
- Day rollover: a process running from Monday into Tuesday starts Tuesday with no watched stocks until the 09:22 pull, verifies **AC-12**, **AC-13**

## Build plan

1. **Database migration**: Add `actual_high`, `actual_low`, `actual_close`, `outcome_status`, `outcome_pnl_pct` columns to the `signals` table, satisfies **AC-6**
2. **Daily momentum scoring engine**: Add a `calculateMomentumScore()` function that ranks stocks by `% change * relativeVolume * trendAlignment` using data from `latestTicks` and candle history, satisfies **AC-1**
3. **Approaching setup detection**: Extend `multiStrategyEngine` to return proximity scores (0 to 100%) for each strategy when the stock is within 1% of triggering, satisfies **AC-2**, **AC-3**
4. **SSE endpoint and event emitter**: Add `GET /api/v1/scanner/stream` SSE endpoint in NestJS, emit `signal:new` and `approaching:update` events from the scanner service, satisfies **AC-4**
5. **Analysis symbol endpoint**: Add `GET /api/v1/scanner/analysis/:symbol` to fetch the latest signal or approaching data for a specific stock, satisfies **AC-5**
6. **Outcome reconciliation cron + CLI**: Implement `@Cron('32 15 * * 1-5')` in ScannerService and a standalone CLI script, both calling a shared `reconcileOutcomes(date)` function that queries candles and updates signals, satisfies **AC-7**, **AC-8**
7. **Outcomes API**: Add `GET /api/v1/scanner/outcomes` returning signals with actual outcomes and a win/loss summary, satisfies **AC-9**, **AC-10**
8. **Frontend: SignalContext SSE integration**: Replace the `fetch` in SignalContext with an `EventSource` connection to `/api/v1/scanner/stream`, adding `approachingSignals` category, satisfies **AC-4**, **AC-11**
9. **Frontend: Remove mock fallback**: Remove the `mockSignals` fallback from `SignalContext.tsx` and show a "Scanner is watching N stocks" empty state instead, satisfies **AC-1**
10. **Frontend: Analysis page direct nav**: Update `/dashboard/analysis/[symbol]/page.tsx` to fetch from the new analysis symbol endpoint when the signal is not in context, satisfies **AC-5**
11. **Frontend: Approaching setup cards**: Create an `ApproachingCard` component showing the lightweight review card (price, day change, volume, strategies approaching), satisfies **AC-2**
12. **Frontend: After hours comparison view**: Add a comparison section to the dashboard that shows after market hours, displaying prediction vs actual for each signal and a summary badge, satisfies **AC-9**, **AC-10**

Steps 1 to 12 are built. The stock universe revision follows as thin end to end slices (Tracer Bullet, the default since no build approach is recorded): first the plumbing a gainer needs (token cache, merged subscriptions, candle upsert) and the gainers pull itself, so one gainer streams end to end, then real day change via Quote mode, then make added stocks useful immediately.

13. **Migration and universe plumbing**: Add `last_selected_on` to `instruments`. Delete duplicate candles, then add `UNIQUE(symbol, timeframe, start_time)` to `candles` and switch `persistCandle` to upsert. Create a `UniverseService` (new folder `apps/backend/src/scanner/universe/`) that owns the token to symbol map and resolves a symbol through the `instruments` cache or exact match `searchScrip`, upserting the row. Remove the `SCANNER_INSTRUMENTS` path from `setupSubscriptions`. Change the provider's `subscribe()` to merge tokens into one set and replay the full set on reconnect. Add a provider REST helper (gainers, `searchScrip`, `getCandleData`) that runs calls one at a time, retries once on a rate limit, and logs in again once on an auth error, satisfies **AC-13**, **AC-1**
14. **Quote mode feed**: Subscribe everything in mode 2 (Quote). Fix `TickNormalizer` to read `open_price_day`, `high_price_day`, `low_price_day`, `close_price`, and `vol_traded`, scale every price from paise, strip NUL bytes from tokens, and take symbols from the universe map. Add `prevClose` to `MarketTick` and `latestTicks`, compute day change from it, and treat a missing previous close as unranked. Make `CandleAggregator` use the change in cumulative volume per the value sourcing rules, satisfies **AC-14**, **AC-1**
15. **Gainers refresh**: Add a pure `parseUnderlying(tradingSymbol)` (with dedupe and the index drop list) and a `@Cron('0 7,22,37,52 9-15 * * 1-5', { timeZone: 'Asia/Kolkata' })` refresh, guarded to 09:22 to 15:22 IST, with a single flight lock and one retry after 60 seconds for the 09:22 slot. It upserts rows, stamps `last_selected_on` on every returned stock, skips unresolved symbols for the day, subscribes only new tokens, and records refresh status for diagnostics, satisfies **AC-12**, **AC-13**
16. **Backfill and warming**: For each stock newly added during an `OPEN` session, fetch today's completed 1m candles via `getCandleData`, upsert them into `candles`, merge them into `history1m` by start time, and rebuild `history5m` from complete groups. Mark the stock warming until that finishes. Raise the history limits to 400 (1m) and 80 (5m), satisfies **AC-15**
17. **Restart recovery and daily reset**: On startup during a session, subscribe today's rows from `instruments` and backfill them like new additions, then run one refresh immediately if inside 09:22 to 15:22. Add a 09:00 IST reset of the in memory universe, histories, volume starting points, and skip list, satisfies **AC-13**, **AC-15**
18. **Surface universe status**: Add the `universe` block to diagnostics, and show "waiting for today's gainers (next pull HH:MM)" on the dashboard when nothing is watched yet, satisfies **AC-1**, **AC-12**

## Consequences

**Positive**:
- The dashboard always shows real, actionable data during market hours.
- Approaching setups give traders advance notice before a strategy triggers.
- Outcome tracking builds trust in the system by showing prediction accuracy.
- SSE eliminates polling overhead and gives instant updates.

**Negative / tradeoffs**:
- CPU load increases: proximity checks run on every 5m candle completion for all watched stocks.
- SSE connections consume server resources per connected client.
- Outcome reconciliation depends on the candles table being populated correctly throughout the day.

- The dashboard is empty from 09:15 until the first gainers pull at 09:22, and stays empty if that pull and its retry fail.
- The universe covers only stocks with futures (roughly 200 liquid names). A strong small cap gainer without futures is never watched.
- A gainer found at 14:50 has little session left. Add only means the universe can grow to a few dozen stocks by the close, which raises candle writes and strategy work in the afternoon.
- Quote mode ticks are larger than last price ticks, so each tick costs more bandwidth and parsing.
- `searchScrip`, `gainersLosers`, and `getCandleData` share Angel One's REST rate limits with nothing else today, but they are one more thing that can fail during a session.

- The candle uniqueness migration deletes existing duplicate candles. That is safe (it keeps the latest write per minute), but it can't be undone.

**Neutral**:
- The mock signals file (`apps/web/mock/signals.ts`) can be kept for Playwright tests but is no longer used in production UI flow.

## Follow-up

- [ ] Add a notification (toast or push) when an "Approaching" setup transitions to "Active"
- [ ] Historical outcome tracking across multiple days for system accuracy dashboard
- [ ] Rate limit SSE connections per client
- [ ] Before building step 14, confirm with `npm run scanner:angelone:smoke` in Quote mode: `close_price` is the previous close, prices are in paise, `exchange_timestamp` is in milliseconds, `vol_traded` is cumulative, and what the raw token string looks like (the SDK parser names the fields; the units are from Angel's docs, as far as I know)
- [ ] If the smoke check shows `searchScrip` can't find `M&M-EQ` (it is a substring search with capped results), add Angel's scrip master file as the fallback resolver
- [ ] Before building step 15, confirm the `gainersLosers` response shape (`tradingSymbol`, `percentChange`) and how many rows it returns, and confirm `searchScrip` and `getCandleData` rate limits
- [ ] Check what SmartAPI `nseIntraday` returns. As far as I know it lists the stocks allowed for intraday leverage, not gainers. If it turns out to be a cash gainers list, revisit this decision.
- [ ] Remove or fix the dead `20260929161500_create_instruments_table.sql` migration (its `token` and `is_active` columns never applied)
