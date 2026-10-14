---
status: In Progress
date: 2026-09-29
---

# 0009. Real Stock Analysis and Outcome Tracking

**Date**: 2026-09-29
**Status**: In Progress
**Updated**: 2026-09-29 (universe revised again: stream every F&O stock and rank gainers ourselves, because the API key only covers the WebSocket feed; AC-12, AC-13, AC-15 rewritten, AC-16 and AC-17 added. Live exit tracking is [spec 0010](../0010-live-exit-tracking/index.md).)

## Summary

Replaces the mock data fallback on the dashboard and analysis page with real stock data from Angel One. The scanner streams every NSE stock that has futures and options (F&O), about 230 liquid names taken from Angel One's public instrument file, ranks them itself by change from the previous close, and only lets the top 20 gainers raise signals. Angel's REST data calls are not available to our API key, so nothing depends on them. Adds "approaching" setups (stocks close to triggering a strategy), a daily momentum score to rank all watched stocks, real time updates via Server Sent Events (SSE), and end of day outcome reconciliation that compares our predictions against actual price movement. After market hours, users see a comparison view showing how each signal performed.

## Requirements

**User stories**:
- As a trader, I want the dashboard to show real bullish stocks from the market (not hardcoded mock data) so that I can act on live opportunities.
- As a trader, I want to see stocks that are "approaching" a strategy trigger so I can prepare before the signal fires.
- As a trader, I want to see after market hours how my signals performed against actual price movement so I can learn from the system's accuracy.

**Acceptance criteria**:
- **AC-1**: During market hours, the dashboard ranks every watched stock by a daily momentum score (% change from the previous close * relative volume * trend alignment), gainers first, with no mock data fallback. The watched stocks are every F&O stock from Angel One's public instrument file, streamed from 09:15. Before the stream starts, the dashboard shows an honest "waiting for the market to open" state.
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
- **AC-12**: Every weekday at 08:45 IST, and at backend startup, the scanner downloads Angel One's public instrument file (`OpenAPIScripMaster.json`, no API key needed), takes every underlying that has a stock future (`exch_seg` NFO, `instrumenttype` FUTSTK), and streams all of them over the WebSocket in Quote mode (228 stocks on 2026-09-29). If the file can't be downloaded or parsed, the scanner streams the list saved on the last good day and reports the fallback in diagnostics.
- **AC-13**: Each stock's NSE cash token is the instrument file's row with `exch_seg` NSE and `symbol` `<NAME>-EQ`. Every stock in the list is upserted into `instruments` under its base name (`RELIANCE`, not `RELIANCE-EQ`) with `last_selected_on` = today (IST). A backend restart during the session streams the same list again.
- **AC-14**: The live stream uses Quote mode, so each tick carries the day's open, high, low, previous close, and cumulative day volume. Day change % is measured against the previous close. A stock with no previous close yet shows as unranked (score 0) rather than a wrong number. Candle volume is the change in cumulative day volume between ticks.
- **AC-15**: Every completed candle is saved once to `candles` (upsert on symbol, timeframe, start time), written in batches rather than one call per candle. A backend restart during the session reloads today's saved 1m candles from `candles`, rebuilds the 5m history from them, and skips strategy checks until that finishes, so strategies and the opening range keep working.
- **AC-16**: Only stocks in the current top 20 by day change (ranked stocks only) may raise new signals and approaching setups. The top 20 is recomputed at each 5m close. Every streamed stock still gets candles and a momentum rank.
- **AC-17**: A read only replay command (`npm run scanner:replay -- [YYYY-MM-DD] [SYMBOL,...]`) replays a day from saved `candles` through the same strategy engine, without look ahead, and reports each entry and whether target or stop hit first, with results per strategy. It writes nothing and needs no Angel One login.

## Decision

We enhance the existing scanner pipeline and dashboard to eliminate mock data entirely. The approach uses the existing Angel One integration for the live stock universe, extends the multi strategy engine to detect "approaching" conditions, adds SSE for real time push, and adds a cron plus CLI based reconciliation for outcome tracking.

**Stock universe (AC-1, AC-12 to AC-17).** Stream every F&O stock (about 230) from 09:15, taken from Angel One's public instrument file, and compute the gainers ourselves from each tick's previous close. Only the top 20 gainers raise signals. Our API key works for login and the WebSocket feed but gets `AG8004 Invalid API Key` on every REST data call (`gainersLosers`, `searchScrip`, `getCandleData`, quotes), so the design uses none of them: tokens come from the public file, history comes from streaming since the open, and restarts and replays read our own saved candles. The universe is still limited to stocks with futures, the liquid names intraday trading wants. Options weighed: [rationale.md](rationale.md#stock-universe-ac-1-revision).

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
| `instruments` (existing) | `last_selected_on` | DATE | Nullable. The IST day the stock was last in the F&O list the scanner streamed. |
| `candles` (existing) | unique `(symbol, timeframe, start_time)` | constraint | Every candle write is an upsert on this key, so restarts and reconnects never create duplicate candles. Applied 2026-09-29. |

No new tables needed. The `instruments` table (core schema: `id`, `symbol`, `exchange`, `instrument_token` UNIQUE, `status`, `last_price`) and the `candles` table already exist. Upsert key for `instruments` is `instrument_token`. Today's universe = the F&O list loaded today; the fallback list is the rows with the latest `last_selected_on`. `instruments.symbol` holds the base name that `candles`, `signals`, and the web app already use. The scanner reads `instrument_token`, not `token`. The `token` and `is_active` columns from `20260929161500_create_instruments_table.sql` never applied, because the table already existed.

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
| `/api/v1/scanner/diagnostics` | GET (enhanced) | none | adds `universe: { stocks, source: 'file' \| 'fallback' \| 'none', loadedAt, error }` | none | none |

Angel One use: login plus the WebSocket V2 feed only. The instrument list is a plain HTTPS download of `https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json` (about 33 MB, public). No REST data endpoint is called.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Daily momentum score | `% change * relativeVolume * trendAlignment` | % change = `(ltp - prevClose) / prevClose * 100`, where `prevClose` is the Quote mode tick's `close_price`, stored on `MarketTick` and `latestTicks`; missing or 0 means unranked (score 0). Relative volume = last completed 5m volume / mean volume of the earlier 5m candles, 1 when fewer than 2 exist or the mean is 0. Trend alignment from the 5m EMA 9/21 cross: UP 1, UNKNOWN 0.5 (fewer than 21 candles), DOWN 0.25. Always positive, so the score's sign is the sign of the day change, and gainers rank first. |
| Watched stocks | symbol list | instrument file rows with `exch_seg` NFO and `instrumenttype` FUTSTK, distinct `name` values; fallback: `instruments` rows with the latest `last_selected_on` |
| Cash token | `instrument_token` | instrument file row with `exch_seg` NSE and `symbol` exactly `<name>-EQ` (the FUTSTK `name` unchanged, so `M&M` → `M&M-EQ`, `BAJAJ-AUTO` → `BAJAJ-AUTO-EQ`); `-BE` and other series are ignored; a name with no such row, or with several, is skipped and logged. The stored `instruments.symbol` is the name without `-EQ`. |
| Top 20 gainers | set of symbols allowed to signal | ranked stocks (known previous close) sorted by day change % descending, ties broken by symbol ascending, highest 20 (fewer is fine early in the day); computed once at each 5m close and frozen for that whole evaluation pass |
| Day open, high, low, previous close | tick fields | Quote mode tick `open_price_day`, `high_price_day`, `low_price_day`, `close_price`, strings in paise, divide by 100 |
| Candle volume | per candle volume | change in the Quote mode tick's cumulative `vol_traded` since that symbol's last seen value, added to the candle the tick's timestamp falls in. The first tick after a start, reconnect, or daily reset only sets the starting point (adds 0). A drop counts as 0 and resets the starting point. |
| Token to symbol | `symbol` on each tick | the universe service's token to symbol map (from `instruments`), handed to `TickNormalizer`; replaces the normalizer's hardcoded map and the scanner's separate map. Tokens are cleaned of quotes and NUL bytes. |
| History after a restart | 1m and 5m candle history | today's 1m rows in `candles`, queried per symbol, ordered by `start_time`, paged 1000 rows at a time; 5m rebuilt only from complete groups (all 5 aligned minutes present). The candle that was forming at the restart is lost. |
| Replay input | a day's 1m candles | `candles` rows for that IST day, read per symbol and paged 1000 rows at a time; symbols default to today's `instruments` list (`last_selected_on` = that day). The top 20 gate is applied using change % from each stock's first candle open of the day, an approximation stated in the report because the previous close is not stored. |
| Approaching status | distance to trigger (%) per strategy | `multiStrategyEngine` proximity check against current candle data |
| Actual outcome | `actual_high`, `actual_low`, `actual_close` | `candles` table, queried by symbol and date range (09:15 to 15:30) |
| Outcome WON/LOST | comparison of `actual_high` vs `target_1` (LONG) or `actual_low` vs `target_1` (SHORT) | `signals.target_1`, `signals.direction`, `signals.actual_high/low` |
| User's local day | IST (hardcoded, Indian market only) | `Asia/Kolkata` timezone constant |

**Key invariants**:
- No mock data is ever shown during market hours. If the scanner has no data, show an honest "Scanner is starting up, watching N stocks" state.
- Outcome reconciliation is idempotent: running it twice for the same date writes the same values.
- SSE connections are cleaned up on client disconnect.
- The universe is fixed for the session: every F&O stock is subscribed at the start and none is ever unsubscribed during the session (the 08:45 run only adds).
- Subscriptions go out in chunks of at most 50 tokens per request, each with a unique correlation ID; a reconnect replays the full set in the same chunks.
- The instrument file download has a 60 second timeout and one retry, runs under a single flight lock (startup and 08:45 never overlap), and keeps only the NFO FUTSTK and NSE `-EQ` rows it needs before dropping the parsed file.
- If the download fails and `instruments` has no saved list either (first ever run), nothing is streamed and diagnostics reports `source: 'none'` with the error.
- A failed instrument file download never leaves the scanner blind: it falls back to the last saved list and says so in diagnostics.
- A name whose `-EQ` row is missing is skipped and logged, never guessed.
- The 1m history holds a full session (400 candles) and the 5m history 80, so the opening range (the first 15 1m candles of the day) stays real all day.
- `subscribe()` merges new tokens into one set; it never replaces the set. A reconnect replays the full set, all in Quote mode.
- A token is registered in the token to symbol map before it is subscribed, so no tick ever arrives as `UNKNOWN_<token>`; ticks for tokens outside today's list are dropped.
- A daily reset at 09:00 IST clears the in memory universe, candle histories, and volume starting points, because the process can run across days.
- A stock outside the top 20 can never open a new plan; a plan it already opened keeps being tracked (spec 0010).
- Candle writes are batched: completed candles queue (deduped by symbol, timeframe, start time, last write wins) and flush in one upsert about every 2 seconds and on shutdown. A failed flush re-queues the candles, keeping at most 5,000 queued (oldest dropped, with a warning).
- The replay is read only and uses the same engine, the same 5m close timing, and the same exit rule as live and end of day reconciliation.

**Security model**:
No auth changes needed. All endpoints are internal (same origin). Outcome data is read only from the frontend.

**Configuration required**:
- No new env vars needed. The existing `MARKET_DATA_PROVIDER` and Angel One credentials are sufficient.
- `SCANNER_INSTRUMENTS` is no longer read. Remove it from `.env` files and docs.
- No holiday calendar is in scope. On an exchange holiday the feed sends no ticks, so nothing is ranked and no plan opens.
- No new REST permission is needed. If a later API key gains REST data access, backfill from Angel can come back as a follow-up.

**Critical test scenarios**:
- Happy path: During market hours, dashboard shows real stocks ranked by momentum score, with approaching setups updating in real time via SSE, verifies **AC-1**, **AC-2**, **AC-4**
- Approaching detection: A stock at 99.5% of its VWAP breakout level is shown as "Approaching VWAP Breakout", verifies **AC-2**, **AC-3**
- Direct navigation: Navigating to `/dashboard/analysis/RELIANCE` fetches the latest signal or shows "no active setup", verifies **AC-5**
- EOD reconciliation: At 15:32, the cron populates actual_high/low/close and computes outcome_status for all today's signals, verifies **AC-6**, **AC-7**
- After hours view: After 15:30, dashboard shows prediction vs actual comparison with win/loss summary, verifies **AC-9**, **AC-10**
- Instrument file: from a file with RELIANCE, M&M and BAJAJ-AUTO stock futures, index futures, and options, the list is exactly those three stocks with tokens 2885, 2031, 16669, verifies **AC-12**, **AC-13**
- File failure: a failed download streams the rows with the latest `last_selected_on` and diagnostics shows `source: 'fallback'` with the error; with no saved rows it streams nothing and shows `source: 'none'`, verifies **AC-12**
- Chunked subscribe: 228 tokens go out as 5 requests of at most 50, and a reconnect replays the same 5, verifies **AC-12**
- Name rule: fixtures for `M&M`, `BAJAJ-AUTO`, a name with only a `-BE` row, and a name with two `-EQ` rows map to `M&M`/2031, `BAJAJ-AUTO`/16669, skipped, skipped, verifies **AC-13**
- Top 20 ties: two stocks at the same change % at rank 20 and 21 are ordered by symbol, verifies **AC-16**
- Reconnect keeps everything: a socket reconnect resubscribes all 228 tokens in Quote mode, verifies **AC-12**, **AC-14**
- Before the open: at 09:10 the dashboard shows the waiting state with no ranked stocks, verifies **AC-1**
- Quote mode math: a tick with `close_price` 10000 (paise) and `last_traded_price` 10250 gives +2.50%. Ticks with `vol_traded` 5000 (first seen), 5600, then 5400 add 0, 600, then 0 to the candle. A stock with no `close_price` shows as unranked, verifies **AC-14**
- Restart recovery: after a restart at 11:00, each stock's 1m history is reloaded from `candles` (about 105 candles), with a real opening range, and strategies resume on the next 5m close, verifies **AC-15**
- Batched writes: 228 candles closing in the same minute go out in one or a few upserts, with no duplicates, verifies **AC-15**
- Top 20 gate: a strategy that triggers on the 25th best gainer opens no plan; the same trigger on the 5th best gainer does, verifies **AC-16**
- Replay: `npm run scanner:replay -- 2026-09-30 RELIANCE` reads saved candles only, prints entries with their exits, and writes nothing, verifies **AC-17**
- Day rollover: a process running from Monday into Tuesday starts Tuesday with no ranked stocks until the first ticks after 09:15, verifies **AC-12**

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

Steps 13 to 18 are built, but the gainers pull, `searchScrip` lookup, and `getCandleData` backfill in them turned out to be rejected for our API key (`AG8004`). The revision below keeps what still holds (Quote mode, volume math, merged subscriptions, candle upsert, daily reset, token map, warming) and replaces the REST parts. Order: first make the whole F&O list stream end to end, then restart recovery and batching, then the top 20 gate and the replay.

19. **Instrument file universe**: `UniverseService` downloads (60 s timeout, one retry, single flight lock) the public instrument file at startup and on a `@Cron('0 45 8 * * 1-5', { timeZone: 'Asia/Kolkata' })`, derives the FUTSTK names and their NSE `-EQ` tokens with the exact name rule (pure parser, unit tested on a small fixture), upserts them into `instruments` with today's `last_selected_on`, registers the token map, and subscribes all of them. Change the provider to send subscriptions in chunks of 50 with unique correlation IDs, for both new tokens and reconnect replay. On failure it loads the rows with the latest `last_selected_on` and records the fallback for diagnostics, satisfies **AC-12**, **AC-13**
20. **Remove the REST paths**: Delete the gainers refresh cron and schedule helpers, the `searchScrip` resolution, the `getCandleData` backfill, the provider's REST helper and `MarketDataRestClient`, and `gainers.ts` parsing that is no longer used. Keep `loginForRest` only if something still calls it. Typecheck and tests clean with the old code gone, satisfies **AC-12**, **AC-15**
21. **Restart recovery from saved candles and batched writes**: On startup during a session, load today's 1m `candles` per symbol (ordered, paged by 1000) into `history1m`, rebuild `history5m` from complete groups, keep the stocks warming until done. Replace per candle upserts with a deduped queue flushed in one upsert about every 2 seconds and on shutdown, re-queued on failure up to 5,000 candles, satisfies **AC-15**
22. **Top 20 gate**: At each 5m close, recompute the top 20 ranked stocks by day change (ties by symbol) once, freeze it for that evaluation pass; only those may open plans or show as approaching, satisfies **AC-16**
23. **Replay from saved candles**: Switch `replay-cli.ts` to read the day's 1m rows from `candles` per symbol with paging (default symbols: that day's `instruments` list), apply the approximate top 20 gate from first candle opens and say so in the report, drop the Angel login and gainers lookup, satisfies **AC-17**
24. **Dashboard copy and diagnostics**: Replace the "next gainers pull" copy with "waiting for the market to open" before 09:15, and show the universe block (`stocks`, `source`, `loadedAt`, `error`) in diagnostics, satisfies **AC-1**, **AC-12**

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

- Streaming about 230 stocks means about 230 1m candles a minute to aggregate, save, and evaluate. Batching keeps the database load small, but CPU and memory for histories grow (still small: 230 stocks x 400 candles).
- The universe covers only stocks with futures. A strong small cap gainer without futures is never watched.
- Our own gainers ranking uses the feed's previous close, so it can differ slightly from Angel's or NSE's published lists (which rank futures, or the whole market).
- The instrument file is about 33 MB; parsing it takes a few seconds and a short memory spike each morning.
- A restart loses the minutes the backend was down: those candles are missing, since Angel's candle history API is not available to us.
- Quote mode ticks are larger than last price ticks, so each tick costs more bandwidth and parsing.

**Neutral**:
- The mock signals file (`apps/web/mock/signals.ts`) can be kept for Playwright tests but is no longer used in production UI flow.

## Follow-up

- [ ] Add a notification (toast or push) when an "Approaching" setup transitions to "Active"
- [ ] Historical outcome tracking across multiple days for system accuracy dashboard
- [ ] Rate limit SSE connections per client
- [ ] Before trusting live rankings, run `npm run scanner:angelone:smoke` during market hours to confirm Quote mode units (`close_price` is the previous close, prices in paise, `exchange_timestamp` in ms, `vol_traded` cumulative)
- [ ] Remove or fix the dead `20260929161500_create_instruments_table.sql` migration (its `token` and `is_active` columns never applied)
- [ ] The confidence score is random (`Math.random() * 20 + 80` in `ScannerService.evaluateStrategy`); replace it with a real score before ranking signals by confidence (a separate /architect decision)
- [ ] A history source for downtime gaps and for replaying days before our own candles existed: Yahoo Finance 1m candles (free, unofficial, about 7 days back) for research replays, or a broker historical API (Upstox, Dhan, Fyers, or an Angel Historical Data key) as a long term backup. A separate /architect decision; the engineer chose to keep Angel for live data.
