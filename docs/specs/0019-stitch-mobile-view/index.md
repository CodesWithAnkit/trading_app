# 0019. Stitch Mobile View and Responsive Tab Views

**Date**: 2026-10-15  
**Status**: In Progress  

## Summary

This specification defines the mobile user interface across the application shell and all five primary bottom navigation tabs (`Dashboard`, `Signals`, `Trades`, `Journal`, and `Settings`) based on Stitch project `5780553391039865460` (`Mobile Dashboard - Market & Active Signals`). It adapts the existing Next.js web application using responsive Tailwind CSS breakpoints, introducing a compact single tier mobile top bar, a slide over navigation sheet for secondary routes, mobile optimized signal and position surveillance cards, a two by two sector regime heat grid, a pre trade discipline gate checklist, and touch friendly bottom sheets for modals and audit drawers.

## Requirements

**User stories**:
- As a mobile trader, I want a compact single tier header and a thumb friendly bottom navigation bar so I can monitor live NSE market status and switch between Dashboard, Signals, Trades, Journal, and Settings on a phone screen without horizontal overflow.
- As a mobile trader, I want the Dashboard to present the Stitch mobile layout including the system disclaimer banner, compact market regime and breadth bar, two column capital guard summary, three column signal execution cards with evidence chips, stacked open position cards, two by two sector regime heat grid, and pre trade discipline gate checklist.
- As a mobile trader, I want wide desktop tables on the Dashboard, Trades, and Journal tabs replaced on mobile screens (`<768px`) by stacked position cards that preserve selection checkboxes, unrealized profit and loss, trailing stops, and one tap exit or audit actions.
- As a mobile trader, I want secondary workspace pages (Scanner, Market Intelligence, News and Filings, and Performance) reachable from a mobile navigation menu sheet in the top bar while keeping the five core tabs in the bottom navigation bar.
- As a mobile trader, I want trade entry modals, trade exit modals, and the trade journal audit drawer to open as full width bottom sheets on mobile viewports, and I want all execution buttons automatically locked whenever market data is delayed or disconnected.

**Acceptance criteria**:
- **AC-1**: On viewports below `1024px` (`lg`), `Topbar` renders a single `56px` (`h-14`) mobile header displaying the live connection pill (`LIVE` / `DELAYED` / `DISCONNECTED` with latency in milliseconds), the `NSE` session badge, the active page title, a symbol search trigger, a menu sheet button for secondary routes (`/dashboard/scanner`, `/dashboard/intelligence`, `/dashboard/news`, `/dashboard/performance`), and the user avatar, while hiding the desktop second telemetry tier and desktop `AppShell` utility strip.
- **AC-2**: `BottomNav` remains fixed at the bottom on viewports below `1024px` with safe area bottom padding (`pb-safe`), minimum `44px` by `44px` touch targets, and the five primary tabs (`Dashboard`, `Signals`, `Trades`, `Journal`, and `Settings`) with active route highlighting and unread dot indicators for active signals and open trades.
- **AC-3**: On mobile viewports (`<768px`), `/dashboard` renders the Stitch `5780553391039865460` mobile dashboard composition in order: (1) System and Simulation / Live SmartAPI Disclaimer Banner, (2) Compact Market Breadth and Macro Regime Bar with Regime tag, India VIX, Nifty 50 reference row, and Advance vs Decline ratio bar, (3) Daily Capital Guard with a two column Realized and Unrealized P&L grid plus Max Daily Loss Limit and Daily Execution Quota progress bar, (4) Active Signals header with count badge and spinning `Re-scan` micro interaction button followed by mobile signal cards, (5) Collapsible Approaching Setups and Momentum Leaders accordions, (6) Open Positions Under Surveillance stacked mobile cards, (7) Two by two Sector Regime Heat grid with the engine heuristic note, and (8) Pre Trade Discipline Gate checklist with the SEBI manual execution disclaimer.
- **AC-4**: On mobile viewports, `SignalCard` renders the Stitch mobile three column execution grid (`Live / Entry` with entry zone range, `Stop Loss` with percentage risk, `Target 1 (R:R)` with net reward to risk), a live countdown timer formatted in minutes and seconds (`MMm SSs`), a score readout (`Score: NN/100`), a `Validated Evidence` container with compact chips (RVOL, VWAP status, sector change, and `Risk Gate: PASS`), and full width `Inspect Evidence` and `I Entered` action buttons.
- **AC-5**: On viewports below `768px` (`md`), open positions and trade history across `/dashboard`, `/dashboard/trades`, and `/dashboard/journal` render as stacked `MobilePositionCard` components instead of wide HTML tables, displaying symbol, direction badge (`▲ LONG` or `▼ SHORT`), quantity, average fill price, live LTP, signed unrealized or realized P&L in `JetBrains Mono`, initial or trailing stop with milestone badge, bulk selection checkbox (on open trades in `TradeTable`), and touch friendly action buttons (`Partial Exit`, `Full Exit`, `Adjust SL`, `Audit`, `Manage`).
- **AC-6**: The mobile `Sector Regime Heat` two by two grid on `/dashboard` sources live sector metrics from `useMarketIntelligence()` (selecting the top two outperforming sectors, one neutral rotation sector, and the weakest lagging sector, with fallback to defaults) and the `Pre-Trade Discipline Gate` checklist computes pass states from `useSettings()`, `useDashboardState()`, and `useTrades()`.
- **AC-7**: On mobile viewports (`<768px`), `/dashboard/signals`, `/dashboard/trades`, `/dashboard/journal`, and `/settings` adapt cleanly to single column vertical flows with scrollable filter pills, a two column telemetry summary grid on Journal, stacked risk gate cards with full width range sliders on Settings, and no horizontal page overflow at `375px` viewport width.
- **AC-8**: On mobile viewports (`<640px`), `TradeJournalAuditDrawer`, `TradeEntryModal`, and `TradeExitModal` render as bottom sheets anchored to the bottom of the viewport (`max-h-[90dvh]`, rounded top corners, vertical scroll, and safe area bottom padding) while preserving right side drawer and centered dialog presentation on larger screens.
- **AC-9**: Whenever `marketState` is `DELAYED` or `DISCONNECTED` or `useMarketIntelligence().isStale` is true (latency exceeding `5000ms`), mobile signal cards and mobile position cards drop to `85%` opacity with dashed borders and disable `I Entered`, `Partial Exit`, `Full Exit`, and `Adjust SL` action buttons across all mobile views.

## Decision

**Chosen option**: Option 1: Responsive Tailwind Breakpoints with Shared Presentational Primitives and Mobile Card Views

We implement the Stitch `5780553391039865460` mobile experience directly inside the existing Next.js App Router pages using responsive Tailwind CSS classes (`lg:` at `1024px` for shell chrome and `md:` at `768px` for table to card transitions) paired with focused presentational components (`MobilePositionCard`, `MobileSectorHeatGrid`, `PreTradeDisciplineGate`, and a mobile navigation drawer in `Topbar`).

**Implementation skills**:
- `design-md` (`.agents/skills/design-md/`)
- `frontend-design` (`.agents/skills/frontend-design/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Data model sketch

No database schema migrations are required. The feature introduces typed client view models and component contracts in `apps/web`:

```typescript
export interface MobileShellState {
  isMenuSheetOpen: boolean;
  isSearchExpanded: boolean;
  currentRouteTitle: string;
  isStaleOrDisconnected: boolean;
  feedLatencyMs: number;
}

export interface MobileSignalCardProps {
  signal: Signal;
  isLocked?: boolean;
  onEnterClick?: (signal: Signal) => void;
}

export interface MobilePositionCardProps {
  trade: Trade;
  isSelected?: boolean;
  onSelectChange?: (tradeId: string, checked: boolean) => void;
  onAuditClick?: (trade: Trade) => void;
  onPartialExitClick?: (trade: Trade) => void;
  onFullExitClick?: (trade: Trade) => void;
  onAdjustSlClick?: (trade: Trade) => void;
  isLocked?: boolean;
}

export interface MobileSectorHeatCardItem {
  name: string;
  changePct: number;
  statusLabel: string;
  tone: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

export interface PreTradeDisciplineGateProps {
  maxDailyLoss: number;
  lossDrawn: number;
  brokerConnected: boolean;
  providerLabel: string;
  positionSizingLabel: string;
}
```

### State transitions

- **Mobile Topbar Navigation Sheet**: `CLOSED` to `OPEN` when you tap the menu icon in the mobile `Topbar` (rendering links to `/dashboard/scanner`, `/dashboard/analysis/RELIANCE`, `/dashboard/intelligence`, `/dashboard/news`, `/dashboard/performance`), and back to `CLOSED` when you select a route or tap the backdrop.
- **Mobile Topbar Search Expansion**: `COLLAPSED` to `EXPANDED` when you tap the search icon in the mobile `Topbar` (revealing a full width `SymbolSearch` combobox row below the `56px` bar), and back to `COLLAPSED` when you select a symbol or press Escape or close.
- **Mobile Re-scan Micro-interaction**: `IDLE` to `SPINNING` when you tap the `Re-scan` button on the mobile Dashboard (`animate-spin` on the `autorenew` icon for `800ms` while invoking context refresh), then back to `IDLE`.
- **Stale / Disconnected Safety Lock**: `LIVE_UNLOCKED` to `LOCKED_DEGRADED` when `marketState` transitions to `DELAYED` or `DISCONNECTED` or `feedLatencyMs > 5000` (cards apply `opacity-85 border-dashed`, action buttons disabled).

### API surface

No new backend HTTP endpoints are required. The mobile views consume the existing React context providers and custom intelligence hooks:

| Hook / Context | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `useDashboardState()` | Context | None | `marketState`, `marketStatus`, `instruments` | N/A | Degrades to `DISCONNECTED` state |
| `useMarketIntelligence()` | `GET /api/v1/intelligence/context` + SSE | `pollIntervalMs` | `data` (`MarketContextContract`), `isStale`, `isDisconnected`, `feedLatencyMs`, `refresh` | Public | Preserves last snapshot and marks `isDisconnected = true` |
| `useSignals()` | Context + SSE | None | `activeSignals`, `approachingSignals`, `closedSignals`, `expiredSignals`, `momentum` | Public | Empty state fallback |
| `useTrades()` | Context | None | `trades`, `openTrades`, `addTrade`, `addTradeLeg` | Public | Toast error on failed bulk close |
| `useSettings()` | Context | None | `dailyRiskBudget`, `brokerConnected`, `updateSettings` | Public | LocalStorage fallback |

### Value sourcing

| Action / Surface | Value produced / displayed | Source |
|---|---|---|
| Mobile Topbar status pill | Connection state (`LIVE`, `DELAYED`, `DISCONNECTED`) and latency (`12ms`) | `useDashboardState().marketState` and `useMarketIntelligence().feedLatencyMs` |
| Mobile Topbar NSE badge | Session countdown timer (`MM:SS` to `15:30 IST` close or `09:15 IST` open), Nifty direction arrow, and active route title (`Dashboard`, `Signals`, `Trades`, `Journal`, `Settings`) | Computed from IST session clock (`lib/scanner-types.ts` + `useNow()`), `useMarketIntelligence().data.niftyChangePct`, and `usePathname()` mapped to route label |
| Disclaimer Banner | Provider badge (`LIVE SMARTAPI` vs `SIMULATED DATA (PHASE 1-3)`) | `useDashboardState().marketStatus?.providerType === "ANGEL_ONE"` |
| Mobile Regime & Breadth Bar | Regime number, regime title, India VIX, Nifty 50 LTP/change, Advances vs Declines bar | `useMarketIntelligence().data` (with fallback to `MarketRegimeStrip` defaults) |
| Mobile Daily Capital Guard | Realized P&L, Unrealized P&L, Max Daily Loss (`₹6,000.00`), Daily Execution Quota (`3 of 6 Used`) | `useTrades()` (`trades`, `openTrades`) and `useSettings().dailyRiskBudget` |
| Mobile Signal Card | 3 column execution grid (Entry, Stop Loss %, Target 1 Net R:R), `MMm SSs` timer, Score, and 4 `Validated Evidence` chips | `Signal` object from `useSignals().activeSignals` + `useNow()` client clock hook; chips derived from `signal.metrics.relativeVolume` (`RVOL 2.8x`), `signal.rationale` (`VWAP Held`), matching sector `changePct` from `useMarketIntelligence()`, and `Risk Gate: PASS` |
| Mobile Open Position Card | Avg Fill, Current LTP, signed Unrealized P&L, Stop Loss / Trailing Stop, Milestone tag, and `Adjust SL` action | `Trade` object from `useTrades().openTrades` and live instrument price from `useDashboardState().instruments`; `trade.legs.some(l => l.action === "PARTIAL_EXIT")` determines `TRAILING STOP` + `T1 Hit (Booked 50%)` vs `INITIAL STOP` + `TARGET 1 (Pending)`; `Adjust SL` opens a compact Stop Loss bottom sheet that updates the trade's stop level in `TradeContext` |
| Mobile Sector Regime Heat (2x2) | 4 sector cards (symbol, change %, bias label, left border color) + heuristic note | `useMarketIntelligence().data.sectors` sorted by `changePct` (top 2, 1 middle, bottom 1) |
| Pre-Trade Discipline Gate | Max Loss Guard status, Broker Session status, Position Sizing (`1.0% to 1.5% equity`) | `useSettings().dailyRiskBudget`, `useDashboardState().marketStatus`, and `RiskCapitalGuard` state |

### Key invariants

- Every interactive button and navigation link on mobile viewports must maintain a minimum touch target height of `36px` (`44px` on `BottomNav` items) and never cause horizontal viewport overflow (`overflow-x-hidden` at `375px` width).
- All financial figures (prices, P&L, percentages, stop levels, RVOL, latency, countdown timers) must use `JetBrains Mono` (`font-metric-*` or `font-label-code`) with `tabular-nums`.
- Direction and P&L must never rely on color alone; every badge pairs color with a directional symbol (`▲ LONG`, `▼ SHORT`) or explicit sign (`+₹`, `-₹`).
- Manual execution wording (`Decision Support Only, Manual Execution in Angel One`) must remain visible on the mobile dashboard, and all entry and exit actions must lock when the feed is stale (`>5s`), delayed, or disconnected.

### Security model

- No changes to authentication or authorization. All mobile surfaces enforce the existing read only market intelligence and manual trade journal boundaries, with zero automated broker order placement.

### Critical test scenarios

- **Happy path (Mobile Dashboard & Signal Card)**: Render `/dashboard` at `375x812` viewport; verify the compact `Topbar`, `BottomNav`, disclaimer banner, regime bar, 2 column `RiskCapitalGuard`, 3 column `SignalCard` with countdown and evidence chips, `MobileSectorHeatGrid` (2x2), and `PreTradeDisciplineGate` render without horizontal overflow. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**.
- **Happy path (Mobile Position Cards across Tabs)**: Render `/dashboard`, `/dashboard/trades`, and `/dashboard/journal` at `375x812`; verify wide tables are replaced by `MobilePositionCard` lists supporting trade selection checkboxes, bulk close floating bar, and opening the `TradeJournalAuditDrawer` bottom sheet. Verifies **AC-5**, **AC-7**, **AC-8**.
- **Failure / Degraded case (Stale or Disconnected Feed Lock)**: Set `marketState` to `DELAYED` or `DISCONNECTED` (or `isStale = true`); verify mobile signal cards and position cards apply degraded styling (`opacity-85`, dashed border) and disable `I Entered`, `Partial Exit`, and `Full Exit` buttons. Verifies **AC-9**.
- **Navigation reachability**: Open the mobile `Topbar` menu sheet and search toggle on a `375px` viewport; verify secondary routes (`/dashboard/scanner`, `/dashboard/intelligence`, `/dashboard/news`, `/dashboard/performance`) and `SymbolSearch` are reachable and keyboard/touch dismissible. Verifies **AC-1**, **AC-2**.

## Build plan

1. [x] **Mobile AppShell, Compact Topbar, and BottomNav enhancement**: Update `apps/web/components/layout/Topbar.tsx`, `apps/web/components/layout/AppShell.tsx`, and `apps/web/components/layout/BottomNav.tsx` so viewports below `1024px` (`lg`) render the Stitch `5780553391039865460` `56px` glassmorphic mobile top bar (live status + latency pill, NSE badge, dynamic route title, expandable `SymbolSearch` toggle, secondary routes menu sheet, and avatar), hide the desktop second telemetry tier and desktop utility strip on mobile, and apply safe area padding and `44x44px` touch targets on `BottomNav`, satisfies **AC-1**, **AC-2**
2. [x] **Mobile Dashboard components (Regime, Capital Guard, Signal Card, Sector Heat 2x2, Discipline Gate)**: Update `MarketRegimeStrip.tsx`, `RiskCapitalGuard.tsx`, and `SignalCard.tsx` for the compact Stitch mobile layouts (2 column P&L grid in `RiskCapitalGuard`, 3 column execution grid + `MMm SSs` timer + evidence chips in `SignalCard`) and create `MobileSectorHeatGrid.tsx` and `PreTradeDisciplineGate.tsx` wired to `useMarketIntelligence()`, `useSettings()`, `useDashboardState()`, and `useTrades()`, then compose them on `apps/web/app/dashboard/page.tsx` with the mobile disclaimer banner, `Re-scan` micro interaction, and collapsible `Approaching Setups` / `Momentum Leaders` sections, satisfies **AC-3**, **AC-4**, **AC-6**, **AC-9**
3. [x] **Mobile Position Cards and Responsive Tab Views (Trades, Journal, Signals, Settings)**: Create `apps/web/components/domain/MobilePositionCard.tsx` and integrate it into `/dashboard`, `TradeTable.tsx` (`/dashboard/trades` and `/dashboard/journal`), and `/dashboard/journal/page.tsx` for `<768px` (`md:hidden`) viewports with bulk selection support; refine `/dashboard/signals/page.tsx`, `/dashboard/journal/page.tsx`, and `/settings/page.tsx` for single column mobile ergonomics, satisfies **AC-5**, **AC-7**, **AC-9**
4. [x] **Mobile Bottom Sheet adaptation for Modals and Audit Drawer & Verification Tests**: Update `DialogContent` styling in `TradeJournalAuditDrawer.tsx`, `TradeEntryModal.tsx`, and `TradeExitModal.tsx` to anchor as bottom sheets (`max-h-[90dvh]`, rounded top corners, safe area padding) on `<640px` viewports, and add unit and component tests covering mobile rendering, card layouts, menu sheet navigation, and stale feed locking, satisfies **AC-8**, **AC-9**

## Consequences

**Positive**:
- Delivers full visual and functional parity with the Stitch `5780553391039865460` mobile screen (`Mobile Dashboard - Market & Active Signals`) while keeping all five `BottomNav` tabs (`Dashboard`, `Signals`, `Trades`, `Journal`, `Settings`) cohesive and touch friendly on mobile devices.
- Eliminates horizontal table scrolling on phone viewports by switching to stacked `MobilePositionCard` components below `768px` while preserving bulk trade actions and audit inspection.
- Reuses all existing React contexts (`SignalContext`, `TradeContext`, `DashboardContext`, `SettingsContext`) and intelligence hooks (`useMarketIntelligence`) without duplicating business logic or adding backend endpoints.

**Negative / tradeoffs**:
- Dual responsive markup (`md:hidden` mobile cards alongside `hidden md:block` desktop tables) in `TradeTable` and `/dashboard` slightly increases DOM size and requires keeping action handlers synchronized across both views.
- Secondary routes (`Scanner`, `Market Intelligence`, `News & Filings`, `Performance`) require two taps on mobile (opening the `Topbar` menu sheet, then selecting the route) because the 5 slot `BottomNav` is dedicated to `Dashboard`, `Signals`, `Trades`, `Journal`, and `Settings`.

**Neutral**:
- Desktop (`>=1024px`) and tablet (`768px` to `1023px`) data tables and multi column grids remain unchanged.

## Follow-up

- [ ] If the live Stitch MCP server is connected in future sessions, run a visual diff check against any newly added mobile frames in Stitch project `5780553391039865460`.
