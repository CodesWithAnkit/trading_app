# Project Scope

## At a glance

| Feature | Status |
|---|---|
| Strategy Engine Implementation (Phase 2) | done |
| Intraday Stock Tracker Dashboard UI | done |
| Remaining Intraday Dashboard Pages | done |
| Real API Implementation (Phase 3) | done |
| Angel One Market Data Integration (Phase 4) | planned |

---

## Strategy Engine Implementation (Phase 2) `done`

**Intent**: Implement a deterministic, stateless, side-effect-free pipeline for strategy simulation and calibration using historical data.
**Done when**: The engine deterministically transforms configuration and historical candles into verifiable signal snapshots without any live broker execution.

- [x] Design it (spec): [0001](../specs/0001-strategy-engine-implementation/index.md)
- [x] Build it: /develop
  - [x] Core types & config validation (AC-1, AC-2)
  - [x] Eligibility & feature pipeline without look-ahead (AC-3)
  - [x] Signal scoring & snapshot building (AC-4)
  - [x] Lifecycle management & Simulation runner (AC-5, AC-6)
  - [x] Reporting & Fixtures (AC-7, AC-8)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Intraday Stock Tracker Dashboard UI `done`

**Intent**: Implement a pure UI shell for the Intraday Stock Tracker with mock data and local state transitions, ensuring pixel-perfect fidelity to the Stitch designs.
**Done when**: All screens are built, responsive, and interactive with mock data, without connecting to real APIs.

- [x] Design it (spec): [0002](../specs/0002-intraday-dashboard-ui/index.md)
- [x] Build it: /develop
  - [x] Design tokens, layout shell, and mock state providers (AC-1, AC-6, AC-8)
  - [x] Screen 1 (Dashboard), Empty/Delayed states, Screen 2 (Signal Detail), Screen 3 (Expired state) (AC-2, AC-3)
  - [x] Screen 4 (Trade Entry Modal), Screen 5 (Risk Error Modal), Screen 6 (Open Trade Detail) (AC-4, AC-5)
  - [x] Screen 7 (Trade Journal + Audit Drawer) (AC-7)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Remaining Intraday Dashboard Pages `done`

**Intent**: Design and implement the remaining list views (Trades, Signals), the Performance charts, and the Settings page.
**Done when**: All list views and charts render correctly using mock data and match the STITCH design tokens.

- [x] Design it (spec): [0003](../specs/0003-remaining-dashboard-pages/index.md)
- [x] Build it: /develop Remaining Intraday Dashboard Pages
  - [x] Implement SettingsContext and `/settings` (AC-4)
  - [x] Implement Trades and Signals lists (AC-1, AC-2)
  - [x] Install Recharts and implement Performance dashboard (AC-3)
  - [x] Enhance Journal with filtering and mock export (AC-5)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Real API Implementation (Phase 3) `done`

**Intent**: Transition from local mock data to a production backend featuring a NestJS Backend for the API and Scanner, Supabase PostgreSQL for persistence, and migrating Next.js to `apps/web`.
**Done when**: The UI runs against the real NestJS API, Supabase stores signals/trades securely, and the scanner runs continuously inside the NestJS worker.

- [x] Design it (spec): [0004](../specs/0004-real-api-implementation/index.md)
- [x] Build it: /develop Real API Implementation
  - [x] Migrate Next.js to `apps/web` and scaffold NestJS in `apps/backend`
  - [x] Migrate Scanner Pipeline into NestJS Module
  - [x] Implement Supabase Client and REST API Controllers
  - [x] Update frontend adapters to consume the new NestJS API
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Angel One Market Data Integration (Phase 4) `planned`

**Intent**: Integrate Angel One's SmartAPI as the real market data source for the Scanner Worker, discarding mock data.
**Done when**: The worker maintains a stable WebSocket connection to Angel One, normalizes ticks into 1m/5m candles, and the strategy engine acts on this verified real market data.

- [ ] Design it (spec): [0005](../specs/0005-angel-one-market-data.md)
- [ ] Build it: /develop Angel One Market Data Integration
  - [ ] Define Provider interface and canonical domain types (AC-3, AC-4)
  - [ ] Implement TickNormalizer and CandleAggregator (AC-3, AC-4)
  - [ ] Create AngelOneMarketDataProvider with SmartAPI SDK (AC-1, AC-2)
  - [ ] Implement reconnect state machine (AC-5)
  - [ ] Wire provider into Scanner, flush FeedHealth to Supabase (AC-1, AC-4, AC-6, AC-8)
  - [ ] Implement live smoke-test CLI script (AC-7)
- [ ] Verify it: /check verify
- [ ] Test it: /test
