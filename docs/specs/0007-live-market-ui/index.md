# 0007. Live Market and Scanner UI

**Date**: 2026-09-29
**Status**: Proposed

## Summary

This spec implements the approved Stitch design for the live market data and scanner visualization UI. It adds two new routes (`/dashboard/markets` and `/dashboard/markets/[symbol]`), updates the existing dashboard to consume real data from spec 0006 endpoints, and introduces ~15 new components for market watch, scanner pipeline visualization, feed health, candle engine status, and stock detail with strategy evaluation. All values are sourced from the backend API (never hardcoded from Stitch screenshots), and all existing routes, components, and the design system are preserved and reused.

## Requirements

**User stories**:
- As a trader, I want a Markets page showing all monitored stocks with live prices, change percentages, volume, RVOL, and scanner state so that I can scan the market at a glance.
- As a trader, I want to click a stock and see its full detail page with chart, market metrics, scanner evaluation criteria, and any active setup so that I can make an informed journal entry decision.
- As a trader, I want the dashboard to show a real time summary (market status, stocks monitored, active signals, scanner health, market watch, open trades) so that I have a single pane of glass.
- As a developer, I want the scanner pipeline visualized as a node chain so that I can trace where data is flowing and where it breaks.

**Acceptance criteria**:
- **AC-1**: The sidebar contains a Markets link between Dashboard and Signals, with active state highlighting when on `/dashboard/markets` or `/dashboard/markets/[symbol]`.
- **AC-2**: The dashboard summary cards display real values from `GET /api/v1/market/status`, `GET /api/v1/market/watch`, and `GET /api/v1/signals`: market feed status, stocks monitored (total and eligible), active signals (count, long count, short count), and scanner health (status and last candle time). No hardcoded numbers.
- **AC-3**: The dashboard shows a compact scanner pipeline summary (connected state, tick rate, candle engine, strategy eval, signals count) with a link to the full Markets page.
- **AC-4**: The dashboard market watch section shows a table of all subscribed instruments with Symbol, LTP, Day Change, 1m Change, 5m Change, Volume, RVOL, Scanner State, and a Quick Action link. Rows navigate to `/dashboard/markets/[symbol]`.
- **AC-5**: The dashboard active signals section displays real signal data (symbol, direction, price, setup, confidence, entry zone, stop, targets, expiry, freshness) with "View Plan" and "I entered" actions. "I entered" records a journal entry only (no broker order). Zero signal state shows "No active signals" with scanner context.
- **AC-6**: The `/dashboard/markets` page shows: page header with live status badge, overview metric cards (stocks monitored, eligible, feed status, last update), a dense market watch table (Symbol, LTP, Change, 1m, 5m, Volume, RVOL, Volatility, Status), the scanner pipeline visualization, feed health details, and candle engine status.
- **AC-7**: The scanner pipeline is rendered as a horizontal 6 node chain (SmartAPI Feed, Tick Normalizer, Candle Engine, Liquidity Filter, Strategy Engine, Active Signals) with per node status (HEALTHY, DEGRADED, FAILED, WAITING) and connecting arrows.
- **AC-8**: The `/dashboard/markets/[symbol]` page shows: stock header (symbol, name, LTP, day change, live status), timeframe tabs (1m, 5m), candlestick chart with volume, market metrics grid (Day Range, 52W Range, Volume, RVOL, 1m Change, 5m Change, VWAP, Spread), scanner criteria matrix (6 criteria with pass/fail/not evaluated), current setup panel (or "No actionable setup"), and scanner audit trail.
- **AC-9**: The market status badge displays all 6 states: LIVE (green pulse + label), DELAYED (amber + label), STALE (grey + label), DISCONNECTED (red + label), SIMULATED (blue + label), MARKET_CLOSED (grey + session info). Status is never color only; always paired with a text label for accessibility.
- **AC-10**: All pages show skeleton loading states for every data section (market status, cards, tables, chart, pipeline, feed health). No full page blocking spinners.
- **AC-11**: Error states show actionable messages: "Unable to load market data" with a Retry button, "Market data unavailable" with last valid update time for disconnected scanner.
- **AC-12**: All numerical values (LTP, change %, volume, RVOL, confidence, entry/stop/target prices, timestamps) use JetBrains Mono. All UI labels use Inter. This matches the existing design system.
- **AC-13**: No Stitch screenshot values are hardcoded as production values. Every displayed value comes from the API data layer.
- **AC-14**: No Angel One credentials (API key, client code, TOTP, JWT, feed token) are displayed in any user facing component. The diagnostics pipeline shows node names and status only.
- **AC-15**: The application remains responsive at 1440, 1280, 1024, 768, and 390px widths. Market watch table uses horizontal scrolling on mobile; stock detail stacks chart and metrics vertically.
- **AC-16**: All interactive elements are keyboard navigable with visible focus states. Tables use semantic `<table>` markup. Status badges include ARIA labels. Dialogs and tabs follow existing accessible patterns.
- **AC-17**: Mock mode (`MARKET_DATA_PROVIDER=mock`) clearly shows SIMULATED status. Mock data is never visually presented as LIVE.
- **AC-18**: Existing routes (`/dashboard`, `/dashboard/signals`, `/dashboard/trades`, `/dashboard/journal`, `/dashboard/performance`, `/settings`) continue working without regressions.

## Decision

**Chosen option**: Integrate the Stitch design into the existing Next.js application by extending the current component library and design system, consuming the REST endpoints defined in spec 0006 via a shared MarketDataContext with polling.

**Implementation skills**: `supabase` (`CodesWithAnkit/trading_app`, `.agents/skills/supabase/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No new database tables. This spec consumes the APIs defined in spec 0006:
- `GET /api/v1/market/status` → MarketStatus
- `GET /api/v1/market/watch` → MarketInstrument[]
- `GET /api/v1/candles?symbol=...&timeframe=...&limit=...` → Candle[]
- `GET /api/v1/scanner/diagnostics` → ScannerDiagnostics
- `GET /api/v1/signals` → Signal[]

Frontend TypeScript interfaces (consumed from API responses):
```typescript
interface MarketStatus {
  status: 'LIVE' | 'DELAYED' | 'STALE' | 'DISCONNECTED' | 'SIMULATED';
  providerType: 'angelone' | 'mock';
  lastTickAt: string | null;
  subscribedCount: number;
  sessionState: 'PRE_MARKET' | 'OPEN' | 'CLOSING' | 'CLOSED';
  serverTime: string;
}

interface MarketInstrument {
  symbol: string;
  ltp: number;
  dayOpen: number;
  change1dPct: number;
  volume: number;
  lastTickAt: string;
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
}

interface ScannerDiagnostics {
  ticksPerMinute: number;
  candles1m: number;
  candles5m: number;
  strategyEvaluations: number;
  eligibleSetups: number;
  activeSignals: number;
  lastTickAt: string | null;
  lastCandleAt: string | null;
  sessionState: string;
  providerType: string;
  uptime: number;
}
```

**State transitions**:
- Market status badge: derives display state from `MarketStatus.status` + `MarketStatus.sessionState`. If `sessionState === 'CLOSED'` and `status !== 'SIMULATED'`, display MARKET_CLOSED regardless of feed status.
- Data freshness: if `lastTickAt` is more than 60s ago while LIVE, transition to DELAYED. If more than 300s, transition to STALE.

**API surface**:
No new backend endpoints. This spec consumes the 5 endpoints defined in spec 0006.

Frontend data access:
| Hook / Context | Endpoints consumed | Polling interval | Pages using it |
|---|---|---|---|
| `MarketDataContext` | `/api/v1/market/status`, `/api/v1/market/watch` | 5s | Dashboard, Markets, Stock Detail |
| `useScannerDiagnostics()` | `/api/v1/scanner/diagnostics` | 10s | Markets |
| `useCandles(symbol, timeframe)` | `/api/v1/candles` | 15s | Stock Detail |
| `useSignals()` (existing) | `/api/v1/signals` | 10s | Dashboard, Signals |

**Value sourcing**:
| Action / Component | Value displayed | Source |
|---|---|---|
| Topbar status badge | LIVE / SIMULATED / etc | `MarketDataContext` → `status.status` |
| Topbar timestamp | IST time | `MarketDataContext` → `status.serverTime`, formatted IST |
| Topbar freshness | "0.8s" | `Date.now() - new Date(status.lastTickAt).getTime()`, recomputed client side every 1s |
| Dashboard date line | "29 Sep 2026" | `new Date()` formatted with `Asia/Kolkata` timezone |
| Dashboard session | "09:15-15:30 IST" | Static string (market hours are fixed) |
| MetricCard: Market Feed Status | LIVE/DELAYED/etc | `MarketDataContext` → `status.status` |
| MetricCard: Stocks Monitored | count, eligible, filtered | `MarketDataContext` → `instruments.length`, derived eligible count from instruments with status !== 'UNAVAILABLE' |
| MetricCard: Active Signals | count, long/short breakdown | `useSignals()` → filter by status ACTIVE, count by direction |
| MetricCard: Scanner Health | status, last candle | `MarketDataContext` → `status.status` mapped to Healthy/Degraded/etc, `status.lastTickAt` for last candle time |
| Market Watch table: LTP | price | `MarketDataContext` → `instruments[].ltp` |
| Market Watch table: Day Change | percentage | `MarketDataContext` → `instruments[].change1dPct` |
| Market Watch table: Volume | number | `MarketDataContext` → `instruments[].volume` |
| Market Watch table: Scanner State | badge | Joined from `useSignals()` → match by symbol |
| Scanner Pipeline nodes | per node status | `useScannerDiagnostics()` → derived from diagnostic fields |
| Feed Health card | provider, connection, reconnects | `useScannerDiagnostics()` fields |
| Candle Engine card | 1m/5m status, last completed | `useScannerDiagnostics()` → `candles1m`, `candles5m`, `lastCandleAt` |
| Stock Header: LTP | current price | `MarketDataContext` → find instrument by symbol |
| Stock Header: Day Change | percentage + absolute | `MarketDataContext` → `change1dPct`, `ltp - dayOpen` |
| Candlestick Chart | OHLCV candles | `useCandles(symbol, timeframe)` → candle array |
| Market Metrics grid | Day Range, RVOL, VWAP, etc | Derived from candles + instrument data |
| Scanner Criteria Matrix | pass/fail per criterion | Signal object's `metrics` field (from strategy engine output in spec 0006) |
| Current Setup panel | direction, entry, stop, targets, confidence | Signal object fields from `useSignals()` matched by symbol |
| Scanner Audit Trail | timestamp + event | Signal `created_at` + candle completion events (future API; initially shows "Not available") |

**Key invariants**:
- No component renders a hardcoded value from the Stitch screenshots as live data. Every displayed number, timestamp, and status comes from an API response or is explicitly marked as "Not available."
- The scanner audit trail on stock detail is designed as a component shell with the correct contract, but displays "Not available" until the backend provides historical evaluation data. This is not a stub; it is an honest state.
- The "I entered" button always routes through the existing TradeEntryModal and journal flow. It never places a broker order.
- All existing pages and components continue to work. No existing route is removed or broken.

**Security model**:
- All data displayed in user facing components comes from the public read endpoints defined in spec 0006.
- No Angel One credentials, JWT tokens, feed tokens, or raw SmartAPI payloads are rendered.
- The scanner diagnostics endpoint is gated by NODE_ENV on the backend; the frontend simply shows whatever the API returns.

**Configuration required**:
No new environment variables. The frontend inherits data behavior from the backend's `MARKET_DATA_PROVIDER` setting via the `providerType` field in the market status response.

**Critical test scenarios**:
- Happy path: Backend running with `MARKET_DATA_PROVIDER=angelone`, dashboard shows LIVE badge, real prices in market watch, real signal count, market status card shows "Angel One SmartAPI", stock detail for RELIANCE shows real LTP and chart. Verifies **AC-2, AC-4, AC-5, AC-8, AC-13**.
- Zero signals: No strategy signals exist, dashboard shows "No active signals" with scanner context (stocks monitored, last scan time), Markets page shows all stocks as "Monitoring". Verifies **AC-5, AC-11**.
- Disconnected state: Backend down or unreachable, dashboard shows DISCONNECTED with last valid update time, all data sections show error state with Retry. Verifies **AC-9, AC-11**.
- Mock mode: `MARKET_DATA_PROVIDER=mock`, all pages show SIMULATED badge, data uses mock values, no LIVE indication anywhere. Verifies **AC-17**.
- Market closed: After 15:30 IST, dashboard shows MARKET_CLOSED with session info and "Next session tomorrow, 09:15 AM". Verifies **AC-9**.
- Navigation: Markets link in sidebar active on `/dashboard/markets`, back navigation from stock detail to markets works, all existing routes still load. Verifies **AC-1, AC-18**.
- Responsive: Markets page at 390px shows card layout for instruments, horizontal scroll on market watch table, stock detail stacks vertically. Verifies **AC-15**.
- Accessibility: Tab through market watch table, focus visible on all rows, status badges have ARIA labels, chart has alt text. Verifies **AC-16**.

## Build plan

Tracer Bullet: one stock end to end first, then expand.

1. Create the `MarketDataContext` with `useMarketData` hook: polls `GET /api/v1/market/status` and `GET /api/v1/market/watch` every 5 seconds, provides data to all dashboard pages via context, satisfies **AC-13**
2. Create the `MarketStatusBadge` component supporting all 6 states (LIVE, DELAYED, STALE, DISCONNECTED, SIMULATED, MARKET_CLOSED) with proper color, icon, and ARIA label. Extend the existing `Badge` component. Update the Topbar to use it with real data from MarketDataContext, satisfies **AC-9, AC-16**
3. Add Markets link to the Sidebar between Dashboard and Signals with correct active state detection, satisfies **AC-1**
4. Rewrite the 4 dashboard summary cards to consume real data: Market Feed Status (from market status), Stocks Monitored (from market watch instruments count), Active Signals (from signals), Scanner Health (from market status). Keep MetricCard as base component, satisfies **AC-2**
5. Add the compact scanner pipeline summary to the dashboard (connected state, tick stream, candle engine, strategy eval, signals count) with "View full scanner and market pipeline" link to `/dashboard/markets`, satisfies **AC-3**
6. Add the dashboard Market Watch table showing all subscribed instruments with Symbol, LTP, Day Change, 1m Change, 5m Change, Volume, RVOL, Scanner State, Quick Action. Rows link to `/dashboard/markets/[symbol]`. Use JetBrains Mono for numbers, satisfies **AC-4, AC-12**
7. Update the dashboard Active Signals section to show real signal data with "View Plan" and "I entered" actions (using existing TradeEntryModal). Implement the zero signal state, satisfies **AC-5**
8. Create `/dashboard/markets/page.tsx`: page header with live status badge, overview metric cards row, dense market watch table (all columns from Stitch), scanner pipeline visualization (6 node horizontal chain), feed health card, candle engine status card, satisfies **AC-6, AC-7**
9. Implement the `ScannerPipeline` component: 6 nodes with connecting arrows, per node status badge (HEALTHY/DEGRADED/FAILED/WAITING), data from `useScannerDiagnostics()`, satisfies **AC-7**
10. Implement `FeedHealthCard` and `CandleEngineCard` components for the Markets page, consuming diagnostics data, satisfies **AC-6**
11. Create `/dashboard/markets/[symbol]/page.tsx`: stock header (symbol, name, exchange, LTP, day change, live status), timeframe tabs (1m, 5m), candlestick chart using Recharts with volume bars, satisfies **AC-8**
12. Add market metrics grid to stock detail: Day Range, 52W Range, Volume, RVOL, 1m Change, 5m Change, VWAP, Spread Friction. Derived from candles and instrument data, satisfies **AC-8, AC-12**
13. Add `ScannerEvaluation` component to stock detail: 6 criteria matrix (Universe Eligibility, Bid/Ask Spread, RVOL, Trend Bias, Setup Pattern, Risk/Reward) with pass/fail/not evaluated states from signal metrics, satisfies **AC-8**
14. Add current setup panel to stock detail: shows active signal details (direction, confidence, entry, stop, targets, expiry) or "No actionable setup" with explanation. Reuse existing SignalPlan component logic, satisfies **AC-8**
15. Add scanner audit trail component to stock detail (designed shell with correct contract, shows "Not available" until backend provides history), satisfies **AC-8**
16. Implement skeleton loading states for all data sections across all three pages, satisfies **AC-10**
17. Implement error states with actionable messages and Retry buttons for all data fetching failures, satisfies **AC-11**
18. Responsive pass: validate and fix layout at 1440, 1280, 1024, 768, 390px. Market watch table horizontal scroll on mobile, stock detail vertical stack, dashboard cards responsive grid, satisfies **AC-15**
19. Accessibility pass: keyboard navigation, focus states, ARIA labels on status badges, semantic tables, screen reader announcements for status changes, satisfies **AC-16**
20. Verify mock mode: ensure SIMULATED shows correctly, no LIVE masquerading, all pages functional with mock data, satisfies **AC-17**
21. Regression check: verify all existing routes still work (`/dashboard/signals`, `/dashboard/trades`, `/dashboard/journal`, `/dashboard/performance`, `/settings`), satisfies **AC-18**

## Consequences

**Positive**:
- The product transitions from a static prototype to a live market observation tool that visually proves the real data pipeline.
- The scanner pipeline visualization makes the data flow transparent, matching the Stitch design's information hierarchy (Market, Scanner, Strategy, Signals, Trades, Journal).
- The stock detail page gives traders the full picture for any instrument: chart, metrics, scanner evaluation, and active setup (or honest "no setup").

**Negative / tradeoffs**:
- The scanner audit trail component is a shell (shows "Not available") until the backend provides historical evaluation data. This is an honest state, not a stub, but limits the initial stock detail experience.
- Polling every 5 seconds for market watch means up to 5 seconds of price staleness visible in the UI.
- The candlestick chart uses Recharts which is not a dedicated financial charting library. Complex features (crosshair, zooming, drawing tools) may need a library upgrade later.

**Neutral**:
- The existing mock data files are not deleted. They serve as fallback and development fixtures.
- The MarketDataContext adds a new context provider wrapper. This nests inside the existing provider tree (SignalProvider, TradeProvider, DashboardProvider).
- The strategy evaluation criteria on stock detail depend on the backend's strategy engine port (spec 0006, build task 8). Until that ships, criteria show "Not evaluated."

## Follow-up

- [ ] Replace the Recharts candlestick chart with lightweight-charts (TradingView) when proper financial charting features are needed (crosshair, zoom, drawing tools, real time tick updates).
- [ ] Implement the scanner audit trail backend API to supply historical evaluation events for the stock detail timeline.
- [ ] Add RVOL, Volatility, and Liquidity columns to the market watch table once the backend computes these derived metrics.
- [ ] Add real time updates via Supabase Realtime or SSE to replace polling for sub second price updates.
