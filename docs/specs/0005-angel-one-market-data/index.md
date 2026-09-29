# 0005. Angel One SmartAPI Market Data Integration

**Date**: 2026-09-29
**Status**: Accepted

## Summary

This specification outlines the Phase 4 implementation to integrate Angel One's SmartAPI as the real market data source for the Scanner Worker. It replaces the local mock feed with real NSE cash-equity data while preserving the existing strategy boundaries and ensuring no broker trading execution or secret leakage to the browser. The integration relies on the official SmartAPI JavaScript SDK and implements robust WebSocket lifecycle management, tick normalization, and candle aggregation.

## Requirements

**User stories**:
- As a trader, I want to receive live market data so that the intraday dashboard reflects real price action and confirms strategy signals accurately.
- As an administrator, I want the system to handle disconnections gracefully so that the strategy engine does not evaluate on stale data.

**Acceptance criteria**:
- **AC-1**: Angel One authentication works exclusively server-side in the Scanner Worker, and no secrets (API Key, Client Code, TOTP, JWT, Feed Token) are exposed to the client bundle or logs.
- **AC-2**: The `smartapi-javascript` SDK connects via WebSocket V2 for a configured allowlist of NSE cash-equity instruments (`NSE_CM`).
- **AC-3**: Raw market ticks are normalized to a canonical `MarketTick` format, rejecting invalid or out-of-sequence data.
- **AC-4**: Ticks are deterministically aggregated into 1-minute and 5-minute `Candle` objects and persisted to Supabase; raw ticks are discarded after aggregation.
- **AC-5**: WebSocket disconnections trigger an exponential backoff reconnect strategy (capped at 30 seconds, looping indefinitely until market session ends).
- **AC-6**: `FeedHealth` is monitored and flushed to Supabase on state changes or every 60 seconds. The strategy engine receives data only when the feed is healthy (`Live`).
- **AC-7**: A live smoke-test command (`npm run scanner:angelone:smoke`) verifies connectivity, tick processing, and feed health without writing to the database or evaluating strategy.
- **AC-8**: The system explicitly blocks and audits against any usage of broker order endpoints (e.g., `placeOrder`, `funds`, `holdings`).

## Feature design

**Data model sketch**:
- `Candle` (persisted): `symbol`, `instrumentToken`, `timeframe` ('1m', '5m'), `open`, `high`, `low`, `close`, `volume`, `startTime`, `endTime`, `isComplete`
- `FeedHealth` (persisted): `status` (CONNECTED, DELAYED, STALE, DISCONNECTED, RECONNECTING), `lastTickAt`, `lastCandleAt`, `connectionStartedAt`, `reconnectCount`, `subscribedInstrumentCount`, `lastErrorCode`, `lastErrorMessage`

**State transitions**:
- WebSocket State: `DISCONNECTED` → `CONNECTING` → `AUTHENTICATING` → `CONNECTED` → `RECONNECTING` → `CONNECTED`

**API surface**:
| Endpoint / Service | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `MarketDataProvider` | `connect()` | config | void | internal | Auth failure, Timeout |
| `MarketDataProvider` | `subscribe()` | instruments[] | void | internal | Max subscriptions |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Aggregate Candle | `close` | Latest `MarketTick.ltp` in interval |
| Check Feed Health | `status` | Derived from WebSocket events and tick staleness |
| Feed Flush | `reconnectCount` | In-memory counter maintained by the Provider |

**Key invariants**:
- The worker fails fast on startup if `MARKET_DATA_PROVIDER=angelone` but credentials are missing (no silent fallback to mock).
- A forming candle is never passed to the strategy engine as a confirmed input.
- Paper mode configuration remains strictly enforced; live broker execution is blocked.

**Security model**:
- The Scanner Worker runs with a restricted service-role key or dedicated DB credentials, accessing only necessary tables (instruments, candles, feed health, signals).
- Market data secrets (`ANGEL_ONE_API_KEY`, etc.) reside strictly in the worker's environment variables.

**Configuration required**:
- `MARKET_DATA_PROVIDER`: 'mock' | 'angelone'
- `ANGEL_ONE_API_KEY`: API Key
- `ANGEL_ONE_CLIENT_CODE`: Client Code
- `ANGEL_ONE_TOTP_SECRET`: TOTP Secret for auth
- `SCANNER_INSTRUMENTS`: Comma-separated list of instrument tokens/symbols

**Critical test scenarios**:
- Happy path: Authenticate, connect WebSocket, receive ticks, aggregate a 1m candle, and flush feed health (verifies **AC-1, AC-2, AC-3, AC-4, AC-6**).
- Failure case: WebSocket connection drops; system enters RECONNECTING state, applies exponential backoff, and recovers connection (verifies **AC-5**).
- Auth/permission: Starting the worker with `angelone` provider but invalid credentials throws a fatal error immediately (verifies **AC-1**).

## Build plan

1. Define `MarketDataProvider` interface and canonical domain types (`MarketTick`, `Candle`, `FeedHealth`), satisfies **AC-3, AC-4** [x]
2. Implement `TickNormalizer` and `CandleAggregator` utilities with unit tests, satisfies **AC-3, AC-4** [x]
3. Create `AngelOneMarketDataProvider` wrapping the `smartapi-javascript` SDK, implementing auth and WebSocket connection logic, satisfies **AC-1, AC-2** [x]
4. Implement reconnect state machine with exponential backoff inside the provider, satisfies **AC-5** [x]
5. Connect `AngelOneMarketDataProvider` to Supabase to flush `FeedHealth` (on change or 60s) and persist `Candle` records, satisfies **AC-4, AC-6** [x]
6. Wire the provider into the Scanner module, replacing the mock provider conditionally based on `MARKET_DATA_PROVIDER`, satisfies **AC-1, AC-8** [x]
7. Implement the live smoke-test CLI script, satisfies **AC-7** [x]

## Consequences

**Positive**:
- Replaces simulated data with live market data, enabling real-world strategy validation.
- Decoupled architecture protects the core engine from external API changes.
- Discarding raw ticks minimizes DB storage costs and write load.

**Negative / tradeoffs**:
- Maintaining the WebSocket connection introduces stateful complexity to the previously stateless NestJS worker.
- Aggregating candles in-memory means an ungraceful shutdown could lose a partially formed candle.

**Neutral**:
- The dashboard UI must correctly handle `Live` vs `Stale` states based on the propagated `FeedHealth`.

## Follow-up

- [ ] Ensure `AGENTS.md` in `apps/backend` reflects any new patterns introduced for external WebSocket management once implemented.
- [ ] Monitor memory usage of the NestJS worker over a full trading session to ensure the tick buffer and candle aggregation do not leak memory.
