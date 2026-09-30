# Project Scope

## At a glance

| Feature | Status |
|---|---|
| Strategy Engine Implementation (Phase 2) | done |
| Intraday Stock Tracker Dashboard UI | done |
| Remaining Intraday Dashboard Pages | done |
| Real API Implementation (Phase 3) | done |
| Angel One Market Data Integration (Phase 4) | done |
| Live Dashboard Integration (Phase 4B) | done |
| Live Market and Scanner UI (Phase 4C) | done |
| Dynamic Stock Analysis & Strategy Engine (Phase 5) | done |
| Real Stock Analysis and Outcome Tracking (Phase 6) | in-progress |
| Top Bar Symbol Search | in-progress |
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

## Angel One Market Data Integration (Phase 4) `done`

**Intent**: Integrate Angel One's SmartAPI as the real market data source for the Scanner Worker, discarding mock data.
**Done when**: The worker maintains a stable WebSocket connection to Angel One, normalizes ticks into 1m/5m candles, and the strategy engine acts on this verified real market data.

- [x] Design it (spec): [0005](../specs/0005-angel-one-market-data/index.md)
- [x] Build it: /develop Angel One Market Data Integration
  - [x] Define Provider interface and canonical domain types (AC-3, AC-4)
  - [x] Implement TickNormalizer and CandleAggregator (AC-3, AC-4)
  - [x] Create AngelOneMarketDataProvider with SmartAPI SDK (AC-1, AC-2)
  - [x] Implement reconnect state machine (AC-5)
  - [x] Wire provider into Scanner, flush FeedHealth to Supabase (AC-1, AC-4, AC-6, AC-8)
  - [x] Implement live smoke-test CLI script (AC-7)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Live Dashboard Integration (Phase 4B) `done`

**Intent**: Connect the real Angel One market data pipeline end to end through the dashboard, replacing all mock/hardcoded data with live scanner output.
**Done when**: The dashboard shows real stock prices, real market status, real candles, and real signals (or an honest empty state) sourced from the live Angel One feed, with scanner diagnostics visible in development.

- [x] Design it (spec): [0006](../specs/0006-live-dashboard-integration/index.md)
- [x] Build it: /develop Live Dashboard Integration
  - [x] Instruments table, token resolution, and session clock (AC-1, AC-6)
  - [x] Market status and market watch APIs with in memory tick storage (AC-2, AC-4, AC-9)
  - [x] Dashboard context rewrite and MarketWatch component (AC-2, AC-3, AC-4)
  - [x] Strategy engine port to backend and candles API (AC-5, AC-8)
  - [x] Scanner diagnostics and mock path validation (AC-7, AC-10)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Live Market and Scanner UI (Phase 4C) `done`

**Intent**: Implement the approved Stitch design for live market data and scanner visualization UI, adding Markets and Stock Detail pages and updating the dashboard to consume real data.
**Done when**: The dashboard, Markets page, and Stock Detail page show real market data from the backend APIs with proper loading, error, and market closed states, and all existing routes continue working.

- [x] Design it (spec): [0007](../specs/0007-live-market-ui/index.md)
- [x] Build it: /develop Live Market and Scanner UI
  - [x] MarketDataContext, MarketStatusBadge, and sidebar update (AC-1, AC-9)
  - [x] Dashboard cards, scanner summary, market watch, and signals sections (AC-2, AC-3, AC-4, AC-5)
  - [x] Markets page with pipeline, feed health, and candle engine (AC-6, AC-7)
  - [x] Stock Detail page with chart, metrics, scanner evaluation, and setup (AC-8)
  - [x] Loading, error, responsive, accessibility, and mock mode (AC-10, AC-11, AC-15, AC-16, AC-17)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Dynamic Stock Analysis & Strategy Engine (Phase 5) `done`

**Intent**: Implement a dynamic market scanner that fetches the Nifty 50 or Top Gainers and evaluates them against 4 quantitative trading strategies (VWAP, Momentum, Mean-Reversion, Scalping) to automatically surface the top bullish stocks and generate trade plans.
**Done when**: The dashboard dynamically selects stocks, evaluates them using the new multi-strategy engine, displays the active or approaching setups on the UI, and allows saving generated trade plans to a manual journal.

- [x] Design it (spec): [0008](../specs/0008-dynamic-stock-analysis/index.md)
- [x] Build it: /develop Dynamic Stock Analysis
  - [x] Database migration for journal_entries (AC-7)
  - [x] Dynamic instrument discovery on backend startup (AC-1, AC-2)
  - [x] Implement Vwap, Momentum, MeanReversion, Scalping strategy evaluators (AC-3, AC-4, AC-5)
  - [x] API endpoints for /top-setups and /journal (AC-6)
  - [x] UI Integration: Top Bullish dashboard, Analysis page, Trade Plan component, and Journal UI (AC-6, AC-7, AC-8, AC-9, AC-10)
- [x] Verify it: /check verify
- [x] Test it: /test

---

## Real Stock Analysis and Outcome Tracking (Phase 6) `in-progress`

**Intent**: Eliminate mock data entirely during market hours by using real-time Angel One data for daily momentum scoring and "approaching" strategy setups. Adds Server Sent Events (SSE) for real-time updates and an end-of-day reconciliation task to track predicted vs actual outcomes.
**Done when**: The dashboard shows real stocks ranked by momentum score without mock fallbacks, approaching setups stream via SSE, and the system reconciles prediction outcomes at the end of the day to show accuracy summaries after hours.

- [x] Design it (spec): [0009](../specs/0009-real-stock-analysis/index.md), [0010](../specs/0010-live-exit-tracking/index.md) · assumed decision ([spec 0011](../specs/0011-live-eligibility-thresholds.md), owes /architect ratification) · code in `apps/backend/src/scanner/` (universe in `universe/`) and `apps/web/app/dashboard/`
- [x] Build it: /develop Real Stock Analysis and Outcome Tracking
  - [x] Database migration: `actual_high/low/close` and outcome columns (AC-6)
  - [x] Daily momentum score & Approaching setup detection (AC-1, AC-2)
  - [x] SSE `/stream` and analysis API endpoints (AC-3, AC-4, AC-5)
  - [x] EOD reconciliation cron and CLI task (AC-7, AC-8)
  - [x] Frontend: Remove mock fallback, integrate SSE for SignalContext (AC-1, AC-4, AC-11)
  - [x] Frontend: Approaching setup cards and after-hours outcome UI (AC-2, AC-9, AC-10)
  - [x] Gainers only universe: token cache, merged subscriptions, candle upsert, and the 15 minute F&O gainers refresh (AC-1, AC-12, AC-13)
  - [x] Quote mode feed with day change from the previous close (AC-1, AC-14)
  - [x] Backfill, restart recovery, daily reset, and universe status (AC-1, AC-12, AC-15)
  - [x] Stream all F&O stocks from the public instrument file, chunked subscriptions, REST paths removed (0009 AC-12, AC-13)
  - [x] Restart reload from saved candles, batched candle writes, top 20 gate, replay from saved candles (0009 AC-15, AC-16, AC-17)
  - [x] Live exit tracking: tick exits, 15:15 time exit, one open plan per stock and strategy, atomic writes, restart catch up (0010 AC-1 to AC-5, AC-7)
  - [x] Exit alerts, Closed today list, and live vs candle check results on the dashboard (0010 AC-6, AC-8, AC-9)
- [ ] Verify it: /check verify
- [x] Test it: /test

---

## Top Bar Symbol Search `in-progress`

**Intent**: Make the top bar search box a quick jump to any of today's watched F&O stocks, with live price, change and plan status, reachable from the keyboard.
**Done when**: Typing part of a symbol lists up to 8 watched stocks with live context; Enter or click opens the stock's analysis page (open plan) or market page; ⌘K / Ctrl+K, arrows and Esc work; it works before the open and falls back to live stocks if the list can't load.

- [x] Design it (spec): [0012](../specs/0012-topbar-symbol-search.md) · code in `apps/web/components/domain/SymbolSearch.tsx`, `apps/web/lib/symbolSearch.ts`, `GET /api/v1/scanner/universe`
- [x] Build it: /develop Top Bar Symbol Search
  - [x] Universe endpoint and search core (matching, 8 cap, route choice) (AC-1, AC-2, AC-5)
  - [x] SymbolSearch combobox in the top bar with live rows, tags, empty, loading and fallback states (AC-1, AC-3, AC-4, AC-5, AC-8)
  - [x] Keyboard (⌘K / Ctrl+K, arrows, Enter, two step Esc) and accessible combobox roles, with tests (AC-6, AC-7)
- [ ] Verify it: /check verify Top Bar Symbol Search
- [ ] Test it: /test Top Bar Symbol Search
