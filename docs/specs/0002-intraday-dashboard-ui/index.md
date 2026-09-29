# 0002. Implement Intraday Stock Tracker Dashboard UI

**Date**: 2026-09-29
**Status**: Accepted

## Summary

This decision defines the UI-only implementation phase for the Intraday Stock Tracker dashboard. We are building a complete, interactive, and responsive frontend using Next.js and Tailwind, relying exclusively on mock data and local state transitions. This establishes the visual foundation and user interactions (Facade approach) before connecting any real backend, APIs, or broker execution engines.

## Requirements

**User stories**:
- As a trader, I want to view active signals, my daily metrics, and open positions on a single dashboard so that I can make quick decisions.
- As a trader, I want to record my manual entries and exits with mock risk validation so that I can practice and journal without risking real capital.

**Acceptance criteria**:
- **AC-1**: Every supplied Stitch screen and state is implemented with high visual fidelity, responsive behavior, and correct design tokens. This includes: Screen 1 (Main Dashboard), Dashboard No Active Signals State, Dashboard Delayed/Disconnected Data State, Screen 2 (Signal Detail), Screen 3 (Expired Signal Detail), Screen 4 (Record Trade Entry Modal), Screen 5 (Risk Limit Validation Error Modal), Screen 6 (Open Trade Detail), and Screen 7 (Trade Journal + Audit Drawer).
- **AC-2**: Dashboard properly renders active signals, open positions, daily metrics, and explicitly handles "No Active Signals" and "Delayed/Disconnected" states.
- **AC-3**: Signal Detail view correctly displays status and expiry timers, and provides journal-only "I entered", "Skip", and "Watch" actions.
- **AC-4**: Record Trade Entry modal validates mock quantities against risk limits via client-side validation, preventing submission until corrected.
- **AC-5**: Open Trade Detail provides interactive mock flows for Partial Exits (25%, 50%, 75%, 100%) and Full Exits.
- **AC-6**: The application state transitions properly through Signal lifecycles (Candidate → Active → Expiring → Expired) and Trade lifecycles (Open → Partial → Closed) using local context and URL state.
- **AC-7**: Trade Journal properly displays the list of manual trade history and opens an Audit Drawer for detailed views.
- **AC-8**: Placeholder assets (e.g., Unsplash/pravatar) are used for avatars where applicable.
- **AC-9**: Layout must be fully responsive across mobile and desktop. On desktop, the sidebar is fixed on the left; on mobile, the sidebar is hidden and replaced by a fixed bottom floating navigation bar for thumb reach. Padding and alignments adapt across breakpoints.

## Feature design

**Data model sketch**:
- `Signal`: ID, Symbol, Direction (Long/Short), SetupName, Timeframe, Price, QualityScore, ExpiresAt, Status (Active, Expired, Entered, Skipped, Invalidated), Levels (Entry, Stop, T1, T2)
- `Trade`: ID, SignalID (FK), Status (Open, Partial, Closed), Quantity, EntryPrice, UnrealizedPnL, RealizedPnL, ExitReason
- `MarketState`: Status (Live, Delayed, Disconnected, Simulated), Timestamp
- `JournalEntry`: TradeID, Notes, DisciplineScore

**State transitions**:
- **Signal**: `CANDIDATE` → `ACTIVE` → `EXPIRING` → `EXPIRED` (or terminal states `SKIPPED`, `ENTERED`, `INVALIDATED`)
- **Trade**: `NONE` → `ENTRY_FORM` → `ENTRY_VALIDATION_ERROR` (client-only) → `OPEN` → `PARTIAL` → `CLOSED`

**API surface**:
Since there is no real backend, the API surface consists of React Context providers and custom hooks:
| Hook | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `useDashboardState` | GET | None | `MarketState`, `dailyMetrics` | N/A | None |
| `useSignals` | GET | `statusFilter` | `Signal[]` | N/A | None |
| `useSignal` | GET | `signalId` | `Signal` | N/A | 404 (Mock Not Found) |
| `useTrade` | GET | `tradeId` | `Trade`, `updateTrade` | N/A | 404 (Mock Not Found) |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Dashboard rendering | Active Signals list | `useSignals()` context hook |
| Entry Modal submission | Validation result | Client-side risk budget calculation (mocked config) |
| Partial Exit | Realized P&L | Computed locally from `ExitPrice - EntryPrice` |
| Expiry Timer | Remaining time | Computed locally: `ExpiresAt - CurrentTime` |

**Key invariants**:
- Risk validation must prevent form submission if the calculated risk exceeds the configured budget.
- An `EXPIRED` signal cannot be transitioned to `ENTERED`.
- The UI must clearly indicate when data is `DELAYED`, `DISCONNECTED`, or `SIMULATED`.

**Security model**:
There is no backend authentication or authorization in this phase. The application runs locally with hardcoded mock identities (using placeholder avatars).

**Configuration required**:
- No environment variables are strictly required for the mock phase, though Tailwind theme tokens must be configured in `tailwind.config.ts`.

**Critical test scenarios**:
- Happy path: A user clicks a signal, records a trade entry, and the dashboard updates to show the open trade. Verifies **AC-3**, **AC-6**.
- Failure case: A user enters a quantity that exceeds the mock risk budget; the submit button disables and an error appears. Verifies **AC-4**.
- Edge case: Dashboard correctly displays the "Delayed/Disconnected" state when toggled. Verifies **AC-2**.

## Build plan

1. [x] Extract Stitch design tokens into Tailwind configuration and setup global layout shell. satisfies **AC-1**, **AC-8**
2. [x] Update layout shell to be fully responsive, introducing a hidden-on-desktop mobile bottom navigation bar and breakpoint-aware padding/sidebar handling. satisfies **AC-9**
3. [x] Build mock React Context providers (`useDashboardState`, `useSignals`, `useTrades`) and populate them with realistic mock data. satisfies **AC-6**
4. [x] Implement Screen 1 (Main Dashboard) and explicitly handle Dashboard No Active Signals State and Dashboard Delayed/Disconnected Data State. satisfies **AC-1**, **AC-2**
5. [x] Implement Screen 2 (Signal Detail) and Screen 3 (Expired Signal Detail state) with countdown timers. satisfies **AC-1**, **AC-3**
6. [x] Implement Screen 4 (Record Trade Entry Modal) and Screen 5 (Risk Limit Validation Error Modal state) with client-side risk limit validation. satisfies **AC-1**, **AC-4**
7. [x] Implement Screen 6 (Open Trade Detail) with interactions for Partial (25/50/75/100%) and Full Exits. satisfies **AC-1**, **AC-5**
8. [x] Implement Screen 7 (Trade Journal + Audit Drawer). satisfies **AC-1**, **AC-7**

