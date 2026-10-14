# 0007 Rationale: Live Market and Scanner UI

## Context

The Intraday Stock Tracker has two layers of work converging: spec 0006 builds the backend pipeline (instruments, market status API, market watch API, candles API, strategy engine port, diagnostics), and this spec builds the frontend that consumes those APIs.

The current frontend is a static prototype built in spec 0002 (dashboard UI shell with mock data). Every value on screen is hardcoded: the date says "Tuesday, 24 Oct 2023", prices are literals, the market status defaults to SIMULATED, and there is no route for market observation or stock detail. The scanner pipeline runs in the backend but the user cannot see it working.

The Stitch design (5 screens in `design/stitch_intraday_stock_tracker_dashboard 2/`) provides the approved visual target: a live dashboard with real time summary cards, a compact scanner pipeline, market watch table with all instruments, and active signals. A full Markets page with dense tables, scanner pipeline visualization, feed health, and candle engine status. A Stock Detail page with chart, metrics, scanner evaluation criteria, setup details, and audit trail.

The challenge is not building new HTML; it is integrating the Stitch visual design into the existing Next.js application without duplicating the design system, breaking existing routes, or hardcoding Stitch screenshot values as production data.

## Options considered

### Option 1: Integrate into existing application (extend and reuse)

Add new routes and components to the existing Next.js app. Reuse the existing design system, layout shell, sidebar, UI primitives (Card, Badge, Table, MetricCard, SignalCard, SignalPlan, TradeEntryModal). Create new domain components (MarketStatusBadge, MarketWatch, ScannerPipeline, FeedHealthCard, CandleEngineCard, ScannerEvaluation, StockHeader) that follow the existing patterns. Share data across pages via a new MarketDataContext that polls the spec 0006 endpoints.

**Pros**:
- Reuses 10+ existing components and the full design system.
- No duplication of business logic, design tokens, or layout structure.
- All existing routes preserved. Incremental addition.

**Cons**:
- Requires careful integration work (understanding every existing component's props and behavior).
- Some existing components may need minor extensions to support new use cases.

### Option 2: Rebuild from Stitch HTML

Take the Stitch HTML/Tailwind output and build standalone pages from it, replacing the existing application.

**Pros**:
- Pixel perfect match to Stitch from day one.
- No need to understand existing component library.

**Cons**:
- Duplicates the entire design system (Stitch uses Tailwind with inline config; the app uses CSS custom properties).
- Breaks all existing routes, contexts, providers, and state management.
- Creates two copies of every shared component (sidebar, topbar, badges, cards).
- Loses all the work from specs 0002, 0003, 0004 (signals, trades, journal, performance pages).

### Option 3: Parallel application with iframe embedding

Build the market pages as a separate Stitch application and embed them into the existing app.

**Pros**:
- Complete isolation from existing code.

**Cons**:
- Cross frame communication for shared state (signals, trades, market status) is complex and fragile.
- Two design systems, two routing systems, two deployment pipelines.
- Fundamentally the wrong architecture for a single product.

## Rationale

Option 1 is the clear choice. The existing application already has the layout shell, sidebar, design tokens, and component library built and working. Rebuilding from Stitch HTML (Option 2) would throw away months of UI work across specs 0002 and 0003, and create a maintenance burden of two parallel design systems. The Stitch output is the visual reference (what it should look like), not the implementation (how to build it).

The data fetching approach uses a shared MarketDataContext with polling because: (1) multiple components across 3 pages need the same market status and instrument data; (2) polling at 5 seconds matches the backend design from spec 0006; and (3) the existing app already uses React contexts for signals and trades, so this follows the established pattern.

The Tracer Bullet build approach ensures the most uncertain integration (one stock flowing through all components end to end) is proven before the remaining pages and components are built in full.
