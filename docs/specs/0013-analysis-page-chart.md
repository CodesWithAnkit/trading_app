# 0013. Implement candlestick chart for the analysis page

**Date**: 2026-09-30
**Status**: Accepted

## Summary

This decision defines the implementation of the interactive candlestick chart on the dynamic stock analysis page. We will use TradingView's Lightweight Charts to render historical candles, live price updates, volume bars, and horizontal setup lines (Entry, Stop Loss, Target). This replaces the current placeholder component and gives traders visual confirmation of the strategy setup without needing an external charting tool.

## Context

The dynamic stock analysis page (`/dashboard/analysis/[symbol]`) evaluates a stock against quantitative strategies and generates a trade plan. Currently, it displays a "Chart Component Placeholder". Traders need visual confirmation of the setup—specifically where the current price sits relative to the historical trend, entry zones, stop loss, and target levels. The chart needs to support real-time tick updates (via the existing SSE feed) and render efficiently without manual timeframe toggles, inheriting the timeframe dictated by the matched strategy.

## Requirements

**User stories**:
- As a trader, I want to see a live candlestick chart with entry, stop loss, and target lines so that I can visually confirm the strategy setup before saving it to my journal.

**Acceptance criteria**:
- **AC-1**: Renders a TradingView Lightweight Charts instance fitted to the container dimensions.
- **AC-2**: Displays historical candlesticks (1m or 5m) sourced from the active strategy's `SignalContext`.
- **AC-3**: Renders horizontal price lines for Entry Zone, Stop Loss, and Target if a strategy setup is matched.
- **AC-4**: Updates the current live price and the latest candle in real-time using the existing SSE feed (`SignalContext`).
- **AC-5**: Displays volume bars at the bottom of the chart area.
- **AC-6**: Displays a skeleton loader mimicking the chart area while the candle data is loading.
- **AC-7**: Automatically inherits the timeframe (1m or 5m) from the matched strategy, without manual user toggles.

## Options considered

### Option 1: Lightweight Charts (TradingView)

A high-performance, canvas-based financial charting library by TradingView.
**Pros**:
- Built specifically for financial time-series data (candlesticks, volume histograms).
- Native support for horizontal price lines, live tick updates, and proper time-scale handling.
**Cons**:
- Adds a new dependency to the web app.
- Imperative API requires careful React `useEffect` management for cleanup and resizing.

### Option 2: Recharts

An SVG-based charting library built on React components, already installed for the Performance dashboard.
**Pros**:
- Already in the dependency tree.
- Declarative React API.
**Cons**:
- Not designed for dense financial candlesticks; building a custom candlestick shape is cumbersome.
- Poor performance with high-frequency live tick updates compared to canvas-based libraries.
- Managing advanced financial features (price lines, time-scales) is difficult.

### Option 3: Static SVG / CSS Visualization

A custom-built, simplified visual showing only the current price relative to the levels.
**Pros**:
- Zero dependencies, extremely lightweight.
**Cons**:
- Does not show historical price action (trend context), failing the core requirement for visual confirmation of the setup.

## Decision

**Chosen option**: Option 1: Lightweight Charts (TradingView)

We will use TradingView's Lightweight Charts because it is the industry standard for lightweight, performant financial charting and natively supports the specific primitives we need: candlesticks, volume histograms, live updates, and horizontal price lines. 

## Rationale

While Recharts is already installed, it is fundamentally unsuitable for dense financial time-series and live tick updates. A trader's visual confirmation requires a recognizable, high-fidelity candlestick chart. Lightweight Charts delivers this with minimal overhead and provides out-of-the-box support for drawing the exact trade plan levels (Entry, Stop Loss, Target) we need to overlay. Inheriting the timeframe directly from the strategy context keeps the UX focused and eliminates unnecessary interactivity.

## Feature design

**Data model sketch**:
No new database schema or backend APIs are required. The component consumes existing frontend context data.

**State transitions**:
- `loading` → `ready`: Skeleton loader is replaced by the initialized chart once `SignalContext` populates candles and the setup.
- `updating`: Live tick events mutate the latest candle and price line on the canvas.

**API surface**:
No new network endpoints. The component interface will be:
| Component | Inputs (Props / Context) | Outputs |
|---|---|---|
| `<AnalysisChart />` | `symbol`, data from `useSignals()` / `SignalContext` (candles, live price, matched setup) | Renders canvas chart |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render historical candles | Candlestick data (open, high, low, close, time) | `SignalContext` (derived from backend `/api/v1/scanner/universe` or SSE) |
| Render volume bars | Volume data (value, time, color) | `SignalContext` (candles) |
| Render setup price lines | Entry, Stop Loss, Target prices | `SignalContext` (the matched strategy setup) |
| Render live price | Current LTP | `SignalContext` (latest tick via SSE) |

**Key invariants**:
- The chart's timeframe must strictly match the timeframe used by the quantitative strategy to generate the setup.
- The chart instance must be properly destroyed on component unmount to prevent memory leaks.

**Security model**:
No changes to the security model. The chart displays public market data and locally evaluated strategies.

**Configuration required**:
- None.

**Critical test scenarios**:
- Happy path: Chart renders 5m candles, volume, and horizontal lines for Entry/Stop/Target when a momentum setup is matched, verifies **AC-1, AC-2, AC-3, AC-5, AC-7**
- Real-time update: A new tick via SSE updates the last candle's close price and the live price indicator, verifies **AC-4**
- Loading state: A skeleton loader is visible before the context provides the initial candle dataset, verifies **AC-6**

## Build plan

1. Install `lightweight-charts` dependency in `apps/web`, satisfies **AC-1**
2. Create the `<AnalysisChart />` component with a `useEffect` to initialize the chart and a `ResizeObserver` to handle responsive resizing, satisfies **AC-1**
3. Implement the skeleton loader for the `loading` state, satisfies **AC-6**
4. Connect the component to `useSignals()` / `SignalContext` to consume historical candles, inheriting the timeframe, satisfies **AC-2, AC-7**
5. Add the candlestick series and volume histogram series to the chart, mapping the context data to the required format (converting timestamps to seconds for Lightweight Charts) and applying STITCH CSS variables for theme colors, satisfies **AC-2, AC-5**
6. Implement `createPriceLine` calls on the candlestick series for Entry Zone, Stop Loss, and Target levels based on the matched setup, satisfies **AC-3**
7. Implement a subscription to live ticks (via context) to update the current candle (`update()`) and live price line, satisfies **AC-4**
8. Replace the "Chart Component Placeholder" in `apps/web/app/dashboard/analysis/[symbol]/page.tsx` with the new `<AnalysisChart />` component.

## Consequences

**Positive**:
- Traders get immediate, high-fidelity visual context for every generated setup.
- The UX is simplified by automatically matching the chart timeframe to the strategy logic.

**Negative / tradeoffs**:
- Adds a new client-side dependency (`lightweight-charts`) which increases the bundle size slightly.
- The imperative API of Lightweight Charts requires careful React wrapper management to avoid stale closures and memory leaks.

**Neutral**:
- None.
