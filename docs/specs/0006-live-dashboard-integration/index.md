# 0006. Live Dashboard Integration

**Date**: 2026-09-29
**Status**: Proposed

## Summary

This spec connects the real Angel One market data pipeline, already receiving live ticks and producing candles, through to the dashboard UI. It replaces the mock/hardcoded data that currently populates every frontend component (market status, prices, dates, signals) with real persisted scanner output. It also switches the instrument universe from NIFTY/BANKNIFTY indices to six NSE cash equity stocks, ports the strategy engine to the backend scanner worker, adds market session handling, and exposes scanner diagnostics for development.

## Requirements

**User stories**:
- As a trader, I want the dashboard to show real stock prices from the live Angel One feed so that I can see actual market data, not simulated values.
- As a trader, I want the dashboard to show LIVE/DELAYED/DISCONNECTED status accurately so that I know whether the data I see is trustworthy.
- As a developer, I want a scanner diagnostics panel so that I can trace where data breaks in the pipeline (ticks, candles, strategy, signals, persistence, API).

**Acceptance criteria**:
- **AC-1**: The scanner subscribes to six NSE cash equity instruments (RELIANCE, HDFCBANK, ICICIBANK, SBIN, INFY, TCS) using tokens resolved from the Angel One instrument master, not hardcoded index tokens.
- **AC-2**: The dashboard market status reads the real feed health state from `GET /api/v1/market/status` and displays LIVE when connected with recent ticks, DELAYED when data is stale, DISCONNECTED when the worker is down, and SIMULATED only when `MARKET_DATA_PROVIDER=mock`.
- **AC-3**: The dashboard date, session elapsed time, and "last updated" timestamp are derived from the actual IST clock and feed state, with no hardcoded dates or mock timestamps.
- **AC-4**: A market watch section on the dashboard shows the latest tick price, session open price, 1D percentage change, and feed status for each subscribed instrument, with all values sourced from the real scanner data via `GET /api/v1/market/watch`.
- **AC-5**: The strategy engine runs server side in the NestJS scanner worker on completed 5m candles (with 1m candles for timing context), producing signals that are persisted to Supabase and served via the existing `GET /api/v1/signals` endpoint.
- **AC-6**: The scanner stops generating new candles after 15:30 IST (with a 2 minute grace period for final ticks) and transitions the feed status appropriately at session close.
- **AC-7**: A development only diagnostics endpoint (`GET /api/v1/scanner/diagnostics`) returns scanner health metrics (ticks per minute, candle counts, strategy evaluations, eligible setups, active signals, last tick/candle timestamps), consumed by a collapsible dev panel on the dashboard when `NODE_ENV !== 'production'`.
- **AC-8**: Completed candles are served via `GET /api/v1/candles?symbol=...&timeframe=...&limit=...` for chart consumption.
- **AC-9**: No Angel One secrets (API key, client code, TOTP, JWT, feed token) are exposed to the browser through any endpoint.
- **AC-10**: Mock data providers remain available and functional for `MARKET_DATA_PROVIDER=mock`, but the live configuration path never silently falls back to mock when credentials are present.

## Decision

**Chosen option**: End to end integration using the existing NestJS + Supabase + Next.js stack, with the strategy engine ported to the backend scanner worker and new REST endpoints for market status, market watch, candles, and diagnostics.

**Implementation skills**: `supabase` (`CodesWithAnkit/trading_app`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`CodesWithAnkit/trading_app`, `.agents/skills/supabase-postgres-best-practices/`)

## Feature design

**Data model sketch**:

Existing tables (no migration needed):
- `feed_health`: status, last_tick_at, last_candle_at, connection_started_at, reconnect_count, subscribed_instrument_count, last_error_code, last_error_message
- `candles`: symbol, instrument_token, timeframe, open, high, low, close, volume, start_time, end_time, is_complete
- `signals`: id, symbol, exchange, direction, setup, status, price, entry_zone, reference_entry, stop, targets, confidence, confidence_band, rationale, metrics, created_at, expires_at

New table:
- `instruments`: symbol (text, unique, not null), token (text, not null), exchange (text, default 'NSE'), name (text), is_active (boolean, default true), created_at (timestamptz, default now())

In memory (scanner worker, not persisted):
- `latestTicks`: Map<token, { symbol, ltp, timestamp, dayOpen, volume }>
- `scannerMetrics`: { ticksReceived, candlesCompleted1m, candlesCompleted5m, strategyEvaluations, eligibleSetups, activeSignals, lastTickAt, lastCandleAt }

**State transitions**:
- Market session: PRE_MARKET (before 09:15) → OPEN (09:15 to 15:30) → CLOSING (15:30 to 15:32 grace period) → CLOSED (after 15:32)
- Feed status: DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTED (at session end or on failure)
- Dashboard market state: derived from feed status + provider type + session state

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/market/status` | GET | none | `{ status, lastTickAt, subscribedCount, sessionState, providerType, serverTime }` | none (public read) | 500 if scanner not initialized |
| `/api/v1/market/watch` | GET | none | `{ instruments: [{ symbol, ltp, dayOpen, change1dPct, volume, lastTickAt, status }] }` | none (public read) | 500 if scanner not initialized |
| `/api/v1/candles` | GET | `symbol` (req), `timeframe` (req, '1m' or '5m'), `limit` (opt, default 50) | `{ data: Candle[], meta: { total } }` | none (public read) | 400 if symbol missing, 404 if no data |
| `/api/v1/scanner/diagnostics` | GET | none | `{ ticksPerMinute, candles1m, candles5m, strategyEvaluations, eligibleSetups, activeSignals, lastTickAt, lastCandleAt, sessionState, providerType, uptime }` | dev only (gated by NODE_ENV) | 403 in production |
| `/api/v1/signals` | GET | `status` (opt) | `{ data: Signal[], meta: { total } }` | none (public read) | 500 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Market status badge | `status` (LIVE/DELAYED/DISCONNECTED/SIMULATED) | `GET /api/v1/market/status` → `status` field, mapped in DashboardContext |
| Market status badge | `providerType` | `GET /api/v1/market/status` → `providerType` field (from `MARKET_DATA_PROVIDER` env var) |
| Dashboard date/time | current IST date | `new Date()` in browser, formatted with `Asia/Kolkata` timezone |
| Dashboard date/time | session elapsed | computed client side from 09:15 IST market open and current time, shown only during OPEN session |
| Dashboard date/time | last update time | `GET /api/v1/market/status` → `lastTickAt`, formatted in IST |
| Market watch LTP | `ltp` per stock | `GET /api/v1/market/watch` → `instruments[].ltp`, sourced from scanner's in memory `latestTicks` Map |
| Market watch 1D change | `change1dPct` per stock | Derived in scanner: `(ltp - dayOpen) / dayOpen * 100`, where `dayOpen` is the open of the first 1m candle of the day for that symbol |
| Market watch volume | `volume` per stock | Cumulative volume from ticks in the scanner's `latestTicks` Map |
| Active signals | signals list | `GET /api/v1/signals?status=ACTIVE` → Supabase `signals` table, written by the strategy engine in the scanner worker |
| Signal confidence/metrics | all signal fields | Strategy engine output: `buildSignalSnapshot()` from `apps/web/lib/strategy/signal/signalSnapshot.ts`, ported to backend |
| Scanner diagnostics | all diagnostic metrics | `GET /api/v1/scanner/diagnostics` → in memory counters in scanner service |

**Key invariants**:
- The scanner fails fast on startup if `MARKET_DATA_PROVIDER=angelone` but credentials are missing. No silent fallback.
- Only completed candles (not forming candles) are passed to the strategy engine for confirmed signal generation.
- No candles are generated after 15:32 IST (session close + grace period).
- The browser never receives any Angel One credential or session token.
- Mock mode remains fully functional: `MARKET_DATA_PROVIDER=mock` returns SIMULATED status and serves mock data from the existing mock providers.

**Security model**:
- All market data flows server side only. The browser receives derived prices, candles, and signals via REST.
- The diagnostics endpoint is gated by `NODE_ENV !== 'production'` and returns 403 in production.
- No new authentication is added for these public read endpoints (consistent with existing signals/trades endpoints).

**Configuration required**:
- `MARKET_DATA_PROVIDER`: 'mock' | 'angelone' (existing, no change)
- `SCANNER_INSTRUMENTS`: comma separated symbol list, e.g. 'RELIANCE,HDFCBANK,ICICIBANK,SBIN,INFY,TCS' (changed from token list to symbol list; tokens resolved from instrument master)
- `ANGEL_ONE_API_KEY`, `ANGEL_ONE_CLIENT_ID`, `ANGEL_ONE_PASSWORD`, `ANGEL_ONE_TOTP_SECRET`: existing, no change

**Critical test scenarios**:
- Happy path: Scanner subscribes to RELIANCE by symbol, receives tick, normalizes price (divided by 100), aggregates 1m candle, persists to Supabase, market watch API returns current LTP, dashboard shows LIVE status with real price, verifies **AC-1, AC-2, AC-4, AC-9**
- Strategy evaluation: Scanner completes a 5m candle for RELIANCE, strategy engine evaluates eligibility and setup detection, result (signal or no signal) is persisted, signals API returns it, verifies **AC-5**
- Session close: At 15:30 IST the scanner enters CLOSING state, allows final ticks until 15:32, then stops candle generation and transitions status, verifies **AC-6**
- Market status accuracy: With `MARKET_DATA_PROVIDER=angelone` and active connection, dashboard shows LIVE. With no ticks for 15+ minutes, shows DELAYED. With disconnected worker, shows DISCONNECTED. With `MARKET_DATA_PROVIDER=mock`, shows SIMULATED, verifies **AC-2, AC-10**
- Dev diagnostics: `GET /api/v1/scanner/diagnostics` returns metrics in development, returns 403 in production, verifies **AC-7**

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Build plan

Tracer Bullet approach: stand up one stock end to end first, then expand.

1. Create `instruments` table migration and resolve SCANNER_INSTRUMENTS from symbols to Angel One tokens using the instrument master CSV, satisfies **AC-1**
2. Add market session clock (IST boundaries: 09:15 open, 15:30 close, 15:32 grace end) to the scanner service, gate candle generation on session state, satisfies **AC-6**
3. Add in memory `latestTicks` Map and `scannerMetrics` counters to the scanner service, updated on each processed tick and completed candle, satisfies **AC-4, AC-7**
4. Implement `GET /api/v1/market/status` endpoint returning feed health + provider type + session state + server time, satisfies **AC-2, AC-9**
5. Implement `GET /api/v1/market/watch` endpoint returning latest tick data for all subscribed instruments from the in memory Map, satisfies **AC-4, AC-9**
6. Update DashboardContext to fetch from `GET /api/v1/market/status` (replacing Supabase Realtime subscription), derive market state from `providerType` + `status` + `lastTickAt`, remove hardcoded mock date, compute session elapsed from real IST time, satisfies **AC-2, AC-3**
7. Add MarketWatch component to the dashboard, consuming `GET /api/v1/market/watch` with 5 second polling, showing LTP, 1D change, volume, and per instrument status for all six stocks, satisfies **AC-4**
8. Port the strategy engine pure functions from `apps/web/lib/strategy/` into `apps/backend/src/scanner/strategy/`, wire completed 5m candles through eligibility, feature calculation, setup detection, plan building, and signal snapshot, persist signals to Supabase `signals` table, satisfies **AC-5**
9. Implement `GET /api/v1/candles` endpoint reading from the Supabase `candles` table with symbol and timeframe filters, satisfies **AC-8, AC-9**
10. Implement `GET /api/v1/scanner/diagnostics` endpoint (gated by NODE_ENV) returning all scanner metrics, add a collapsible dev panel component to the dashboard page that shows when not in production, satisfies **AC-7**
11. Verify price normalization is correct end to end: Angel One `last_traded_price` string divided by 100 produces the real rupee value, tested against a known market price, satisfies **AC-4**
12. Update mock provider path: ensure `MARKET_DATA_PROVIDER=mock` still works, returns SIMULATED status, and uses mock data without Angel One credentials, satisfies **AC-10**

## Consequences

**Positive**:
- The dashboard transitions from a static prototype to a live trading tool showing real market data.
- Scanner diagnostics make the data pipeline fully observable during development, drastically reducing debugging time.
- The strategy engine running server side means the browser never needs access to market data credentials or raw tick streams.

**Negative / tradeoffs**:
- Porting the strategy engine to the backend creates a second copy of the pure functions (frontend retains them for simulation). This duplication should be resolved in a future refactor by extracting a shared package.
- The in memory `latestTicks` Map is lost on scanner restart, meaning a brief gap in market watch data after a worker restart.
- Polling the market watch endpoint every 5 seconds introduces up to 5 seconds of price staleness in the UI.

**Neutral**:
- The frontend mock data files (`apps/web/mock/`) are not deleted; they remain as fallback for the mock provider path and for frontend development without the backend running.
- The `instruments` table is minimal (6 rows); a full instrument master integration is a follow up.

## Follow-up

- [ ] Extract the strategy engine pure functions into a shared `packages/strategy/` workspace to eliminate the duplication between `apps/web/lib/strategy/` and `apps/backend/src/scanner/strategy/`.
- [ ] Consider SSE or WebSocket push from the NestJS backend to the dashboard to replace polling for market watch data, reducing latency from 5 seconds to near real time.
- [ ] Monitor memory usage of the `latestTicks` Map and `scannerMetrics` counters over a full trading session.
- [ ] Add `apps/backend/AGENTS.md` to capture the new scanner/strategy patterns introduced by this spec.

## Migration plan

**Strategy**: no migration needed (additive changes only)
**Phases**:
1. Add the `instruments` table, switch scanner from index tokens to stock tokens, add session clock. Backend changes only, no frontend impact.
2. Add the four new API endpoints. Frontend changes to consume them.
3. Port strategy engine, wire candle to signal pipeline.
4. Update dashboard UI components to consume real endpoints, remove hardcoded dates.

**Rollback**: Revert `SCANNER_INSTRUMENTS` to `26009,26000` and `MARKET_DATA_PROVIDER` to `mock` to restore the previous behavior. All new endpoints are additive and can be removed without affecting existing functionality.
**Risks**: Angel One instrument tokens may change between trading sessions (unlikely for large cap NSE stocks, but the instrument master resolution handles this). Strategy engine port may surface differences between the frontend and backend TypeScript environments (ESM vs CJS, zod version alignment).
