# Intraday Stock Tracker --- Stitch UI Implementation Plan

## 1. Purpose

This document defines the **UI-only implementation phase** for the
Intraday Stock Tracker.

The objective is to reproduce the supplied Stitch designs as a complete,
interactive, responsive frontend with realistic mock data and mock state
transitions.

### Critical separation

This phase implements:

-   every supplied Stitch screen;
-   every supplied UI state;
-   every modal/drawer shown in the designs;
-   reusable UI components;
-   realistic mock data;
-   local/mock state transitions;
-   responsive behavior;
-   loading, empty, delayed, disconnected, expired, validation-error,
    open-trade and journal states;
-   navigation between pages;
-   visual and interaction fidelity.

This phase does **not** implement:

-   Supabase;
-   authentication;
-   real APIs;
-   API routes;
-   Angel One SmartAPI;
-   WebSocket market data;
-   scanner worker;
-   real strategy calculations;
-   real risk calculations from backend data;
-   real P&L persistence;
-   broker order APIs;
-   live notifications.

The UI must be architected so those capabilities can be connected later
without rebuilding the presentation layer.

------------------------------------------------------------------------

# 2. Source-of-Truth Hierarchy

The implementation agent must inspect all of these before writing UI
code.

### Primary visual source

**Supplied Stitch ZIP**

`stitch_intraday_stock_tracker_dashboard (1).zip`

The Stitch screens are the visual reference for:

-   layout;
-   spacing;
-   hierarchy;
-   card composition;
-   navigation;
-   typography;
-   tables;
-   charts;
-   modal structure;
-   drawer structure;
-   badges;
-   status treatments;
-   responsive intent;
-   visual density.

### Product source

`PRD.md`

Use it for:

-   product scope;
-   user actions;
-   page responsibilities;
-   terminology;
-   safety boundaries;
-   functional behavior.

### Architecture source

`Architecture.md`

Use it for:

-   future data boundaries;
-   frontend/backend separation;
-   domain model concepts;
-   future API integration points.

Do not implement the future backend during this phase.

### Design-system source

`DESIGN_SYSTEM.md`

Use it for:

-   tokens;
-   typography;
-   colors;
-   accessibility;
-   component behavior;
-   responsive rules;
-   chart semantics;
-   interaction rules.

### Important rule

If the Stitch design visually contains something that conflicts with the
PRD or architecture, **do not silently implement the conflicting product
behavior**.

Instead:

1.  preserve the useful visual composition;
2.  adapt the terminology/interaction to the PRD;
3.  record the discrepancy in the final implementation report.

Example:

-   Stitch may visually show trading-terminal/order-book concepts.
-   The product must remain **manual journal / decision-support only**.
-   Never introduce real broker order placement.
-   Use `I entered`, `I exited`, `Skip`, `Watch`, etc.
-   Never imply that the UI sent an order to Angel One.

------------------------------------------------------------------------

# 3. Stitch Design Inventory

The supplied Stitch package contains the following visual assets.

## Supporting assets

### 0. Logo

`intraday_stock_tracker_logo`

Purpose:

-   application branding;
-   sidebar/topbar branding.

### 0. Avatar

`professional_headshot_avatar_of_an_indian_financial_analyst_and_equity_trader`

Purpose:

-   user profile presentation in the topbar.

These are supporting assets, not standalone application pages.

------------------------------------------------------------------------

# 4. Required Screens

The following are mandatory implementation targets.

## Screen 1 --- Main Dashboard

Stitch:

`intraday_stock_tracker_dashboard`

Route:

`/dashboard`

Primary purpose:

-   overview of the current trading session;
-   active signals;
-   open trades;
-   daily metrics;
-   simulated market state;
-   navigation into signal and trade details.

Major sections visible in the design:

1.  Application shell.
2.  Sidebar navigation.
3.  Top utility bar.
4.  Safe Execution / Manual Journal status.
5.  User profile.
6.  Market session header.
7.  Market status selector/status display.
8.  Today's Net P&L.
9.  Scanner Signals.
10. Open Positions.
11. Today's Win Rate.
12. Average R:R.
13. Active Signals.
14. Long/Short signal tabs.
15. Signal cards.
16. Open/Executed Trades.
17. Journal actions.

Required interactions:

-   click signal → signal detail;
-   `View plan` → signal detail;
-   `I entered` → Record Trade Entry modal;
-   open trade → trade detail;
-   journal/edit actions → trade journal/detail;
-   sidebar navigation;
-   market-state demo controls where applicable.

------------------------------------------------------------------------

# 5. Dashboard --- No Active Signals State

Stitch:

`dashboard_no_active_signals_empty_state`

This is not a separate product page.

It is a required dashboard state.

Route:

`/dashboard`

State:

`NO_ACTIVE_SIGNALS`

Required UI:

-   dashboard shell remains unchanged;
-   metrics remain visible;
-   active signal section changes to an intentional empty state;
-   scanner/rule explanation remains visible;
-   refresh/review actions remain available;
-   open trades section can still be populated;
-   no broken or blank card.

Mock transition:

`ACTIVE_SIGNALS → NO_ACTIVE_SIGNALS`

The agent must be able to demonstrate this state without changing
backend code.

------------------------------------------------------------------------

# 6. Dashboard --- Delayed / Disconnected Data State

Stitch:

`dashboard_delayed_disconnected_data_state`

This is another dashboard state.

State examples:

-   `DELAYED`
-   `DISCONNECTED`
-   `SIMULATED`

Required UI behavior:

### Delayed

Show:

-   delayed status;
-   last valid tick;
-   delay duration;
-   stale/frozen data indication;
-   scanner paused;
-   safety notice.

### Disconnected

Show:

-   disconnected state;
-   feed failure;
-   scanner halted;
-   last valid update;
-   reconnection UI.

### Simulated

Show:

-   simulated label;
-   mock-data timestamp;
-   clear distinction from live data.

Important:

The UI must never imply that simulated or delayed data is live.

------------------------------------------------------------------------

# 7. Screen 2 --- Signal Detail

Stitch:

`signal_detail_reliance_long`

Route:

`/dashboard/signals/[id]`

Example:

`/dashboard/signals/reliance-long`

Purpose:

-   inspect one signal;
-   understand why it exists;
-   review planned levels;
-   inspect confidence/evidence;
-   record journal action.

Required sections:

1.  Breadcrumb.
2.  Signal header.
3.  Symbol.
4.  Direction badge.
5.  Setup name.
6.  Timeframe.
7.  Current price.
8.  Price change.
9.  Signal quality.
10. Expiry timer.
11. Main chart.
12. Entry level.
13. Stop.
14. T1.
15. T2.
16. Setup invalidation.
17. Evidence/diagnostics.
18. RVOL.
19. Trend/sector context.
20. Volatility.
21. Liquidity.
22. Historical comparable setup section.
23. Trade plan.
24. Audit/lifecycle information.
25. Action controls.

Required actions:

-   `I entered`
-   `Skip`
-   `Watch`
-   navigate back;
-   open journal flow.

The action area must communicate:

> Records your journal only. No broker order is placed.

------------------------------------------------------------------------

# 8. Screen 3 --- Expired Signal Detail

Stitch:

`signal_detail_expired_state_30m_window`

Route:

`/dashboard/signals/[id]`

State:

`EXPIRED`

Purpose:

-   show what happens after the signal's 30-minute horizon ends;
-   preserve the historical signal;
-   prevent new entry recording for the expired setup;
-   show outcome context.

Required sections:

1.  Expired status banner.
2.  Expiry timestamp.
3.  Original signal information.
4.  Signal quality.
5.  Original entry zone.
6.  Original stop.
7.  T1/T2.
8.  Signal lifecycle duration.
9.  Price chart.
10. MFE/outcome information.
11. Strategy diagnostics.
12. Trade-plan matrix.
13. Historical outcome information.
14. Audit/lifecycle information.

Important:

An expired signal remains inspectable but is no longer actionable as a
new entry.

Mock transition:

`ACTIVE → EXPIRING → EXPIRED`

The expiry timer should visibly demonstrate this transition.

------------------------------------------------------------------------

# 9. Screen 4 --- Record Trade Entry Modal

Stitch:

`modal_record_trade_entry_i_entered`

This is a critical interaction flow.

Triggered by:

-   `I entered`.

It must not simply display a static modal.

Implement the complete mock flow.

## Entry flow

``` text
Signal
  ↓
I entered
  ↓
Record Trade Entry
  ↓
Enter / review price
  ↓
Enter quantity
  ↓
Review risk summary
  ↓
Confirm
  ↓
Open Journaled Trade
```

Required fields:

-   symbol;
-   direction;
-   entry price;
-   quantity;
-   timestamp;
-   linked signal;
-   stop-loss;
-   Target 1;
-   Target 2;
-   notes/tags where shown.

Required information:

-   capital commitment;
-   configured risk budget;
-   estimated risk;
-   risk-per-share;
-   target potential;
-   R:R;
-   journal-only notice.

The flow must be backed by local/mock state.

After confirmation:

-   modal closes;
-   signal state changes appropriately;
-   an open trade appears in the dashboard;
-   the trade becomes available in the journal;
-   trade detail can be opened.

No API request.

------------------------------------------------------------------------

# 10. Screen 5 --- Risk Limit Validation Error Modal

Stitch:

`modal_risk_limit_validation_error`

This is a mandatory state of the entry flow.

Trigger:

-   mock quantity exceeds the configured risk budget.

Example state:

``` text
Configured risk budget: ₹3,000
Calculated risk: ₹7,250
Status: Risk threshold exceeded
```

Required behavior:

-   display error clearly;
-   explain the reason;
-   display safe quantity;
-   offer `Adjust to Safe Quantity`;
-   allow user to reduce quantity;
-   prevent confirmation while invalid;
-   preserve the entered values until corrected.

Mock flow:

``` text
I entered
  ↓
Quantity selected
  ↓
Risk validation
  ↓
INVALID
  ↓
Risk Error State
  ↓
Adjust Quantity
  ↓
VALID
  ↓
Confirm Entry
```

Do not connect this to a backend risk engine in this phase.

Use a centralized mock validation function so the future API/calculation
layer can replace it.

------------------------------------------------------------------------

# 11. Screen 6 --- Open Trade Detail

Stitch:

`open_trade_detail_hdfcbank_long`

Route:

`/dashboard/trades/[id]`

Purpose:

-   inspect an open journaled trade;
-   compare current state to original plan;
-   record partial/full exit.

Required sections:

1.  Breadcrumb.
2.  Trade reference.
3.  Symbol.
4.  Direction.
5.  Open status.
6.  Entry timestamp.
7.  Current market price.
8.  Unrealized P&L.
9.  Original stop.
10. Locked/trailing stop.
11. Entry.
12. Target 1.
13. Target 2.
14. Remaining quantity.
15. Capital outlay.
16. Open risk.
17. Holding duration.
18. Price chart.
19. Execution anchors.
20. Manual journal management panel.
21. Stop status.
22. Partial exit control.
23. Full exit control.
24. Exit quantity.
25. Exit price.
26. Realized P&L preview.
27. Exit reason.
28. Journal-only notice.

------------------------------------------------------------------------

# 12. Open Trade --- Partial Exit Mock Flow

Implement:

``` text
Open Trade
  ↓
I exited partially
  ↓
Select quantity
  ↓
Enter/review exit price
  ↓
Select reason
  ↓
Review realized P&L
  ↓
Confirm
  ↓
Trade becomes partially exited
```

Supported mock quantities:

-   25%;
-   50%;
-   75%;
-   100%.

After partial exit:

-   remaining quantity updates;
-   realized P&L updates;
-   trade status becomes `PARTIAL`;
-   trade timeline gains a new leg;
-   dashboard reflects updated state.

------------------------------------------------------------------------

# 13. Open Trade --- Full Exit Mock Flow

Implement:

``` text
Open Trade
  ↓
I exited fully
  ↓
Exit form
  ↓
Review
  ↓
Confirm
  ↓
Trade becomes CLOSED
```

After confirmation:

-   remaining quantity = 0;
-   trade status = `CLOSED`;
-   realized P&L is visible;
-   holding duration is retained;
-   journal record is updated;
-   audit timeline receives an event.

------------------------------------------------------------------------

# 14. Screen 7 --- Trade Journal + Audit Drawer

Stitch:

`trade_journal_audit_drawer`

Route:

`/dashboard/journal`

Purpose:

-   review manual trade history;
-   review performance metrics;
-   inspect audit details;
-   compare planned vs actual execution.

Required sections:

1.  Journal page header.
2.  Date range controls.
3.  Export controls as visual UI.
4.  Journal summary metrics.
5.  Realized Net P&L.
6.  Profit factor.
7.  Trade expectancy.
8.  Discipline score.
9.  Session cumulative R.
10. Filters.
11. Search.
12. Trade table.
13. Pagination.
14. Audit action.
15. Audit drawer.

Table columns must follow the Stitch layout and PRD concepts:

-   Trade ID;
-   time;
-   symbol;
-   bias;
-   setup;
-   quantity;
-   entry;
-   exit;
-   holding time;
-   net P&L;
-   R multiple;
-   discipline;
-   audit/detail action.

------------------------------------------------------------------------

# 15. Audit Drawer

The audit drawer is part of the journal flow.

Opening:

`Audit`

should reveal a right-side drawer.

Required content:

-   trade reference;
-   symbol;
-   direction;
-   session time;
-   lifecycle;
-   original signal;
-   original plan;
-   actual entry;
-   actual exits;
-   partial exits;
-   charges;
-   notes;
-   journal events;
-   timestamps;
-   corrections if any;
-   discipline information.

The drawer should not require a backend.

Use mock audit events.

------------------------------------------------------------------------

# 16. Required UI State Machine

The frontend must model the major states explicitly.

## Signal

``` text
CANDIDATE
  ↓
ACTIVE
  ↓
EXPIRING
  ↓
EXPIRED
```

Alternative terminal states:

``` text
ACTIVE → SKIPPED
ACTIVE → ENTERED
ACTIVE → INVALIDATED
```

## Trade

``` text
NONE
  ↓
ENTRY_FORM
  ↓
ENTRY_VALIDATION_ERROR
  ↓
OPEN
  ↓
PARTIAL
  ↓
CLOSED
```

## Market Data

``` text
SIMULATED
LIVE
DELAYED
DISCONNECTED
```

The current UI phase can use mock data for every state.

------------------------------------------------------------------------

# 17. Complete Mock User Journey

The implementation is not complete until this journey works in the
browser.

## Journey A --- Active signal to open trade

``` text
Dashboard
  ↓
Active signal
  ↓
View plan
  ↓
Signal detail
  ↓
I entered
  ↓
Entry modal
  ↓
Set quantity
  ↓
Risk validation
  ↓
Confirm
  ↓
Open trade
  ↓
Dashboard reflects open trade
```

## Journey B --- Risk validation

``` text
Signal detail
  ↓
I entered
  ↓
Set oversized quantity
  ↓
Risk validation error
  ↓
Adjust to safe quantity
  ↓
Confirm
  ↓
Open trade
```

## Journey C --- Partial exit

``` text
Open trade
  ↓
I exited partially
  ↓
Select 50%
  ↓
Review
  ↓
Confirm
  ↓
PARTIAL trade
  ↓
Updated remaining quantity
```

## Journey D --- Full exit

``` text
PARTIAL trade
  ↓
I exited fully
  ↓
Confirm
  ↓
CLOSED trade
  ↓
Journal updated
```

## Journey E --- Expired signal

``` text
Active signal
  ↓
Countdown reaches zero / mock expiry
  ↓
EXPIRED
  ↓
Signal detail becomes historical/non-actionable
```

## Journey F --- No signals

``` text
Dashboard
  ↓
Toggle mock state
  ↓
No Active Signals
  ↓
Scanner empty state
```

## Journey G --- Delayed data

``` text
Dashboard
  ↓
Toggle delayed
  ↓
Delayed Data banner
  ↓
Scanner paused
  ↓
Open trades remain visible
```

## Journey H --- Disconnected data

``` text
Dashboard
  ↓
Toggle disconnected
  ↓
Disconnected state
  ↓
Scanner halted
  ↓
Last valid data shown
```

------------------------------------------------------------------------

# 18. Page / Route Architecture

Recommended frontend routes:

``` text
/
└── redirect
    ↓
/dashboard

/dashboard
/dashboard/signals/[id]
/dashboard/trades/[id]
/dashboard/journal
```

Future API routes must remain separate from the UI route structure.

Do not create API implementation as part of this phase.

------------------------------------------------------------------------

# 19. Component Architecture

Build reusable components before duplicating page-specific markup.

## Design primitives

``` text
Button
IconButton
Badge
StatusBadge
Card
MetricCard
Tabs
Tooltip
Dropdown
Input
Select
SearchInput
Filter
FilterBar
DateRangePicker
Modal
Drawer
Toast
Alert
EmptyState
Skeleton
```

## Application shell

``` text
AppShell
Sidebar
Topbar
Breadcrumbs
PageHeader
MarketStatus
DataFreshnessIndicator
UserMenu
SafetyModeBadge
```

## Signal components

``` text
SignalCard
SignalList
SignalHeader
SignalStatus
ConfidenceMeter
ConfidenceBreakdown
ExpiryTimer
SignalPlan
SignalReasoning
SignalDiagnostics
SignalLifecycle
SignalOutcome
```

## Chart components

``` text
PriceChart
VolumeChart
SignalChart
ChartMarker
ChartLevel
ChartTooltip
```

The charts may use mock/static data during this phase.

## Trade components

``` text
TradeTable
TradeRow
TradeSummary
TradeStatus
TradePlanComparison
TradeLegTimeline
TradePerformance
TradeManagementPanel
ExitForm
```

## Journal components

``` text
JournalSummary
JournalFilters
JournalTable
AuditDrawer
AuditTimeline
DisciplineSummary
```

## Entry/exit components

``` text
TradeEntryModal
TradeEntryForm
RiskSummary
RiskValidation
PositionSizingMock
TradeExitModal
PartialExitSelector
ExitReasonSelector
ConfirmationModal
```

------------------------------------------------------------------------

# 20. Mock Data Architecture

Do not hardcode values directly inside page components.

Use centralized mock repositories.

Recommended structure:

``` text
src/
  mock/
    market.ts
    signals.ts
    trades.ts
    journal.ts
    audit.ts
    charts.ts
    user.ts

  repositories/
    signalRepository.ts
    tradeRepository.ts
    journalRepository.ts

  types/
    signal.ts
    trade.ts
    journal.ts
    market.ts
    audit.ts
```

The repository should initially be an in-memory/mock implementation.

Later:

``` text
UI
 ↓
Repository interface
 ↓
API implementation
 ↓
Supabase
```

The page should not know whether the repository is mock or API-backed.

------------------------------------------------------------------------

# 21. Mock Repository Contract

Create interfaces such as:

``` ts
interface SignalRepository {
  getActiveSignals(): Promise<Signal[]>;
  getSignalById(id: string): Promise<Signal | null>;
  skipSignal(id: string): Promise<void>;
  watchSignal(id: string): Promise<void>;
}

interface TradeRepository {
  getOpenTrades(): Promise<Trade[]>;
  getTradeById(id: string): Promise<Trade | null>;
  recordEntry(input: TradeEntryInput): Promise<Trade>;
  recordExit(input: TradeExitInput): Promise<Trade>;
}

interface JournalRepository {
  getTrades(filters?: JournalFilters): Promise<Trade[]>;
  getAudit(tradeId: string): Promise<AuditEvent[]>;
}
```

These are UI-facing contracts only.

Do not connect them to real APIs yet.

------------------------------------------------------------------------

# 22. Local Mock State

Use a lightweight local state approach.

The state must support:

-   active signals;
-   expired signals;
-   skipped signals;
-   watched signals;
-   open trades;
-   partial trades;
-   closed trades;
-   market state;
-   modal state;
-   risk validation state;
-   journal entries;
-   audit events.

Do not introduce Redux/Zustand/etc. solely for this phase unless the
existing project architecture already requires it.

A local provider/store is acceptable if it improves consistency.

------------------------------------------------------------------------

# 23. Stitch Visual Fidelity Requirements

The implementation agent must inspect the actual Stitch HTML and
screenshots rather than relying on the screen names alone.

For each screen compare:

### Layout

-   sidebar width;
-   topbar height;
-   page max width;
-   grid columns;
-   card widths;
-   spacing;
-   alignment;
-   section ordering.

### Typography

-   font family;
-   font weight;
-   size;
-   line height;
-   numeric typography;
-   uppercase labels.

### Colors

Use the project Design System as the canonical implementation token set.

Do not create random replacement colors.

### Surfaces

Match:

-   card borders;
-   surface hierarchy;
-   muted panels;
-   separators;
-   modal overlay;
-   drawer elevation;
-   selected states.

### Density

The Stitch design is intentionally information dense.

Do not simplify it into large generic SaaS cards.

### Charts

Charts must look like the Stitch composition.

Do not replace a detailed chart area with:

``` text
[Chart Placeholder]
```

A lightweight custom SVG/CSS mock chart is acceptable.

------------------------------------------------------------------------

# 24. Responsive Implementation

Every required page/state must work at:

``` text
1440 × 900
1280 × 800
1024 × 768
768 × 1024
480 × 900
390 × 844
```

Check:

-   sidebar behavior;
-   topbar;
-   card stacking;
-   signal cards;
-   tables;
-   charts;
-   modal width;
-   drawer width;
-   bottom action areas;
-   form controls;
-   buttons;
-   numeric columns.

At mobile:

-   no horizontal page overflow;
-   tables become scrollable or responsive;
-   critical actions remain reachable;
-   modals become bottom sheets/full-width where appropriate;
-   no essential information disappears.

------------------------------------------------------------------------

# 25. Accessibility Requirements

Implement:

-   semantic landmarks;
-   keyboard navigation;
-   visible focus;
-   modal focus trap;
-   drawer keyboard close;
-   Escape handling;
-   button labels;
-   form labels;
-   error messages;
-   ARIA live announcements for state changes;
-   accessible status badges;
-   direction labels paired with icons/text;
-   no color-only meaning.

Examples:

Do not communicate only:

``` text
GREEN
```

Use:

``` text
↑ Long
```

Do not communicate only:

``` text
RED
```

Use:

``` text
Stop-loss risk
```

------------------------------------------------------------------------

# 26. Product Boundary Requirements

The UI must consistently reinforce:

``` text
Manual Journal Only
No Broker Connected
Decision Support
Simulated Data
```

Where applicable.

Do not introduce:

-   Place Order;
-   Buy Now;
-   Sell Now;
-   Cancel Order;
-   Modify Order;
-   Broker Position;
-   Broker Funds;
-   Broker Holdings;
-   automatic execution.

Use:

-   I entered;
-   I exited;
-   Skip;
-   Watch;
-   View plan;
-   Record journal.

------------------------------------------------------------------------

# 27. Important Stitch / Product Reconciliation

The Stitch artwork contains some trading-terminal language and visuals
that are broader than the first-release product boundary.

Examples include:

-   order-book/depth-like visual areas;
-   buy/order-entry terminology;
-   NIFTY/BANKNIFTY/index references;
-   broker-terminal-style execution concepts.

The PRD explicitly limits the first release to:

-   NSE cash equities;
-   manual execution outside the application;
-   no broker order management;
-   no funds/holdings/positions APIs;
-   no options or indices as tradable instruments.

Therefore:

### Preserve

-   visual density;
-   chart composition;
-   market-context presentation;
-   data tables;
-   risk presentation;
-   signal levels;
-   diagnostic cards;
-   journal workflow.

### Adapt

-   `BUY` → `I entered`;
-   `SELL` → `I exited` where relevant;
-   order execution → journal recording;
-   broker state → simulated/manual journal state;
-   index trading actions → contextual market information only;
-   order-book claims → only where supported by the product/strategy
    specification.

Record any visual adaptation in the final report.

------------------------------------------------------------------------

# 28. UI-Only Definition of Done

The UI phase is complete only when:

-   [x] Every Stitch page has been analyzed.
-   [x] Every Stitch screen has a corresponding UI implementation.
-   [x] Dashboard is implemented.
-   [x] Dashboard no-active-signals state is implemented.
-   [x] Dashboard delayed/disconnected state is implemented.
-   [x] Signal detail is implemented.
-   [x] Expired signal detail is implemented.
-   [x] Record Entry modal is implemented.
-   [x] Risk validation error modal is implemented.
-   [x] Open trade detail is implemented.
-   [x] Partial exit flow is implemented.
-   [x] Full exit flow is implemented.
-   [x] Journal page is implemented.
-   [x] Audit drawer is implemented.
-   [x] Navigation works.
-   [x] Mock state transitions work.
-   [x] Mock data is centralized.
-   [x] Components are reusable.
-   [x] Charts are visually credible.
-   [x] Responsive layouts work.
-   [x] Accessibility is checked.
-   [x] No API implementation was introduced.
-   [x] No Supabase implementation was introduced.
-   [x] No Angel One integration was introduced.
-   [x] No broker order behavior exists.
-   [x] UI is ready for API wiring as a separate phase.

------------------------------------------------------------------------

# 29. Implementation Sequence

Do not build screens randomly.

Use this order.

## Phase UI-01 --- Stitch Analysis

Inspect:

-   every screenshot;
-   every Stitch HTML;
-   `DESIGN.md`;
-   PRD;
-   Architecture;
-   Design System.

Produce a screen inventory before coding.

------------------------------------------------------------------------

## Phase UI-02 --- Existing Code Audit

Inspect:

-   existing routes;
-   current components;
-   current styling;
-   current theme;
-   current dependencies;
-   current layout;
-   current state management.

Reuse existing components where possible.

Do not rebuild already-good infrastructure.

------------------------------------------------------------------------

## Phase UI-03 --- Foundation

Implement:

-   design tokens;
-   fonts;
-   app shell;
-   sidebar;
-   topbar;
-   responsive container;
-   buttons;
-   cards;
-   badges;
-   inputs;
-   modal;
-   drawer;
-   tabs;
-   tables;
-   status indicators.

------------------------------------------------------------------------

## Phase UI-04 --- Mock Data Layer

Implement:

-   signal mocks;
-   trade mocks;
-   journal mocks;
-   audit mocks;
-   chart mocks;
-   market states.

Then create repository interfaces.

------------------------------------------------------------------------

## Phase UI-05 --- Dashboard

Implement:

1.  default dashboard;
2.  active signals;
3.  open trades;
4.  metrics;
5.  no-active-signals state;
6.  delayed state;
7.  disconnected state.

------------------------------------------------------------------------

## Phase UI-06 --- Signal Detail

Implement:

1.  active signal;
2.  chart;
3.  plan;
4.  evidence;
5.  diagnostics;
6.  historical sample;
7.  action panel;
8.  expired state.

------------------------------------------------------------------------

## Phase UI-07 --- Entry Flow

Implement:

1.  entry modal;
2.  fields;
3.  risk preview;
4.  validation;
5.  risk error state;
6.  confirmation;
7.  open trade creation.

------------------------------------------------------------------------

## Phase UI-08 --- Trade Management

Implement:

1.  open trade detail;
2.  partial exit;
3.  full exit;
4.  realized/unrealized P&L mock state;
5.  trade timeline.

------------------------------------------------------------------------

## Phase UI-09 --- Journal

Implement:

1.  journal summary;
2.  filters;
3.  table;
4.  audit action;
5.  audit drawer;
6.  planned-vs-actual view.

------------------------------------------------------------------------

## Phase UI-10 --- Mock Flow Integration

Verify the complete journey:

``` text
Dashboard
 → Signal
 → Signal Detail
 → I entered
 → Entry Modal
 → Risk Validation
 → Open Trade
 → Partial Exit
 → Full Exit
 → Journal
 → Audit
```

------------------------------------------------------------------------

## Phase UI-11 --- Visual QA

Compare implementation against every Stitch screenshot.

Do not only test whether the route renders.

Check:

-   spacing;
-   dimensions;
-   hierarchy;
-   colors;
-   typography;
-   component density;
-   chart size;
-   card structure;
-   action placement;
-   modal proportions;
-   drawer width.

------------------------------------------------------------------------

## Phase UI-12 --- Responsive QA

Run every page/state through:

``` text
1440x900
1280x800
1024x768
768x1024
480x900
390x844
```

Fix layout issues before declaring completion.

------------------------------------------------------------------------

# 30. API Phase Must Be Separate

After UI completion, create a separate implementation phase:

``` text
UI Phase
  ↓
Mock Repository
  ↓
UI QA / Approval
  ↓
API Contract Design
  ↓
API Implementation
  ↓
Repository Adapter
  ↓
Supabase Integration
  ↓
Real Data
```

Do not mix these phases.

The UI should not need to be redesigned when the API is connected.

------------------------------------------------------------------------

# 31. Final Implementation Report

At the end, report:

## Screens implemented

List every Stitch screen.

## States implemented

List:

-   active;
-   expiring;
-   expired;
-   no signals;
-   delayed;
-   disconnected;
-   simulated;
-   open trade;
-   partial trade;
-   closed trade;
-   risk validation error.

## Mock flows verified

List every end-to-end flow.

## Components created

List reusable components.

## Routes

List every route.

## Responsive QA

List viewport results.

## Accessibility QA

List results.

## Stitch discrepancies

Explicitly list any design that was adapted because of the PRD/product
boundary.

## API boundary

Explicitly confirm:

> No production API, Supabase, Angel One, broker order, or live
> market-data implementation was added during this UI phase.

------------------------------------------------------------------------

# 32. Agent Execution Prompt

Use the following prompt directly with the coding agent.

------------------------------------------------------------------------

## PROMPT --- Analyze All Stitch Designs and Implement Complete UI

You are implementing the **UI phase only** of the Intraday Stock
Tracker.

The goal is NOT to implement one dashboard page.

The goal is to implement **every supplied Stitch screen, every supplied
state, every modal/drawer, and every mock user flow** as a complete
frontend.

### Before coding

Read:

1.  `PRD.md`
2.  `Architecture.md`
3.  `DESIGN_SYSTEM.md`
4.  `STRATEGY_SPEC.md` if present
5.  `STRATEGY_DECISIONS.md` if present
6.  `STRATEGY_CONFIG.md` if present
7.  the entire supplied Stitch ZIP:
    `stitch_intraday_stock_tracker_dashboard (1).zip`
8.  the existing application source code.

Inspect every Stitch:

-   screenshot;
-   HTML;
-   supporting design documentation.

Do not infer the design from filenames alone.

------------------------------------------------------------------------

## STEP 1 --- Create a Stitch Screen Inventory

Before implementation, create an internal inventory with:

  Stitch   Type   Route   State   Components   Interactions
  -------- ------ ------- ------- ------------ --------------

The inventory must include at minimum:

-   dashboard;
-   dashboard no-active-signals;
-   dashboard delayed/disconnected;
-   signal detail;
-   signal expired;
-   record trade entry modal;
-   risk validation error modal;
-   open trade detail;
-   trade journal;
-   audit drawer;
-   logo;
-   avatar.

Do not start implementation until all supplied screens have been
accounted for.

------------------------------------------------------------------------

## STEP 2 --- Analyze the Stitch HTML

For each screen inspect the actual HTML to identify:

-   layout hierarchy;
-   text hierarchy;
-   component structure;
-   spacing;
-   colors;
-   typography;
-   badges;
-   tabs;
-   buttons;
-   tables;
-   charts;
-   modal/drawer structure;
-   state indicators;
-   responsive structure.

Use the Stitch HTML as implementation evidence.

Do not replace a detailed screen with a generic approximation.

------------------------------------------------------------------------

## STEP 3 --- Build the UI Plan

Before coding, produce a short implementation plan containing:

1.  route map;
2.  page map;
3.  state map;
4.  component hierarchy;
5.  mock-data model;
6.  mock repository interfaces;
7.  user-flow map;
8.  implementation order;
9.  responsive strategy;
10. visual QA checklist.

Then execute that plan.

Do not stop after producing the plan.

------------------------------------------------------------------------

## STEP 4 --- Implement the Design System

Use the existing `DESIGN_SYSTEM.md` tokens.

Implement/reuse:

-   typography;
-   colors;
-   spacing;
-   borders;
-   radius;
-   focus states;
-   numeric typography;
-   surfaces;
-   status colors.

Use:

-   Inter for interface text;
-   JetBrains Mono for prices, quantities, timestamps, percentages and
    P&L.

Do not invent a second design system.

------------------------------------------------------------------------

## STEP 5 --- Implement the Shared Shell

Build:

-   Sidebar;
-   Topbar;
-   AppShell;
-   PageHeader;
-   breadcrumbs;
-   market status;
-   freshness indicator;
-   safety-mode indicator;
-   user profile.

The shell must be shared by all pages.

------------------------------------------------------------------------

## STEP 6 --- Implement Every Page

Implement all routes:

``` text
/dashboard
/dashboard/signals/[id]
/dashboard/trades/[id]
/dashboard/journal
```

The root route may redirect to `/dashboard`.

------------------------------------------------------------------------

## STEP 7 --- Implement Every Stitch State

Do not treat states as screenshots only.

Implement actual local/mock states:

``` text
Dashboard:
- normal
- simulated
- delayed
- disconnected
- no active signals

Signal:
- active
- expiring
- expired
- skipped
- watched

Trade:
- entry
- risk invalid
- open
- partial
- closed

Journal:
- populated
- audit drawer
- filtered
- empty
```

------------------------------------------------------------------------

## STEP 8 --- Implement Complete Mock Flows

The user must be able to actually demonstrate:

### Flow 1

``` text
Dashboard
→ View plan
→ Signal detail
→ I entered
→ Entry modal
→ Confirm
→ Open trade
```

### Flow 2

``` text
I entered
→ Oversized quantity
→ Risk validation error
→ Adjust quantity
→ Confirm
```

### Flow 3

``` text
Open trade
→ Partial exit
→ Confirm
→ Partial state
```

### Flow 4

``` text
Partial trade
→ Full exit
→ Confirm
→ Closed state
```

### Flow 5

``` text
Journal
→ Audit
→ Audit drawer
```

### Flow 6

``` text
Active signal
→ Expired
→ Historical/non-actionable state
```

### Flow 7

``` text
Dashboard
→ Delayed
→ Scanner paused
```

### Flow 8

``` text
Dashboard
→ Disconnected
→ Scanner halted
```

------------------------------------------------------------------------

## STEP 9 --- Use Mock Repositories

Do not put mock data directly inside page components.

Create repository interfaces and mock implementations.

The UI should call:

``` text
SignalRepository
TradeRepository
JournalRepository
```

The implementation may initially use in-memory/local state.

Later these repositories can be replaced by API-backed implementations.

------------------------------------------------------------------------

## STEP 10 --- No API Implementation

Strictly do NOT implement:

-   API routes;
-   Supabase;
-   authentication;
-   Angel One;
-   WebSocket;
-   scanner worker;
-   real strategy engine;
-   real market data;
-   broker order APIs.

The UI must remain fully functional using mock data.

------------------------------------------------------------------------

## STEP 11 --- Respect Product Safety Boundary

Never introduce actual broker execution.

Use:

-   `I entered`
-   `I exited`
-   `Skip`
-   `Watch`
-   `View plan`

Always make the journal-only boundary clear.

Do not implement:

-   Place Order;
-   Buy;
-   Sell;
-   Modify Order;
-   Cancel Order;
-   Broker Position;
-   Broker Holdings;
-   Broker Funds.

If Stitch contains such terminology, preserve the visual composition but
adapt the interaction to the PRD.

------------------------------------------------------------------------

## STEP 12 --- Visual QA

After implementation, compare each page directly with its Stitch
screenshot.

Perform a screen-by-screen audit.

For every screen check:

-   overall composition;
-   sidebar;
-   topbar;
-   page width;
-   card dimensions;
-   spacing;
-   typography;
-   colors;
-   borders;
-   badges;
-   buttons;
-   charts;
-   tables;
-   modal;
-   drawer;
-   action placement;
-   information density.

Fix visual differences before completion.

------------------------------------------------------------------------

## STEP 13 --- Responsive QA

Verify:

``` text
1440x900
1280x800
1024x768
768x1024
480x900
390x844
```

There must be:

-   no horizontal page overflow;
-   no clipped dialogs;
-   no inaccessible controls;
-   usable tables;
-   usable charts;
-   usable entry/exit forms;
-   usable mobile actions.

------------------------------------------------------------------------

## STEP 14 --- Final Completion Gate

Do not report completion unless:

-   every Stitch screen is implemented;
-   every Stitch state is represented;
-   every modal/drawer is implemented;
-   mock flows work;
-   dashboard updates after journal actions;
-   journal updates after exits;
-   audit drawer reflects mock events;
-   expiry state works;
-   delayed/disconnected states work;
-   responsive QA passes;
-   accessibility basics pass;
-   visual QA is completed;
-   no API implementation has been added.

------------------------------------------------------------------------

## Final response format

Return:

``` text
UI IMPLEMENTATION COMPLETE

1. Stitch screens implemented
2. Routes implemented
3. States implemented
4. Mock flows implemented
5. Reusable components created
6. Mock repository/state architecture
7. Responsive QA results
8. Accessibility QA results
9. Visual fidelity QA results
10. Stitch/PRD adaptations
11. Explicit API boundary confirmation
12. Known limitations
```

The final result must be a **complete UI prototype**, not merely a
dashboard mockup.
