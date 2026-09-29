# Rationale

## Context

The Dynamic Stock Analysis feature (Phase 5, spec 0008) successfully replaced hardcoded stock selections with a multi strategy engine. However, the frontend still falls back to mock data (3 hardcoded stocks: RELIANCE, HDFCBANK, TCS) when the API returns no live signals. This happens whenever the market is closed, the scanner hasn't accumulated enough candle history, or no strategy has triggered yet. The result is that users see fake data most of the time, eroding trust in the system.

Additionally, there is no way to evaluate the system's prediction accuracy. Signals fire and expire without tracking whether the predicted entry, target, and stop levels were actually hit. Traders cannot learn from the system's track record.

The user also wants a richer experience: stocks that are close to triggering a strategy should be surfaced as "Approaching" setups so traders can prepare, and after market hours the dashboard should show a comparison of predictions vs actual price movement.

## Options considered

### Option 1: Polling based refresh with mock fallback

Keep the current architecture: `SignalContext` fetches `/top-setups` once on mount with a mock fallback. Add a polling interval (30s) and an approaching endpoint. Outcome reconciliation as a manual process.

**Pros**:
- Minimal changes to the frontend architecture
- No new transport layer (SSE/WebSocket)

**Cons**:
- 30s polling lag for approaching updates
- Mock fallback still confuses users
- Manual outcome tracking is unreliable

### Option 2: SSE with full real data pipeline (chosen)

Replace the mock fallback entirely. Add Server Sent Events for real time push of both triggered and approaching setups. Automate outcome reconciliation via cron and CLI. Add daily momentum scoring so the dashboard always has ranked stocks even before strategies fire.

**Pros**:
- Zero latency updates via SSE
- Dashboard always shows real, ranked data
- Automated accuracy tracking builds system credibility
- No extra infra (SSE is native HTTP, NestJS supports it)

**Cons**:
- Higher CPU from proximity calculations on every 5m candle
- SSE connections consume server memory per client
- More complex frontend state management (EventSource lifecycle)

### Option 3: Supabase Realtime for push updates

Use Supabase's built in Realtime feature (Postgres changes channel) to push new signals and approaching updates directly from the database.

**Pros**:
- No custom SSE implementation needed
- Database driven, automatically consistent

**Cons**:
- Approaching setups are computed in memory, not in the DB, so they can't use Postgres changes
- Adds a dependency on Supabase Realtime configuration
- Less control over event shaping and batching

## Rationale

Option 2 was chosen because SSE is the lightest real time transport available (native HTTP, no extra library), the approaching setup computation happens in memory inside the scanner service (so Supabase Realtime can't source it), and the user explicitly wanted both real time updates and prediction vs outcome comparison. The daily momentum score ensures the dashboard is never empty during market hours even before any strategy triggers. The cron plus CLI approach for reconciliation gives both automation and manual override authority, which the user specifically requested.

## References

**Project sources**:
- `AGENTS.md`: stack conventions (Next.js, NestJS, Supabase, Angel One)
- `docs/specs/0008-dynamic-stock-analysis/index.md`: the multi strategy engine this enhances
- `apps/backend/src/scanner/scanner.service.ts`: the scanner pipeline being extended
- `apps/web/lib/contexts/SignalContext.tsx`: the context being upgraded from polling to SSE

## Stock universe (AC-1 revision)

*Added 2026-09-29, while Phase 6 was being built.*

### Context

AC-1 first said the dashboard ranks "real stocks from Angel One Top Gainers API". While building, three facts came out:

- Angel One's only gainers endpoint, `gainersLosers`, takes an expiry type (NEAR, NEXT, FAR). It ranks futures and options contracts, not NSE cash stocks.
- The scanner's universe really came from `SCANNER_INSTRUMENTS` (6 symbols). Its fallback read the `instruments` table through columns (`token`, `status`) that don't match the live schema (`instrument_token`), and the table is empty.
- The feed subscribed in last price mode, so the scanner never saw the day's open or previous close. "% change on the day" was measured from the first price the scanner happened to see.

The engineer wants the universe to be today's top gainers from Angel One (an index list such as the Nifty 50 is out of the MVP), with every watched stock ranked and gainers first.

### Options considered

**1. F&O price gainers mapped to cash, refreshed every 15 minutes, add only (chosen).** Pull `PercPriceGainers` for near expiry futures, map each to its underlying cash stock, and stream it.
- Pros: an official Angel One API on the session we already hold. The F&O list is the liquid names intraday trading wants. Add only keeps history and open signals intact.
- Cons: stocks without futures never appear. The universe grows through the day. It depends on three REST calls (`gainersLosers`, `searchScrip`, `getCandleData`) that can fail during a session.

**2. NSE website live gainers.** Read NSE's public Top Gainers for the whole cash market.
- Pros: true cash market gainers, including small caps.
- Cons: an unofficial endpoint that blocks automated clients and can change without notice. Rejected because the engineer wants Angel One only.

**3. Broad REST quote scan.** Every few minutes, quote a wide list (for example Nifty 500) and take the top N.
- Pros: true cash gainers within a defined list.
- Cons: it needs a maintained index list (out of the MVP), plus polling and rate limit handling.

**4. Stream a fixed index and let the ranking find the gainers.**
- Pros: no polling, a steady universe.
- Cons: needs an index constituent list the engineer ruled out of the MVP.

### Rationale

Option 1 is the only one that satisfies "Angel One only" and "top gainers, not an index". The F&O limit is acceptable, and arguably a feature: stocks with futures are the liquid ones where intraday entries and stops fill cleanly.

We refresh every 15 minutes and only ever add stocks. Dropping a stock mid session would throw away its candle history and orphan any open signal. The runner up was a single pull at 09:20, which is steadier but misses later movers.

The engineer chose top gainers only, with no pinned list. `SCANNER_INSTRUMENTS` is dropped. The cost is an empty dashboard until 09:22, or all morning if the gainers call keeps failing. The runner up was keeping a small pinned list as a safety net.

Tokens are cached in the existing `instruments` table, so each symbol is looked up once and a restart can rebuild today's list. The runner up was a daily scrip master download, which avoids per symbol calls but means a large download and parse at startup.

The Quote mode switch and the backfill follow from the same requirement. A gainer that joins at 11:00 needs its previous close (for a true day change %) and its candle history (for strategies and the opening range). Without them it would rank near 0% and stay blind for about 25 minutes.

A read only cross check on a second model found gaps that the first draft left for the builder. These were settled with the engineer and folded into the spec:
- The provider's `subscribe()` replaced its stored list, so each batch of added gainers would have dropped the earlier ones on reconnect. It now merges.
- The rules for cumulative volume changes are now written down.
- Previous close now has a place on the tick.
- The rules for matching `M&M` and index underlyings are explicit.
- Backfilled candles are saved, with a uniqueness key so no minute is stored twice. Without this, end of day reconciliation would miss the morning of a stock added mid session.
- Refreshes run 2 minutes after each quarter hour, so they don't compete with the 5m candle close work.
