# Rationale: Remaining Intraday Dashboard Pages

## Context

The first phase of the UI implementation successfully built the primary flows (Dashboard, Signal Detail, Trade Entry/Exit, and the Journal with Audit Drawer). However, it did not construct the dedicated list views for Open Trades and Signals, the Performance dashboard, or the Settings configuration page. These are required to complete the UI shell (the Facade approach) so that all navigational routes in the sidebar are functional before we connect real strategy engine endpoints.

## Options considered

### Option 1: Recharts vs Chart.js for Performance Charts
Charting libraries are required for the Performance page. Recharts is built for React, declarative, and easily styled with our Tailwind CSS variables. Chart.js is heavier and requires a wrapper (`react-chartjs-2`).
**Pros**: Recharts is lightweight, heavily customizable, and fits our React paradigm well.
**Cons**: Requires learning its specific component composition model.

### Option 2: State Management for Settings
We need to store the Risk Budget and user preferences. We considered LocalStorage vs a new React Context.
**Pros**: A `SettingsContext` integrates seamlessly with our existing `DashboardContext` and `TradeContext` patterns without side-effects.
**Cons**: State is lost on hard reload (acceptable for the current mock UI phase).

## Rationale

Because we are in the "Facade" build approach, consistency with our existing mock data providers is paramount. Using a React Context for Settings aligns with how we manage trades and signals today. Recharts is selected because its SVG-based charting makes it trivial to inject our precise CSS variable tokens (e.g., `--color-long`, `--color-short`, `--color-risk`) into the graphs, ensuring the visual aesthetics remain strictly consistent with the established premium design.
