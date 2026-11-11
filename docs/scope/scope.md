# Project Scope

**Build approach:** Tracer Bullet (each feature built end to end, data to API to page, working and narrow, before the next).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). A feature can carry its own tag to do more or less.
**Users:** a single trader for now; multi user data scoping is deferred.

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
| Top Bar Symbol Search | done |
| Analysis Page Chart | done |
| Add bulk actions to manage multiple trades | in-progress |
| Deploy Monorepo Web and Backend on Free Tier | in-progress |
| Market Intelligence and Explainable Analysis | done |
| Stitch Mobile View and Responsive Tab Views | in-progress |
| Sign In and Access Control | in-progress |
| Guru Strategy Backtest Lab | in-progress |
| Backtest History Provider | in-progress |
| Guru Strategy Live Promotion | in-progress |
| Real News Ingestion | in-progress |
| News Aware Trade Analysis | in-progress |
| Market Intelligence Page Real Data | in-progress |
| Signal Scorecard | in-progress |
| Position Sizing and Risk Limits | in-progress |
| Correlated Exposure Guard | planned |
| Paper Trading Ledger | planned |
| Regime Strategy Filters | planned |
| Signal Alerts | planned |
| Journal Tags and Patterns | planned |
| Weekly AI Trade Debrief | planned |
| Options Market Context | planned |
| Market Hours Monitoring | planned |
| Database Backups | planned |
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

## Top Bar Symbol Search `done`

**Intent**: Make the top bar search box a quick jump to any of today's watched F&O stocks, with live price, change and plan status, reachable from the keyboard.
**Done when**: Typing part of a symbol lists up to 8 stocks, watched F&O ones first with live context and any other NSE stock tagged "Not watched"; Enter or click opens the stock's analysis page (open plan) or market page; ⌘K / Ctrl+K, arrows and Esc work; it works before the open and falls back to live stocks if the list can't load.

- [x] Design it (spec): [0012](../specs/0012-topbar-symbol-search.md) · code in `apps/web/components/domain/SymbolSearch.tsx`, `apps/web/lib/symbolSearch.ts`, `GET /api/v1/scanner/universe`
- [x] Build it: /develop Top Bar Symbol Search
  - [x] Universe endpoint and search core (matching, 8 cap, route choice) (AC-1, AC-2, AC-5)
  - [x] SymbolSearch combobox in the top bar with live rows, tags, empty, loading and fallback states (AC-1, AC-3, AC-4, AC-5, AC-8)
  - [x] Keyboard (⌘K / Ctrl+K, arrows, Enter, two step Esc) and accessible combobox roles, with tests (AC-6, AC-7)
  - [x] Every NSE stock findable: NSE list on the backend, F&O first ranking, "Not watched" rows, F&O only fallback note (AC-1 to AC-5, AC-10)
  - [x] Not streamed banner on the market page for non F&O stocks, with tests (AC-9)
- [x] Verify it: /check verify Top Bar Symbol Search
- [x] Test it: /test Top Bar Symbol Search

---

## Analysis Page Chart `done`

**Intent**: Implement an interactive candlestick chart on the dynamic stock analysis page to give traders visual confirmation of the strategy setup.
**Done when**: The chart renders historical candles, live price updates, volume bars, and horizontal setup lines (Entry, Stop Loss, Target) using TradingView Lightweight Charts.

- [x] Design it (spec): [0013](../specs/0013-analysis-page-chart.md)
- [x] Build it: /develop Analysis Page Chart
  - [x] Install library and create component skeleton (AC-1, AC-6)
  - [x] Wire SignalContext and render candles with volume (AC-2, AC-5, AC-7)
  - [x] Implement setup price lines and real-time tick updates (AC-3, AC-4)
  - [x] Replace placeholder in UI
- [x] Verify it: /check verify Analysis Page Chart
- [x] Test it: /test Analysis Page Chart

---

## Add bulk actions to manage multiple trades `in-progress`

**Intent**: Add bulk actions to the Trades page so users can manage multiple positions at once without repetitive clicking.
**Done when**: The Trades table has checkboxes, a floating action bar appears on selection, and the bulk close action successfully iterates and executes the close logic for all selected trades.

- [x] Design it (spec): [0014](../specs/0014-bulk-trade-actions/index.md)
- [x] Build it: /develop Add bulk actions to manage multiple trades
  - [x] Checkboxes and floating action bar (AC-1, AC-2)
  - [x] Client side loop and notification (AC-3, AC-4)
- [ ] Verify it: /check verify Add bulk actions to manage multiple trades
- [ ] Test it: /test Add bulk actions to manage multiple trades

---

## Deploy Monorepo Web and Backend on Free Tier `in-progress`

**Intent**: Deploy the Next.js frontend to Vercel and the NestJS backend scanner to Render free web service via Docker, with automated market hours pings for continuous trading hours uptime.
**Done when**: The web app runs live on Vercel, the backend scanner runs on Render connected to Angel One and Supabase, Next.js rewrites proxy API and SSE traffic, and a scheduled pinger maintains backend wakefulness during trading hours.

- [x] Design it (spec): [0016](../specs/0016-deployment-strategy/index.md) · code in `apps/backend/Dockerfile`, `render.yaml`, `apps/web/next.config.ts`, `docs/deployment/free_tier_setup_guide.md`
- [x] Build it: /develop Deploy Monorepo Web and Backend on Free Tier
  - [x] Production multi stage Dockerfile for backend in monorepo
  - [x] Render blueprint configuration (render.yaml)
  - [x] Vercel deployment and Next.js dynamic rewrites in next.config.ts
  - [x] Market hours heartbeat schedule setup on cron job org
- [ ] Verify it: /check verify Deploy Monorepo Web and Backend on Free Tier

---

## Market Intelligence and Explainable Analysis `done`

**Intent**: Introduce broad market and sector context, official company announcements and news ingestion, derived investor sentiment, and delayed institutional activity reporting into an explainable analysis card and drawer that contrasts positive factors against contradictory factors and runs deterministic safety gates.
**Done when**: The dashboard shows live market breadth and regime, official news and filings are ingested and deduplicated, institutional disclosures are clearly marked as delayed context, and the stock analysis page renders the complete Explainable Analysis Card with deterministic risk gates and evidence breakdown.

- [x] Design it (spec): [0017](../specs/0017-market-intelligence-and-explainable-analysis/index.md) and [0018](../specs/0018-reusable-components-and-api-integration/index.md) · code in `apps/backend/src/intelligence/` and `apps/web/`
- [x] Build it: /develop Market Intelligence and Explainable Analysis
  - [x] Shared contracts and DTO schemas for market context, news, and evidence (0018 AC-1)
  - [x] IntelligenceController and backend ingestion services in NestJS (0017 AC-1..7, 0018 AC-2, AC-3)
  - [x] ExplainableAnalysisService for deterministic risk gates and factor scoring (0017 AC-8..10, AC-12)
  - [x] Reusable React hooks with SWR and latency safety gating (0018 AC-5, AC-7)
  - [x] Pure presentation UI components with loading and error boundaries (0017 AC-11, 0018 AC-4, AC-6, AC-8..10)
- [x] Verify it: /check verify Market Intelligence and Explainable Analysis
- [x] Test it: /test Market Intelligence and Explainable Analysis

---

## Stitch Mobile View and Responsive Tab Views `in-progress`

**Intent**: Implement the Stitch project `5780553391039865460` (`Mobile Dashboard - Market & Active Signals`) mobile experience across the application shell and all five primary bottom navigation tabs (`Dashboard`, `Signals`, `Trades`, `Journal`, and `Settings`) using responsive Tailwind breakpoints, mobile position surveillance cards, a two by two sector regime heat grid, a pre trade discipline gate, and touch friendly bottom sheets.
**Done when**: On mobile viewports (`<768px` and `<1024px`), `Topbar` and `BottomNav` render the compact mobile chrome with secondary route menu sheet and expandable search, `/dashboard` renders the full Stitch mobile section sequence wired to live contexts and intelligence hooks, wide tables across `Dashboard`, `Trades`, and `Journal` switch to stacked `MobilePositionCard` components, modals and the audit drawer anchor as bottom sheets, and stale or disconnected feeds lock execution buttons across all mobile views.

- [x] Design it (spec): [0019](../specs/0019-stitch-mobile-view/index.md) · code in `apps/web/components/layout/`, `apps/web/components/domain/`, `apps/web/app/dashboard/`, `apps/web/app/settings/`
- [x] Build it: /develop Stitch Mobile View and Responsive Tab Views
  - [x] Mobile AppShell, compact Topbar with menu sheet and expandable search, and BottomNav touch targets (AC-1, AC-2)
  - [x] Mobile Dashboard sections: Disclaimer Banner, Regime & Breadth Bar, 2 col Capital Guard, 3 col SignalCard with evidence chips, 2x2 Sector Heat Grid, and Pre-Trade Discipline Gate (AC-3, AC-4, AC-6, AC-9)
  - [x] MobilePositionCard and responsive tab views across Dashboard, Trades, Journal, Signals, and Settings (AC-5, AC-7, AC-9)
  - [x] Mobile bottom sheet adaptation for TradeJournalAuditDrawer, TradeEntryModal, TradeExitModal, and Adjust SL sheet with component tests (AC-8, AC-9)
- [ ] Verify it: /check verify Stitch Mobile View and Responsive Tab Views
- [x] Test it: /test Stitch Mobile View and Responsive Tab Views

---

## Sign In and Access Control `in-progress`

**Intent**: Invite only Supabase email and password sign in. Every page and API route requires a signed in user, and admin only areas (the backtest lab) require the admin role. From spec 0020's admin gate.
**Done when**: You can sign in, reset a password, and sign out. Every `/api/v1/*` call carries a verified bearer token, the scanner stream works with a ticket, and a non admin can neither see nor call the backtest lab.

- [x] Design it (spec): [0021](../specs/0021-sign-in-access-control/index.md) · code in `apps/backend/src/auth/`, `apps/web/proxy.ts`, `apps/web/lib/auth/`, `apps/web/app/login/`
- [ ] Build it: /develop Sign In and Access Control
  - [x] Backend AuthGuard (JWKS, pinned claims), CORS, `/me`, and the web login page plus `apiFetch` end to end (AC-1, AC-4, AC-5, AC-10)
  - [x] Proxy and layout page gate, and every web call moved to `apiFetch` (AC-3, AC-5)
  - [x] SSE tickets, AdminGuard with role cache, and the admin nav and page gate (AC-6, AC-7, AC-8)
  - [ ] PKCE confirm route, forgot and reset password, sign out, and the Supabase settings (AC-2, AC-9, AC-11)
- [ ] Verify it: /check verify Sign In and Access Control
- [x] Test it: /test Sign In and Access Control

---

## Guru Strategy Backtest Lab `in-progress`

**Intent**: Test five YouTube guru intraday rules (adapted to NSE) on years of Nifty and Sensex 5m history with realistic costs, against buy and hold and coin toss baselines, and give each a pre registered PASS or FAIL. Admin only.
**Done when**: An admin can backfill history, run all rules from the CLI or the `/dashboard/backtest` page, and see an out of sample leaderboard with equity curves, per year results, trades, and gate badges.

- [x] Design it (spec): [0020](../specs/0020-guru-strategy-backtest-lab/index.md) · code in `apps/backend/src/scanner/strategy/guru/`, `apps/backend/src/backtest/`, `apps/backend/src/auth/`, `apps/web/app/dashboard/backtest/`
- [x] Build it: /develop Guru Strategy Backtest Lab
  - [x] Migration, AdminGuard, and web admin gate (AC-1, AC-11)
  - [x] Historical backfill for NIFTY and SENSEX with retry, resume, and lock (AC-1, AC-12)
  - [x] Backtest core, cost model, metrics, 70/30 split, and the first rule `UP_ORB` end to end with gate and leaderboard thread (AC-3, AC-4, AC-5, AC-7, AC-8, AC-9)
  - [x] Remaining rules plus baselines, and the full leaderboard page with mobile cards (AC-2, AC-6, AC-9, AC-10)
- [ ] Verify it: /check verify Guru Strategy Backtest Lab
- [x] Test it: /test Guru Strategy Backtest Lab

---

## Backtest History Provider `in-progress`

**Intent**: Make the backtest lab's history source pluggable (Angel One or Kite Connect), give a clear message for Angel One's AG8004, and judge the gate on NIFTY alone when SENSEX history is unavailable. From spec 0020, because Angel One rejects historical calls.
**Done when**: The backfill loads 5m and daily history from a working provider into `candles`, and the lab runs end to end on it.

- [x] Design it (spec): [0022](../specs/0022-backtest-history-provider/index.md) · code in `apps/backend/src/backtest/history/`
- [ ] Build it: /develop Backtest History Provider
  - [x] Provider interface with Angel One wrapped, the historical key option and AG8004 message (AC-1, AC-2)
  - [x] Unavailable symbol handling and the NIFTY only gate with labels (AC-4, AC-5, AC-6)
  - [ ] Kite provider, blocked on the token flow decision (AC-3)
- [ ] Verify it: /check verify Backtest History Provider
- [x] Test it: /test Backtest History Provider

---

## Guru Strategy Live Promotion `in-progress`

**Intent**: Let an admin switch on, per rule and symbol, only the guru rules whose latest backtest passed the gate, so they appear as normal signal cards through the existing risk gates. No automatic orders. From spec 0020.
**Done when**: A passing rule toggled on in Settings emits live signals from `multiStrategyEngine` on closed bars, and a rule whose newer run fails is blocked automatically.

- [x] Design it (spec): [0023](../specs/0023-guru-strategy-live-promotion/index.md) · code in `apps/backend/src/scanner/guru-live/`, `apps/backend/src/backtest/live/`, `apps/backend/src/backtest/engine/fills.ts`, `apps/web/components/domain/backtest/LiveToggle.tsx`
- [x] Build it: /develop Guru Strategy Live Promotion
  - [x] Toggles table and admin API with gate checks and states (AC-1, AC-8)
  - [x] GuruLiveService: index feeds, 5m bars, warm up, UP_ORB on NIFTY end to end to a GURU signal (AC-2, AC-3, AC-5)
  - [x] Shared fill and exit function, stop entries and OCO, all rules, plan book and 15:15 exit (AC-4, AC-6)
  - [x] Gate cache with blocked and resume, Live switches in the lab, Settings list, GURU card tag (AC-7, AC-8, AC-9)
- [ ] Verify it: /check verify Guru Strategy Live Promotion
- [ ] Test it: /test Guru Strategy Live Promotion

---

## Real News Ingestion `in-progress`

**Intent**: Replace the seed and invented items on `/dashboard/news` with real NSE and BSE announcements, market news RSS, and Alpha Vantage news for the watched F&O universe, fetched on demand and every 5 minutes, and classified by rules, then Gemini, then a neutral default.
**Done when**: The page shows only real, linked items with how each was classified, the Fetch button and schedule both bring in new items without duplicates, and no seed item is ever served.

- [x] Design it (spec): [0024](../specs/0024-real-news-ingestion/index.md) · code in `apps/backend/src/intelligence/news/`, `apps/web/app/dashboard/news/`
- [x] Build it: /develop Real News Ingestion
  - [x] Migration, BSE adapter, symbol mapper, rules v1, dedup storage, fetch API, seed removal: real items end to end (AC-1, AC-4, AC-5, AC-6, AC-7, AC-9)
  - [x] NSE, RSS and Alpha Vantage adapters with independent failure (AC-3, AC-9)
  - [x] Gemini step with the atomic daily cap, the cron schedule, concurrency and pruning (AC-2, AC-6)
  - [x] Page: Fetch button, last fetch line, classification labels, empty state, SSE refresh (AC-1, AC-6, AC-8)
  - [x] Admin controls: admin only fetch, cancel, schedule pause, HIGH news kept (AC-1, AC-10, AC-11)
  - [x] News sources: official exchange RSS via config (off until confirmed), honest requests, skipped handling, Alpha Vantage disabled, company names file, universe query fix (AC-3, AC-4, AC-12)
- [ ] Verify it: /check verify Real News Ingestion
- [x] Test it: /test Real News Ingestion

---

## News Aware Trade Analysis `in-progress`

**Intent**: Use the real classified news to mark live signals (scanner stocks, guru index signals, analysis Gate 06) as pass, warn, or blocked, and show in the backtest lab whether that same news gate would have improved results.
**Done when**: Every new signal carries a stored entry verdict with linked news, late news shows as a separate after entry verdict, and each backtest run shows a with/without news comparison over covered trades with its sample size.

- [x] Design it (spec): [0025](../specs/0025-news-aware-trade-analysis/index.md) · code in `apps/backend/src/intelligence/news/`, `apps/backend/src/backtest/`, signal cards and backtest run view in `apps/web/`
- [x] Build it: /develop News Aware Trade Analysis
  - [x] Shared `news-gate-v1` function, `signals` migration (symbol, entry and after entry verdicts), entry check on scanner and guru inserts (umbrella AC-1, AC-2, AC-4; live AC-1, AC-2, AC-7)
  - [x] After entry re-check, `signal:news-gate` SSE, signal API fields, Gate 06 rewrite, signal card badges (live AC-3 to AC-6)
  - [x] Backtest news comparison service, admin endpoint, run view panel (backtest AC-1 to AC-6)
- [ ] Verify it: /check verify News Aware Trade Analysis
- [x] Test it: /test News Aware Trade Analysis

---

## Market Intelligence Page Real Data `in-progress`

**Intent**: Every number on the Market Intelligence page and the dashboard regime strip comes from a real source, or shows a dash, never a sample value. Drift enrolled: spec 0026 was built before it had a row.
**Done when**: NIFTY 50 and India VIX come from the live feed, the last real reading shows with its time when ticks stop, institutional data says "not connected" until a real source exists, and no sample number renders anywhere.

- [x] Design it (spec): [0026](../specs/0026-intelligence-page-real-data/index.md) · code in `apps/backend/src/intelligence/`, `apps/web/app/dashboard/intelligence/`
- [x] Build it: /develop Market Intelligence page real data
  - [x] NIFTY and VIX index ticks, kept out of breadth (AC-1, AC-2, AC-6)
  - [x] Last real reading saved and served with its time; nulls instead of samples (AC-3, AC-4, AC-5)
  - [x] Institutional empty state and real provenance block (AC-7, AC-8)
  - [x] Analysis Gate 03 and evidence from real 5m candles (AC-9, AC-10, AC-11)
- [ ] Verify it: /check verify Market Intelligence page real data
- [x] Test it: /test Market Intelligence page real data

---

# Next slice: measure, then protect, then act (planned 2026-11-11)

Goal: be able to say, with numbers, which strategies to keep, and have every signal come with a size or a skip reason. Order follows "measure, then protect": the scorecard proves the edge, risk and paper trading protect capital, regime filters sharpen it, then alerts, learning and context, then reliability. Every feature stays decision support; orders are always placed by hand.

## Slice A: Measure the edge

## Signal Scorecard `in-progress`

**Intent**: Turn the outcomes the system already reconciles into a per strategy report card, so you can keep what works and switch off what doesn't.
**Done when**: A Scorecard page shows win rate, average R and expectancy per strategy, setup, time of day bucket, market regime and news verdict, with sample size on every number and a clear "too few trades" flag; numbers match the reconciled signal outcomes.

code in `apps/backend/src/scorecard/`, `apps/web/app/dashboard/performance/` · **Spec**: [0027](../specs/0027-signal-scorecard/index.md) · **Design**: [Signal Scorecard canvas](https://claude.ai/artifact/XAPsBkouzLiEgLPmuLamuD)

- [x] /architect Signal Scorecard (spec)
- [x] Build it: /develop Signal Scorecard
  - [x] Migration, insert stamping (strategy, version, regime) and backfill (AC-11)
  - [x] Aggregation module and thin thread: API plus Scorecard page replacing the mock Performance page (AC-1 to AC-6, AC-13, AC-14)
  - [x] All five cuts, filters and the cumulative R curve (AC-7, AC-9, AC-10)
  - [x] Min sample setting and "too few trades" flag (AC-8, AC-12)
- [ ] Verify it: /check verify Signal Scorecard
- [ ] Test it: /test Signal Scorecard

## Paper Trading Ledger `planned` · needs a decision

**Intent**: Track every signal as if it were taken, with the cost model and sizing, so you can separate "the signals are weak" from "my execution is weak".
**Done when**: Each new signal opens a paper position with entry, size, costs and exit from live prices; a paper equity curve and per strategy results sit beside your real journal results for the same period.

- [ ] /architect Paper Trading Ledger

## Slice B: Protect capital

## Position Sizing and Risk Limits `in-progress`

**Intent**: A risk engine that turns each signal into "take N shares" or "skip, reason", using limits you set in Settings.
**Done when**: Settings hold risk per trade, daily loss limit and max open trades; every signal card shows a suggested quantity from its stop distance, or a skip reason once a limit is reached; limits are enforced from today's journal and open plans.

code in `apps/backend/src/risk/`, `apps/web/components/domain/` (RiskVerdict, TakeTradeDialog, CloseTradeDialog, RiskLimitsSettings) · **Spec**: [0028](../specs/0028-position-sizing-risk-limits/index.md) · **Design**: [Signal Scorecard canvas, Risk and Journal artboards](https://claude.ai/artifact/XAPsBkouzLiEgLPmuLamuD)

- [x] /architect Position Sizing and Risk Limits (spec)
- [x] Build it: /develop Position Sizing and Risk Limits
  - [x] Migration, pure sizing function and risk settings API (AC-1 to AC-5, AC-11)
  - [x] Verdicts on signal endpoints and cards, user scoped (AC-6, AC-12)
  - [x] Journal: user scoping, quantity, direction, close with exit and P&L (AC-9, AC-11, AC-12)
  - [x] Live refresh, Take this trade prefill, Settings wired (AC-7, AC-8, AC-10, AC-1)
- [ ] Verify it: /check verify Position Sizing and Risk Limits
- [ ] Test it: /test Position Sizing and Risk Limits

## Correlated Exposure Guard `planned` · needs a decision

**Intent**: Stop several signals in the same sector or direction from stacking into one oversized bet.
**Done when**: A signal that would push same sector or same direction exposure past your limit shows "skip, correlated exposure" with the trades it overlaps; the limit is editable in Settings.

- [ ] /architect Correlated Exposure Guard

## Regime Strategy Filters `planned` · needs a decision

**Intent**: Use the market regime and VIX band to allow or block each strategy, and prove in the backtest that a filter helps before trusting it live.
**Done when**: Each strategy has a regime and VIX rule that marks signals allowed or filtered (shown, never hidden); the backtest lab shows results with and without each filter over the same trades.

- [ ] /architect Regime Strategy Filters

## Slice C: Act and learn

## Signal Alerts `planned` · needs a decision

**Intent**: Get told about new signals, news blocks and exits without watching the screen.
**Done when**: You receive an alert within seconds for a new signal (with size or skip reason), a news block, and a plan exit; you can switch each alert type on or off; alerts never place orders.

- [ ] /architect Signal Alerts

## Journal Tags and Patterns `planned` · needs a decision

**Intent**: Tag each trade with why you took it and whether you followed the plan, then surface the patterns in your own behaviour.
**Done when**: Each journal trade can carry setup, followed plan (yes or no) and mistake tags; a patterns view shows results by tag and time of day with sample sizes.

- [ ] /architect Journal Tags and Patterns

## Weekly AI Trade Debrief `planned` · needs a decision

**Intent**: A short, plain weekly review of your trades, signals and news, written by AI from your own data.
**Done when**: Once a week a debrief appears covering what worked, what didn't and one thing to change, citing the trades it draws on; it can be regenerated, and it states when data is thin.

- [ ] /architect Weekly AI Trade Debrief

## Options Market Context `planned` · needs a decision

**Intent**: Add NIFTY options positioning (open interest, put call ratio, max pain) as intraday context next to breadth and news.
**Done when**: The Market Intelligence page shows live put call ratio, max pain and the strikes with the biggest open interest change, from a real source with its time, or a dash when unavailable.

- [ ] /architect Options Market Context

## Slice D: Reliability

## Market Hours Monitoring `planned` · needs a decision

**Intent**: Be warned during market hours when the feed, the scanner or the news fetch stops working, instead of finding out later.
**Done when**: A feed drop, a stalled scanner or repeated failed fetches during market hours raise an alert within a few minutes; a health page shows the last good time for each.

- [ ] /architect Market Hours Monitoring

## Database Backups `planned` · needs a decision

**Intent**: Make sure signals, trades, journal and backtest results survive a mistake or an outage.
**Done when**: The database is backed up on a schedule you can see, and a restore has been tested once and written down.

- [ ] /architect Database Backups

## Deferred

- Multi user data scoping (only one trader for now).
- A real FII/DII and bulk deal source (needs a source decision; website scraping is ruled out).
- Automated order placement (out of scope: the app stays decision support until the scorecard has months of evidence).
- Walk forward testing of the four scanner strategies on stock history (after the scorecard shows which ones deserve tuning).


## References

**Project sources**: the reconciled signal outcomes (spec 0009), the backtest lab and its gate (spec 0020), the news gate comparison pattern (spec 0025), market regime and VIX bands (specs 0017 and 0026), root `AGENTS.md` (decision support only, no automated orders).

**Practices and standards**: judge a strategy by expectancy in R with its sample size (Signal Scorecard); size positions from a fixed risk per trade (Position Sizing and Risk Limits); prove a filter on out of sample data before trusting it live (Regime Strategy Filters, deferred walk forward testing); measure before you add surface (slice order).

**Links** (web verified 2026-11-11):
- R multiples and expectancy (secondary explainer): https://eliteforextrading.pages.dev/r-multiples-explained/
- Fixed fractional position sizing (Adaptrade): https://www.adaptrade.com/MSA/fixfrac.htm
- Walk forward optimization (Wikipedia): https://en.wikipedia.org/wiki/Walk_forward_optimization
- SEBI circular on safer retail participation in algorithmic trading (4 Feb 2025; title and number verified only): https://www.sebi.gov.in/legal/circulars/feb-2025/safer-participation-of-retail-investors-in-algorithmic-trading_91614.html
