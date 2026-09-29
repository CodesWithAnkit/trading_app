# 0003. Remaining Intraday Dashboard UI Pages

**Date**: 2026-09-28
**Status**: Accepted

## Summary

This spec designs the remaining UI pages for the Intraday Stock Tracker dashboard: the Trades list, Signals list, Performance charts, and Settings. It ensures these screens match the pixel-perfect design system established in the initial UI slice. The implementation uses Recharts for the performance data visualization and a new mock React Context to govern configuration state. 


## Requirements

**User stories**:
- As a trader, I want to see a dedicated list of my open trades so I can quickly manage or exit them.
- As a trader, I want to see all active and expired signals in one place so I can review missed opportunities.
- As a trader, I want to see a visual chart of my performance so I can track my P&L trend.
- As a trader, I want to configure my risk limits in a settings page so the app validates my entries accurately.

**Acceptance criteria**:
- **AC-1**: `/dashboard/trades` displays a list of open trades with quick actions (Partial/Full Exit) and real-time (mock) LTP updates.
- **AC-2**: `/dashboard/signals` displays active signals with countdown timers and a history table of expired/skipped signals.
- **AC-3**: `/dashboard/performance` renders a P&L equity curve chart and a win/loss breakdown chart using the `recharts` library.
- **AC-4**: `/settings` provides a form to update configuration (e.g. Risk Budget), governed by a `SettingsContext` that updates app-wide mock state.
- **AC-5**: `/dashboard/journal` is enhanced with basic client-side filtering (by Symbol/Bias) and a mock CSV export button.


## Decision

**Chosen option**: Option 1 (Recharts) and Option 2 (React Context).

We will use `recharts` for the performance visualizations and establish a `SettingsContext` for configuration management. The layouts will be synthesized from the existing `STITCH_UI_IMPLEMENTATION_PLAN.md` tokens.

## Rationale

See [rationale.md](rationale.md) for the decision record.

## Feature design

**Data model sketch**:
This is a pure UI feature. It relies on the existing `mockTrades` and `mockSignals` structures. 
A new `SettingsState` interface is introduced:
- `dailyRiskBudget`: number (default 3000)
- `theme`: string
- `brokerConnected`: boolean (mock flag)

**State transitions**:
Settings Context: Form Submit → Validates Risk Budget is a positive number → Updates Context State.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Client Context | N/A | Settings object | N/A | N/A | N/A |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Load Settings | Risk Budget | `SettingsContext` |
| Load Performance | P&L Curve Data | Derived from `mockTrades` where status = CLOSED |
| Load Trades | Open Trades List | Filtered from `mockTrades` where status = OPEN |

**Key invariants**:
- The performance charts must exclusively compute data from trades that have reached a terminal status (Closed).
- Active Signals list must accurately reflect the countdown timer logic established in Screen 2.

**Security model**:
Client-side mock phase only. All data is scoped to the local session.

**Configuration required**:
- None.

**Critical test scenarios**:
- Happy path: Modifying the Risk Budget in Settings immediately reflects in the Trade Entry Modal (AC-4).
- Happy path: Performance page renders charts without crashing when no closed trades exist (AC-3).
- Happy path: Trades list filters correctly for only Open trades (AC-1).

## Build plan

1. [x] Scaffold `SettingsContext` in `lib/contexts` and wrap the application. satisfies **AC-4**
2. [x] Build the `/settings` page with forms to update the configuration. satisfies **AC-4**
3. [x] Build the `/dashboard/trades` page, reusing the `TradeTable` component filtered for `OPEN` trades. satisfies **AC-1**
4. [x] Build the `/dashboard/signals` page, creating a split view for Active (with timers) and Expired signals. satisfies **AC-2**
5. [x] Install `recharts`, build the `/dashboard/performance` page, and implement the P&L and Win/Loss charts. satisfies **AC-3**
6. [x] Enhance `/dashboard/journal` with a filter bar and mock export button. satisfies **AC-5**

## Consequences

**Positive**:
- Completes the entire navigational structure of the dashboard.
- Proves our design tokens can extend to complex visual components (charts).

**Negative / tradeoffs**:
- Adds a new dependency (`recharts`) to the bundle.

**Neutral**:
- Settings state is ephemeral until a real backend is integrated.
