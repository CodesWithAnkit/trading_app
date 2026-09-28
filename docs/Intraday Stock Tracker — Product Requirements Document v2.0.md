# Intraday Stock Tracker
## Product Requirements Document

**Version:** 2.0  
**Status:** Draft — Product Foundation  
**Product Type:** Personal responsive web dashboard  
**Market:** NSE cash-equity stocks only  
**Primary Broker:** Angel One  
**Execution Model:** Manual execution only  
**Primary User:** One individual trader

---

# 1. Product Overview

## 1.1 Product Summary

Intraday Stock Tracker is a personal decision-support dashboard for observing short-lived intraday stock setups, evaluating time-bound trade plans, recording manually executed trades, and learning from their outcomes.

The system scans eligible NSE cash-equity stocks during market hours and surfaces potential long and short setups based on defined market conditions.

Each signal provides a structured trade plan containing:

- Current price
- Direction
- Setup
- Entry zone
- Stop/invalidation level
- Target 1
- Additional targets
- Trailing-exit guidance
- Confidence
- Supporting metrics
- Creation time
- Expiry time

The user independently decides whether to trade and executes any trade separately through Angel One.

The application itself does not place, modify, cancel, or automate broker orders.

---

# 2. Product Goal

The product should help one trader consistently perform four activities:

1. Identify liquid NSE stocks showing defined intraday momentum setups.
2. Inspect a potential setup through a clear, time-bound trade plan.
3. Record actual entries, exits, and partial exits quickly.
4. Compare planned signals with actual outcomes over time.

The product is intended to improve **observation, consistency, journaling, and analysis**, not to guarantee profitable trading outcomes.

---

# 3. Product Principles

The product follows these principles:

### 3.1 Decision Support, Not Automated Trading

The system surfaces observations and estimates.

The user remains responsible for every trading decision.

### 3.2 Time-Bound Signals

A signal represents a specific market condition at a specific point in time. It must not remain actionable indefinitely.

### 3.3 Risk Must Be Visible

Every target representation must show the associated stop/invalidation level.

### 3.4 Signal and Trade Are Different

The system must distinguish:

- What the scanner predicted
- What the user actually traded
- What ultimately happened to the market

### 3.5 Honest Market State

The UI must clearly distinguish:

- Live
- Delayed
- Stale
- Disconnected
- Simulated

### 3.6 Non-Sensational Interface

The interface should communicate information clearly without creating artificial urgency or resembling a casino-style trading terminal.

### 3.7 Accessible by Default

Direction and outcome must never be communicated through color alone.

---

# 4. Scope

## 4.1 In Scope

The first release includes:

- Responsive web dashboard
- Authentication
- NSE cash-equity universe
- Market-data connection status
- Active long signals
- Active short signals
- Signal countdown and expiry
- Signal detail
- Entry zone
- Stop/invalidation
- Target 1
- Additional targets
- Trailing-exit guidance
- Confidence score
- Supporting signal metrics
- Historical signal information
- Similar historical setups
- Manual trade journal
- Manual entry recording
- Manual full exits
- Partial exits
- Gross P&L
- Estimated charges
- Net P&L
- Holding duration
- Notes
- Signal-vs-trade comparison
- Audit history
- Browser notifications
- Search
- Filtering
- Feed-health visibility
- Simulated/historical scanner mode
- Live market-data scanner
- Paper-tracking validation

---

# 5. Explicitly Out of Scope

The application must not implement:

- Broker order placement
- Broker order modification
- Broker order cancellation
- Automated trade execution
- Automatic trade management
- Funds retrieval
- Holdings retrieval
- Portfolio retrieval
- Broker position retrieval
- Broker order-status management
- Options
- Indices
- Nifty instruments in the first release
- Broker credentials in client-side code
- Broker credentials in source control
- Broker credentials in notifications

The system must not present signals as guaranteed or certain investment outcomes.

---

# 6. User

## 6.1 Primary User

One individual trader who:

- observes intraday opportunities through the dashboard,
- executes trades manually through Angel One,
- records those trades in the application,
- reviews signal and trading performance.

There are no multi-user/team requirements in the first release.

---

# 7. Core User Journey

The primary product loop is:

```text
Market Data
    ↓
Scanner
    ↓
Eligible Stock
    ↓
Strategy Evaluation
    ↓
Potential Setup
    ↓
Signal
    ↓
User Reviews Plan
    ↓
┌───────────────┬───────────────┐
│               │               │
Entered        Skipped        Watched
│
↓
Manual Execution in Angel One
│
↓
Record Entry
│
↓
Partial / Full Exit
│
↓
Trade Outcome
│
↓
Compare Plan vs Actual
│
↓
Historical Analysis
```

---

# 8. Dashboard Requirements

## 8.1 Market Status

The dashboard must display the current market-data state.

Possible states:

- Live
- Delayed
- Stale
- Disconnected
- Simulated

The interface must show the latest update time.

When data is not current, the UI must not present it as live.

---

## 8.2 Dashboard Summary

The dashboard should display four primary summary metrics:

- Open P&L
- Today's net P&L
- Active signals
- Win rate

Financial values should remain visually neutral at the card level, with directional coloring applied to the actual value and accessible label.

---

# 9. Active Signals

## 9.1 Signal List

The dashboard must display active signals.

Signals must support:

- Long
- Short

The dashboard should provide separate Long and Short views/tabs.

Signals should be ranked by setup quality.

---

## 9.2 Signal Card

Each active signal should communicate:

- Direction
- Symbol
- Current price
- Signal status
- Time remaining
- Confidence
- Entry zone
- Stop/invalidation
- Target 1
- Target 2 or additional targets
- Setup rationale
- Primary action

Example:

```text
↑ Long   RELIANCE                     Active · 18m

₹1,452.80        +0.62%              High confidence

Entry     ₹1,450–₹1,454
Stop      ₹1,438
T1        ₹1,468
T2        ₹1,482

Strong relative volume
Breakout above 5-minute range

[View Plan] [I entered]
```

---

# 10. Signal Lifecycle

Every signal is time-bound.

A signal must:

1. Have a creation timestamp.
2. Have an expiry timestamp.
3. Display remaining time while active.
4. Become non-actionable when expired.
5. Preserve its original plan for historical analysis.

A signal must expire no later than 30 minutes after creation.

The system must retain signal state transitions for audit and analysis.

---

# 11. Signal Detail

The signal-detail view must contain:

## Header

- Symbol
- Direction
- Setup
- Current price
- Status
- Expiry

## Main Content

- Price chart
- Trade-plan panel

## Supporting Analysis

- Reasoning metrics
- Similar historical setups
- Signal history
- Audit timeline

## Actions

- I entered
- Skip
- Watch

Actions must clearly state that they do not place a broker order.

---

# 12. Signal Plan

Each signal must contain:

- Symbol
- Exchange
- Current/live price
- Direction
- Setup name
- Rationale
- Entry zone
- Stop/invalidation
- Target 1
- Target 2
- Additional targets where applicable
- Trailing-exit guidance
- Creation timestamp
- Expiry timestamp
- Confidence
- Supporting metrics
- Strategy/rule version

Target 1 defaults to a 1% movement from entry.

For a long:

```text
Target 1 = Entry × 1.01
```

For a short:

```text
Target 1 = Entry × 0.99
```

Further target methodology is based on momentum and volatility and must be formally defined before production scanner implementation.

---

# 13. Signal Generation

## 13.1 Market Universe

The scanner must evaluate eligible NSE cash-equity stocks.

The scanner should exclude instruments that are:

- Illiquid
- Suspended
- Cautionary
- Otherwise unsuitable for the defined scanner universe

Exact eligibility thresholds remain an open product decision.

---

# 14. Initial Strategy Scope

The first release supports:

### Bullish

- Breakout
- Momentum

### Bearish

- Breakdown
- Momentum

The scanner evaluates:

- Price action
- Relative volume
- Trend
- Volatility
- Liquidity
- Risk/reward

Exact strategy rules and thresholds are not yet defined and must be finalized before live strategy deployment.

---

# 15. Confidence Score

Every signal must expose a transparent confidence score.

The score must be traceable to its underlying components.

The system must store:

- Component metrics
- Component values
- Rule version
- Overall confidence

The exact scoring formula, weighting, normalization, and thresholds are still product decisions and must be finalized before production use.

The UI must not imply that a higher confidence score guarantees a profitable result.

---

# 16. Outcome-Confidence Layer

For comparable historical setups, the system may display:

- Estimated likelihood of Target 1 being reached first
- Estimated likelihood of Target 2 being reached first
- Estimated likelihood of stop being reached first
- Expected movement range over the next 1–30 minutes
- Number of comparable historical setups
- Historical results of comparable setups
- Setup-quality classification

These are estimates based on historical/rule-based evidence.

They must never be represented as guaranteed outcomes.

The methodology for defining comparable setups and calculating these estimates must be finalized before this feature is treated as authoritative.

---

# 17. Trade Journal

## 17.1 Entry

The user can select:

**I entered**

The system must record:

- Entry timestamp
- Price
- Quantity
- Direction
- Linked signal, if applicable

The application records the user's journal action. It does not execute the broker transaction.

---

## 17.2 Exit

The user can select:

**I exited**

The system must record:

- Exit timestamp
- Exit price
- Quantity
- Exit reason
- Target reached, where applicable

---

## 17.3 Partial Exits

A trade may contain multiple exit legs.

Example:

```text
Trade
├── Entry
├── Partial Exit 1
├── Partial Exit 2
└── Final Exit
```

The system must maintain the full execution timeline.

---

# 18. P&L

The journal must calculate:

- Gross P&L
- Estimated charges
- Net P&L
- Holding duration

P&L calculations must be performed server-side or through trusted application logic.

Client-calculated P&L must not be trusted.

The charge-estimation methodology remains an open decision.

---

# 19. Signal vs Actual Trade Analysis

The system must preserve the difference between:

### Signal outcome

What happened to the market after the signal was generated.

### Trade outcome

What happened to the user's actual manually executed trade.

For example:

```text
Signal Plan

Entry: ₹1,450–₹1,454
Stop: ₹1,438
T1: ₹1,468

Market:
T1 reached
```

does not necessarily mean:

```text
User Trade:
Entered ₹1,453
Exited ₹1,460
```

was equally successful.

Historical analysis must preserve both datasets independently.

---

# 20. Historical Signals

Users must be able to inspect historical signals.

Filtering should support:

- Symbol
- Direction
- Setup
- Confidence
- Status
- Date/time

Historical signal records must retain their original:

- Plan
- Metrics
- Strategy version
- Creation time
- Expiry time
- Outcome

---

# 21. Trade History

The trade journal must support:

- Date
- Symbol
- Direction
- Quantity
- Entry
- Exit
- Net P&L
- Status

Trade detail must expose:

- Planned levels
- Actual fills
- Partial-exit timeline
- Charges
- Notes
- Corrections
- Linked signal
- Audit history

---

# 22. Notifications

The user can enable or disable browser/desktop notifications.

Notifications must:

- require user permission,
- never contain broker credentials,
- communicate signal information without presenting it as certainty,
- respect signal expiry.

---

# 23. Search and Filtering

The dashboard must support filtering signals and historical records by:

- Symbol
- Direction
- Setup
- Confidence
- Status
- Date range where relevant

---

# 24. Audit Trail

The system must record important state changes.

Audit events should include:

- Signal creation
- Signal state transitions
- Signal expiry
- Manual entry
- Manual exit
- Partial exit
- Journal corrections
- Relevant settings changes

Each audit event should preserve:

- Timestamp
- Actor identity
- Event type
- Relevant record
- State/change information

---

# 25. Data Model

The initial domain model consists of:

## Instrument

Represents an eligible NSE cash-equity instrument.

Contains market-universe and liquidity metadata.

## Signal

Represents a time-bound detected setup.

Contains immutable planned levels and lifecycle state.

## Signal Metric

Stores:

- Inputs
- Score components
- Strategy/rule version
- Supporting metrics

## Trade

Represents a manually recorded position.

May optionally reference a signal.

## Trade Leg

Represents:

- Entry
- Partial exit
- Full exit

## User Setting

Stores:

- Notification preferences
- Charge estimates
- Risk preferences
- Display preferences

## Audit Event

Stores timestamped application and signal/journal actions.

## Feed Health

Stores market-data freshness and scanner health information.

---

# 26. Data Ownership and Integrity

Signal plans must be immutable after creation except for explicitly recorded lifecycle/state transitions.

Historical analysis must use the original signal snapshot.

Trade records must preserve actual user-entered execution values.

The system must never silently rewrite historical trade or signal data.

Corrections should create an auditable correction event.

---

# 27. System Architecture Requirements

The product consists of:

```text
Browser Dashboard
        ↓
Next.js Application
        ↓
Supabase
        ↑
Scanner Worker
        ↓
Angel One SmartAPI
```

## Browser

Responsible for:

- UI
- Signal presentation
- Journal actions
- Settings
- Notifications

Must never contain:

- Angel One API key
- Client ID
- MPIN
- TOTP secret
- Session token
- Worker credentials

## Next.js Application

Responsible for:

- Authentication
- Responsive UI
- Server-side validation
- User-scoped data access
- Journal mutations
- UI-safe API boundary

Must not implement broker order functionality.

## Scanner Worker

Responsible for:

- Angel One authentication
- Live market-data connection
- Tick processing
- Candle aggregation
- Market-universe filtering
- Strategy evaluation
- Signal creation
- Signal expiry
- Feed-health reporting

The worker must be market-data-only.

## Supabase

Responsible for:

- Authentication
- PostgreSQL data
- Real-time updates
- Application records
- Signal snapshots
- Journal data
- Audit history
- Feed-health records

---

# 28. Market Data Flow

```text
Angel One
    ↓
Market Data Stream
    ↓
Scanner Worker
    ↓
Tick Aggregation
    ↓
1-minute / 5-minute Candles
    ↓
Universe Filtering
    ↓
Strategy Evaluation
    ↓
Signal Generation
    ↓
Supabase
    ↓
Next.js
    ↓
Dashboard
```

The scanner must maintain the authenticated market-data session during market hours.

---

# 29. Trade Journal Flow

```text
User
 ↓
"I entered"
 ↓
Browser
 ↓
Authenticated Next.js request
 ↓
Server validation
 ↓
Supabase
 ↓
Audit event
 ↓
Dashboard refresh
```

The same pattern applies to exits and partial exits.

---

# 30. Security Requirements

The system must:

- Keep Angel One secrets exclusively in the scanner's secret store.
- Prevent broker secrets from reaching the browser.
- Prevent secrets from entering source control.
- Restrict scanner database permissions to required operations.
- Use Supabase authentication.
- Use row-level security for user-facing records.
- Validate every journal mutation server-side.
- Prevent trust in client-calculated P&L.
- Record important state changes with timestamp and actor identity.
- Encrypt data in transit.
- Rely on managed encryption at rest.

---

# 31. Market Data Health

The product must make feed health visible.

Required states include:

```text
Simulated
Live
Delayed
Stale
Disconnected
```

The system should expose sufficient information to determine:

- Last received update
- Feed status
- Scanner status
- Data freshness

Exact thresholds for transitioning between delayed, stale, and disconnected states remain to be defined.

---

# 32. Environments

## Local Development

Purpose:

- UI development
- Schema development
- Simulated scanner data
- Local testing

Live broker data:

**No**

## Preview

Purpose:

- UI review
- Journal testing
- Generated/sample data

Live broker data:

**No**

## Production Dashboard

Deployment:

- Vercel

Purpose:

- Production dashboard
- Production records

## Production Worker

Deployment:

- Always-on server with fixed public IP

Purpose:

- Live market-data scanning during market hours

Live broker data:

**Yes — market data only**

---

# 33. Responsive Requirements

## Desktop

- 12-column layout
- 24px gutter
- 32px outer margin
- Maximum content width: 1440px
- 248px navigation
- Collapsible navigation to 72px

## Tablet

At approximately 1024px:

- Navigation collapses to icon rail
- Dense tables may scroll horizontally

At approximately 768px:

- Top navigation
- Filter controls use a bottom-sheet interaction

## Mobile

At approximately 480px:

- Single-column cards
- Full-width journal actions
- Preserve alignment of numerical values

---

# 34. Accessibility Requirements

The application must:

- Meet WCAG AA contrast requirements for text and controls.
- Provide visible keyboard focus.
- Support keyboard navigation.
- Trap focus inside modals.
- Provide accessible table actions.
- Announce connection changes through an ARIA live region.
- Announce confirmation results.
- Avoid auto-refreshing focused form fields.
- Clearly communicate data updates.
- Never rely exclusively on red/green to communicate direction or result.

---

# 35. Formatting Requirements

Financial values must use Indian currency formatting.

Example:

```text
₹1,45,280.50
```

Prices, quantities, timestamps, percentages, and P&L should use tabular numerals.

Time-sensitive values should include:

```text
IST
```

when context could otherwise be unclear.

---

# 36. Core UI Components

The initial component inventory should include:

### Application Shell

- AppShell
- Sidebar
- Topbar
- PageHeader

### Basic UI

- Button
- IconButton
- Badge
- Tooltip
- Tabs
- Card
- EmptyState
- Skeleton

### Signal Components

- SignalCard
- SignalPlan
- ConfidenceMeter
- ExpiryTimer
- MarketStatus
- DataFreshnessIndicator

### Trade Components

- TradeTable
- JournalDrawer
- TradeLegTimeline

### Form Components

- PriceInput
- QuantityInput
- Select
- DateRangePicker

### Feedback

- ConfirmationModal
- Toast
- ErrorBanner

### Charting

- CandlestickChart
- VolumeChart
- Legend
- ChartTooltip

---

# 37. Design Requirements

The interface must follow these design principles:

### Clarity Before Urgency

Alerts communicate state and information, not pressure.

### Risk Travels With Reward

Stop/invalidation must remain visible with targets.

### One Clear Action

Trade-journal actions must be explicit.

### Honest Data

A stale feed must look stale.

### Accessible Direction

Direction must use:

- Text
- Icon
- Color

rather than color alone.

---

# 38. Signal Card Interaction Rules

The signal card must:

- Show direction before symbol.
- Keep stop/invalidation visually prominent.
- Display expiry countdown.
- Change countdown treatment as expiry approaches.
- Clearly differentiate active, expiring, and expired states.
- Never imply that clicking `I entered` executes a broker trade.

The `I entered` action opens a confirmation flow.

---

# 39. Trade Confirmation

Before recording a trade-changing action, the confirmation flow should display:

- Symbol
- Direction
- Quantity
- Price
- Timestamp

The user explicitly confirms the journal action.

The action records the user's trade journal entry only.

---

# 40. Success Metrics

The first release is successful when:

1. Market-data status is always visible and understandable.
2. Active signals are delivered promptly.
3. Signals expire correctly.
4. Manual entries and exits can be recorded in under 10 seconds.
5. Journal calculations are traceable and accurate.
6. Signal performance can be separated from actual trading performance.
7. Historical signals retain their original plans and metrics.
8. Paper tracking validates the initial strategy before relying on live signals.

---

# 41. Delivery Phases

## Phase 1 — Foundation

Build:

- Next.js application
- Responsive shell
- Authentication
- Supabase schema
- Core components
- Generated/simulated signals
- Signal cards
- Signal detail
- Manual journal
- Audit records
- P&L calculation

No live broker data.

---

## Phase 2 — Scanner Prototype

Build:

- Historical/simulated market data
- Candle aggregation
- Instrument universe
- Strategy evaluation
- Signal generation
- Signal scoring
- Historical signal outcomes
- Performance views

No live trading dependency.

---

## Phase 3 — Live Market Data

Build:

- Fixed-IP worker
- Angel One SmartAPI market-data client
- Live tick processing
- Candle aggregation
- Feed-health monitoring
- Live signal generation

No broker order integration.

---

## Phase 4 — Validation

Perform:

- Paper tracking
- Historical testing
- Signal-rule refinement
- Performance analysis
- Feed-health validation
- Expiry validation
- Signal-vs-trade analysis

Live reliance should not begin until this phase produces sufficient validation evidence.

---

## Phase 5 — Personal Live Tracking

Enable:

- Live signals
- Live dashboard
- Manual execution through Angel One
- Manual trade journaling
- Historical performance analysis

Broker execution remains outside the application.

---

# 42. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User can view active alerts ranked by setup quality. | P0 |
| FR-02 | Every active alert shows a countdown and becomes non-actionable at expiry. | P0 |
| FR-03 | User can mark an alert as entered, skipped, or expired. | P0 |
| FR-04 | User can record full and partial exits. | P0 |
| FR-05 | System calculates gross and estimated net P&L. | P0 |
| FR-06 | User can filter historical alerts and trades. | P0 |
| FR-07 | User can enable/disable browser notifications. | P1 |
| FR-08 | Product clearly distinguishes live, delayed, stale, disconnected, and simulated data. | P0 |
| FR-09 | System records inputs and rule version used for each alert. | P0 |
| FR-10 | Product does not expose or call broker order-management endpoints. | P0 |
| FR-11 | Signal plans remain historically traceable. | P0 |
| FR-12 | Trade actions generate audit records. | P0 |
| FR-13 | User can inspect actual trade performance against original signal plans. | P0 |
| FR-14 | System supports partial-exit timelines. | P0 |
| FR-15 | Signal expiry is enforced automatically. | P0 |

---

# 43. Non-Functional Requirements

## Security

Broker credentials must remain server-side and isolated to the scanner worker.

## Reliability

Market-data failures must become visible application states.

## Performance

Signal updates should be delivered promptly enough to support short-lived intraday observations.

## Auditability

Signal inputs, strategy version, state transitions, and journal changes must remain traceable.

## Accessibility

The application must meet the defined WCAG AA requirements.

## Responsive Design

The dashboard must remain usable on desktop, tablet, and mobile.

## Data Integrity

Historical signal plans and journal records must not be silently mutated.

---

# 44. Open Product Decisions

The following are intentionally unresolved and must be decided before the corresponding implementation becomes final.

## Strategy

- Exact breakout rules
- Exact breakdown rules
- Momentum definition
- Trend calculation
- Relative-volume threshold
- Volatility threshold
- Liquidity threshold
- Spread constraints
- Risk/reward minimum
- Instrument eligibility thresholds

## Confidence

- Confidence formula
- Component weights
- Normalization
- Minimum confidence threshold
- Confidence categories
- Missing-data handling

## Historical Analysis

- Definition of a comparable setup
- Historical lookback period
- Minimum sample size
- Probability calculation
- Expected movement calculation
- Treatment of changing market regimes

## Risk

- Daily risk limits
- Maximum alert count
- Maximum trade count
- Risk-per-trade model
- Partial-exit allocation

## Targets

- Target 2 methodology
- Further target methodology
- Trailing-exit rules
- Invalidation rules

## Charges

- Brokerage/charge inputs
- Default charge assumptions
- Charge calculation methodology

## Infrastructure

- Fixed-IP hosting provider
- Worker region
- Worker sizing
- Market-data reconnection strategy

## Feed Health

- Delayed threshold
- Stale threshold
- Disconnected threshold
- Recovery rules

---

# 45. Product Constraints

The following constraints are mandatory:

1. No broker order execution.
2. No broker funds/holdings/portfolio APIs.
3. No broker credentials in the browser.
4. No automated trade execution.
5. NSE cash-equity only for the first release.
6. Signals must be time-bound.
7. Signal plans must remain historically traceable.
8. Actual trades must remain separate from signal outcomes.
9. Market-data health must be visible.
10. Live strategy use must follow paper/historical validation.
11. The UI must not present estimates as guarantees.
12. Direction must not rely on color alone.

---

# 46. Definition of Done — Product Foundation

The product foundation is complete when:

- Authentication works.
- The responsive dashboard shell works.
- Supabase schema exists.
- Simulated signals can be generated.
- Signals display entry, stop, targets, confidence, rationale, and expiry.
- Signal expiry is enforced.
- Signal history is preserved.
- Users can record entries.
- Users can record full and partial exits.
- P&L is calculated correctly.
- Signal performance and trade performance are separated.
- Audit events are generated.
- Feed status is visible.
- Responsive layouts work across desktop, tablet, and mobile.
- Keyboard accessibility works for primary workflows.
- No broker order functionality exists.

---

# 47. Definition of Done — Live Scanner

The live scanner is complete when:

- Fixed-IP infrastructure is operational.
- Angel One market-data authentication works.
- Live ticks are received.
- One-minute and five-minute candles are generated.
- Eligible instruments are filtered.
- Strategy rules execute deterministically.
- Signals are generated with versioned metrics.
- Signal expiry works.
- Feed-health states work.
- Signals are persisted to Supabase.
- Dashboard receives live signal changes.
- Paper tracking has been completed.
- Historical validation has been performed.
- No broker order endpoint is exposed or called.

---

# 48. Final Product Boundary

The finished product is:

```text
A personal intraday market-observation,
signal-analysis, and trade-journaling system.
```

It is **not**:

```text
A broker terminal
A trading bot
An automated execution system
A portfolio manager
An investment-advice service
A guaranteed-profit signal service
```

The core product loop remains:

```text
Observe
  ↓
Evaluate
  ↓
Plan
  ↓
Decide
  ↓
Manually Execute
  ↓
Journal
  ↓
Analyze
  ↓
Improve
```

The application provides the information, structure, and historical record around that loop while leaving the trading decision and broker execution with the user.