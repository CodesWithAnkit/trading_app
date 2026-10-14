# Rationale: Reusable Components and API Integration Architecture

## Context

The Intraday Stock Tracker recently migrated its entire user interface to the Tactical Precision Terminal design system based on Stitch project 5780553391039865460. The visual layout introduces high information density, double tier navigation, market regime indicators, multi category explainable evidence, deterministic safety gates, and official corporate filing timelines.

While the visual structure is in place, the components currently rely on hardcoded mock payloads and disparate prop signatures. To graduate this workspace to production readiness, the domain components must map cleanly to real backend endpoints in our NestJS service. At the same time, the frontend architecture must ensure that individual domain cards remain reusable across multiple routes, such as the overview dashboard, dedicated scanner, and deep stock analysis pages.

Several technical forces govern this transition. First, market breadth and price action change continuously throughout the trading session, demanding fast synchronization without overwhelming client resources or causing visual flicker. Second, non negotiable financial safety rules require that execution buttons immediately disable whenever market data latency degrades beyond acceptable boundaries. Third, data provenance must be preserved so traders can clearly distinguish verified exchange filings from fallible language model inferences. Finally, the team needs a clean development workflow where components can be easily unit tested in isolation using pure props.

## Options considered

### Option 1: Modular Intelligence Controller with Shared Contract Types and Split Container Presentation Hooks (Recommended)

This approach creates a dedicated `IntelligenceController` in NestJS with modular sub services for market breadth, news ingestion, institutional flows, and explainable evidence snapshots. Shared TypeScript interfaces define the canonical data contracts across both web and backend packages. In the frontend, domain components are strictly divided into pure presentational components with typed properties and container hooks that handle caching via SWR, background revalidation, and live Server Sent Events subscription.

**Pros**:
- Pure presentational components can be unit tested and styled in complete isolation with zero network mock overhead.
- Shared TypeScript interfaces eliminate drift between backend response payloads and frontend consumption.
- SWR provides automatic client caching, fast tab focus revalidation, and seamless fallback to cached state during transient network hiccups.
- Hard safety gating can be implemented centrally in container hooks and passed down as deterministic disabled flags.

**Cons**:
- Requires maintaining container wrappers alongside presentational components.
- Requires exporting and referencing shared types across monorepo workspace boundaries.

### Option 2: Monolithic Single Context Store

This approach establishes a single high level React Context provider at the root of the dashboard that performs all network requests, stores a massive unified state tree, and passes sliced data down through context hooks to all children.

**Pros**:
- Single location for all data fetching and WebSocket event dispatching.
- Avoids multiple independent HTTP requests for dashboard initialization.

**Cons**:
- Any update to a single property, such as a one second tick update, risks triggering re renders across the entire component tree unless aggressively memoized.
- Reduces component reusability because child components become coupled to the presence of the global root provider.
- Makes testing individual cards cumbersome because tests must mount the entire mock provider hierarchy.

### Option 3: Self Contained Autonomous Widgets

In this approach, each visual widget encapsulates its own data fetching, loading spinners, error handling, and WebSocket subscriptions internally.

**Pros**:
- Simple drop in usage on any page without writing container wrappers or hooks.
- Easy to prototype in isolation.

**Cons**:
- Multiple widgets requesting overlapping data, such as market regime and advance decline ratios, results in duplicate network requests.
- Fragmented state handling makes it difficult to coordinate global safety locks across disparate widgets.
- Inconsistent loading states and layout shifts as individual widgets finish fetching at different times.

## Rationale

Option 1 is selected because it strictly enforces the separation of concerns necessary for financial applications. By separating pure presentation from data acquisition, components like `MarketRegimeStrip` and `ExplainableEvidenceCard` remain simple, deterministic, and easily verifiable through unit tests.

Using SWR with shared TypeScript contracts gives us client side caching, deduplication of concurrent requests, and background revalidation out of the box. Pairing SWR with our existing Server Sent Events stream ensures that high priority updates, such as market regime shifts and verified filings, arrive in real time without polling fatigue. Furthermore, centralizing latency monitoring inside container hooks guarantees that all trade action buttons are locked under a single, authoritative NO TRADE policy whenever the market feed is degraded.

## References

- Intraday Stock Tracker Requirements v1.1
- Spec 0017 Market Intelligence and Explainable Analysis
- Stitch Project 5780553391039865460 Tactical Precision Terminal Design System
- NestJS Controller and Service Architecture Conventions
- React Presentational and Container Component Patterns
