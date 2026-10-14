# 0006 Rationale: Live Dashboard Integration

## Context

The Angel One SmartAPI WebSocket integration (spec 0005) is working: the scanner worker authenticates, connects, receives real time ticks for subscribed instruments, normalizes prices, and aggregates them into 1 minute and 5 minute candles. Feed health is persisted to Supabase.

However, the dashboard remains a static prototype. Every visible value is hardcoded or mocked:
- The market status defaults to SIMULATED regardless of the real feed state.
- The date reads "Tuesday, 24 Oct 2023" while the scanner runs with current 2026 data.
- Stock prices, P&L values, session elapsed time, and trade log entries are all mock literals.
- The scanner subscribes to NIFTY 50 and NIFTY BANK (indices), which are not tradable cash equities and do not match the product scope of an intraday stock scanner.
- The strategy engine lives in `apps/web/lib/strategy/` (browser side pure functions) and has no connection to the live candle pipeline in the backend scanner worker.
- The signals and trades endpoints read from Supabase, but no real data is being written there.

The consequence of not deciding is that the product remains a visual shell: real market data flows through the backend and vanishes, while the user sees only static mockup values. Every debugging session requires reading terminal logs because the UI provides no visibility into the data pipeline.

## Options considered

### Option 1: Connect end to end with REST polling

Add new REST endpoints for market status, market watch, candles, and diagnostics. The frontend polls these at short intervals (5 to 10 seconds). The strategy engine is ported to the backend scanner worker and writes signals to Supabase, which the existing signals endpoint already serves.

**Pros**:
- Simple, stateless request/response model. No new infrastructure.
- Works with the existing NestJS + Next.js architecture. No WebSocket complexity on the frontend.
- In memory latest tick storage in the scanner avoids additional Supabase writes for ephemeral data.

**Cons**:
- Up to 5 seconds of price staleness on the dashboard due to polling interval.
- Every browser tab independently polls, which scales linearly with open tabs (acceptable at single user scale).

### Option 2: Supabase Realtime for everything

Use Supabase Realtime subscriptions from the browser for all live data: feed health changes, latest ticks (via an upserted table), new candles, and new signals.

**Pros**:
- Near real time push to the browser.
- No custom endpoints needed for status or market watch.

**Cons**:
- Requires writing every tick to a `latest_ticks` table in Supabase, creating high write volume (6 instruments × ~1 tick/second = ~360 inserts/minute).
- Supabase Realtime has connection limits on the free tier.
- More complex frontend state management (multiple concurrent channel subscriptions).
- The DashboardContext already attempted Supabase Realtime for feed_health and it proved fragile (schema cache misses, column mismatches).

### Option 3: Server Sent Events from NestJS

Stream live data from the NestJS backend to the browser via SSE.

**Pros**:
- True push, no polling. Lower latency than REST.
- Single connection per browser tab.

**Cons**:
- Requires NestJS SSE setup (new pattern for this codebase).
- Connection management adds complexity (reconnect on drop, buffering, back pressure).
- Overkill for a single user application at this stage.

## Rationale

Option 1 (REST polling) is chosen because it is the simplest path that delivers the goal: real data on the dashboard. The 5 second polling latency is acceptable for an intraday scanner where signals have minutes long validity windows, not millisecond sensitivity. The in memory latest tick storage avoids the high write volume problem of Option 2, and the REST model avoids the connection management complexity of Option 3.

The earlier attempt at Supabase Realtime for `feed_health` in the DashboardContext showed that the real time channel approach is fragile when the schema is evolving (schema cache misses, column mismatches). A simple GET endpoint is robust to schema changes and easy to debug.

The strategy engine is ported to the backend rather than kept in the browser because: (1) the candle data lives in the scanner worker, avoiding an extra round trip; (2) signal generation should not depend on the user having the dashboard open; and (3) it keeps Angel One data entirely server side.

The Tracer Bullet build approach is chosen because this is a pipeline integration, and the highest risk is whether the data actually flows end to end. Proving one stock works from tick to dashboard before expanding to six eliminates integration surprises.
