# 0019. Stitch Mobile View and Responsive Tab Views Rationale

## Context

The Intraday Stock Tracker web application (`apps/web`) was recently upgraded to the Tactical Precision Terminal design system from Stitch project `5780553391039865460` (specs `0017` and `0018`). While the desktop views (`2560px` multi pane layouts) and a basic `BottomNav` component exist, the mobile experience on viewports below `768px` and `1024px` has several structural gaps compared to the Stitch `5780553391039865460` mobile specification (`Mobile Dashboard - Market & Active Signals`, screen ID `1182612372d648ac8842c5a2d3fd8617`):

1. **Header and Utility Strip Crowding**: `Topbar.tsx` renders a fixed two tier desktop bar (`96px` total height) and `AppShell.tsx` adds a multi item system status strip underneath it. On a `375px` mobile screen, these three stacked bars consume over a quarter of the viewport height and wrap awkwardly, whereas the Stitch mobile design uses a single `56px` glassmorphic top bar (`bg-surface/85 backdrop-blur-xl`) with a compact `LIVE 12ms` pill, `NSE` session badge, page title, and avatar.
2. **Missing Stitch Mobile Dashboard Sections and Card Densities**: The Stitch mobile screen defines specific compact layouts for mobile surveillance: a top System and Simulation Disclaimer card, a compact Regime and Breadth bar with an inline Nifty 50 row, a two column Realized vs Unrealized P&L grid inside `Daily Capital Guard`, a three column execution grid (`Live / Entry`, `Stop Loss`, `Target 1 (R:R)`) with `Validated Evidence` chips inside each `SignalCard`, stacked `Open Positions` cards with `Partial Exit` / `Full Exit` / `Adjust SL` buttons, a two by two `Sector Regime Heat` grid with an engine heuristic callout, and a `Pre-Trade Discipline Gate` checklist at the bottom of the scroll.
3. **Wide HTML Tables on Mobile Tabs**: `/dashboard`, `/dashboard/trades`, and `/dashboard/journal` rely on wide 7 to 10 column HTML tables (`TradeTable.tsx` and the dashboard surveillance table). On phone screens (`<768px`), traders must scroll horizontally across 10 columns to see LTP, P&L, stop loss, and action buttons, making rapid intraday surveillance and bulk trade management error prone.
4. **Navigation Reachability and Modal Ergonomics**: `BottomNav` exposes five primary tabs (`Dashboard`, `Signals`, `Trades`, `Journal`, `Settings`), leaving secondary routes (`Scanner`, `Market Intelligence`, `News & Filings`, `Performance`) unreachable when the desktop `Sidebar` is hidden below `1024px`. Additionally, `TradeJournalAuditDrawer` slides in as a full height right drawer and modals center in the viewport rather than anchoring as thumb reachable bottom sheets on mobile.

## Options considered

### Option 1: Responsive Tailwind Breakpoints with Shared Presentational Primitives and Mobile Card Views (Recommended)

Enhance the existing Next.js App Router pages and layout components in place using Tailwind CSS responsive breakpoints (`lg:` at `1024px` for `Topbar` / `Sidebar` / `BottomNav` shell transitions and `md:` at `768px` for switching wide tables to stacked `MobilePositionCard` components). Extract dedicated presentational components for the Stitch mobile sections (`MobilePositionCard`, `MobileSectorHeatGrid`, `PreTradeDisciplineGate`) and adapt `DialogContent` in modals and the audit drawer to render as bottom sheets below `640px` (`sm:`).

**Pros**:
- Zero route duplication and zero client hydration flicker from JavaScript `window.matchMedia` layout swapping; CSS media queries handle viewport adaptation immediately on first paint.
- Preserves a single source of truth for state (`SignalContext`, `TradeContext`, `DashboardContext`, `SettingsContext`, `useMarketIntelligence`) across all five `BottomNav` tabs.
- Matches the Stitch `5780553391039865460` mobile HTML structure and Tailwind token classes directly while keeping desktop layouts untouched.

**Cons**:
- Renders both mobile card markup (`md:hidden`) and desktop table markup (`hidden md:block`) in the DOM for `TradeTable` and `/dashboard` open positions.

### Option 2: Separate Client Side `MobileDashboardView` and `DesktopDashboardView` Trees via Viewport Hook

Detect the viewport width in JavaScript (`useMediaQuery("(max-width: 767px)")`) and conditionally mount a separate `MobileDashboardView` component tree on mobile and `DesktopDashboardView` on desktop across each of the five tab routes.

**Pros**:
- Only mounts the active viewport's DOM nodes once client hydration completes.
- Completely isolates mobile JSX from desktop JSX.

**Cons**:
- Causes layout shift or blank flashes during SSR/hydration in Next.js App Router because the server does not know the client viewport width at render time.
- Duplicates page level state wiring, filter state, and modal triggers across five separate route pairs (`Dashboard`, `Signals`, `Trades`, `Journal`, `Settings`).

### Option 3: Dedicated `/mobile/*` Route Tree with Middleware User Agent Redirect

Create a parallel `/mobile/dashboard`, `/mobile/signals`, `/mobile/trades`, `/mobile/journal`, and `/mobile/settings` route hierarchy and redirect mobile user agents in Next.js middleware.

**Pros**:
- Smallest per page bundle size for mobile devices.

**Cons**:
- Splits URLs between desktop and mobile, breaking shared links, browser responsive resizing, and existing hardcoded route links (`/dashboard/analysis/[symbol]`, `/dashboard/trades/[id]`).
- High maintenance overhead across five routes that share identical data contracts and business rules.

## Rationale

Option 1 is the clear choice for this codebase. The application already uses Tailwind v4 design tokens extracted from Stitch project `5780553391039865460` in `apps/web/app/globals.css` and already hides `Sidebar` / shows `BottomNav` at the `lg` (`1024px`) breakpoint. Extending this responsive pattern to `Topbar`, `MarketRegimeStrip`, `RiskCapitalGuard`, `SignalCard`, and `TradeTable` avoids SSR hydration mismatches, keeps all URLs stable, and lets the new `MobilePositionCard`, `MobileSectorHeatGrid`, and `PreTradeDisciplineGate` components plug directly into the live `useMarketIntelligence()`, `useSignals()`, and `useTrades()` hooks established in spec `0018`.

## Migration plan

**Strategy**: Fix in place with additive responsive components (no database or API migration needed).

**Phases**:
1. Update `Topbar`, `AppShell`, and `BottomNav` for `<1024px` mobile chrome, adding the mobile navigation sheet for secondary routes and expandable `SymbolSearch`.
2. Update `MarketRegimeStrip`, `RiskCapitalGuard`, and `SignalCard` with responsive mobile layouts, add `MobileSectorHeatGrid` and `PreTradeDisciplineGate`, and compose them on `/dashboard`.
3. Add `MobilePositionCard` and integrate `<768px` card views into `/dashboard`, `/dashboard/trades`, and `/dashboard/journal`, then refine mobile layouts on `/dashboard/signals` and `/settings`.
4. Adapt `TradeJournalAuditDrawer`, `TradeEntryModal`, and `TradeExitModal` into mobile bottom sheets and verify with component tests.

**Rollback**: Revert the frontend commit; no backend services, database tables, or environment variables are modified.

**Risks**: Bulk selection state in `TradeTable` must stay synchronized whether the user selects checkboxes in the mobile card view or the desktop table view; sharing the same `selectedTradeIds` state array inside `TradeTable` eliminates divergence.
