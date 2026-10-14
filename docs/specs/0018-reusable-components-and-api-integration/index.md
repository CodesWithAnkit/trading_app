---
status: Proposed
date: 2026-10-15
---

# 0018. Reusable Components and API Integration Architecture

**Date**: 2026-10-15  
**Status**: Proposed  

## Summary

This specification establishes the real API integration contracts and reusable component architecture for the Market Intelligence and Tactical Terminal user interface. It connects the visual domain components in the web application to the NestJS backend through dedicated endpoints, shared TypeScript contracts, and custom data hooks. It enforces a strict separation between pure visual components and data fetching containers, implements reliable fallback states, and locks all execution buttons when market feeds become stale.

## Requirements

**User stories**:
- As a frontend engineer, I want clean reusable visual components with strictly typed properties so I can reuse them across dashboard, scanner, and analysis pages without duplicating data fetching logic.
- As a trader, I want live market regime, sector momentum, and corporate news synchronized in real time with clear loading and error states so I never make decisions on frozen data.
- As a trader, I want all trade actions immediately locked whenever market data latency exceeds safety thresholds so I do not execute trades during feed disconnects.
- As a compliance auditor, I want every explainable analysis card to produce an immutable verified JSON audit document that proves what facts existed when a setup triggered.

**Acceptance criteria**:
- **AC-1**: Shared TypeScript contract interfaces define the canonical schemas for market context, sector matrix, corporate disclosures, institutional flows, and explainable snapshots, accessible by both web and backend packages.
- **AC-2**: The NestJS backend provides `IntelligenceController` under `/api/v1/intelligence` exposing endpoints for `/context`, `/news`, `/institutional`, and `/analysis/:symbol`, returning valid JSON matching the shared contracts.
- **AC-3**: The active `/api/v1/scanner/stream` Server Sent Events endpoint broadcasts live intelligence events for market regime updates, newly ingested corporate announcements, and updated signal snapshots.
- **AC-4**: All domain components (`MarketRegimeStrip`, `RiskCapitalGuard`, `ExplainableEvidenceCard`, `RiskGatesChecklist`, `ContradictoryFactorsCard`, `InstitutionalFlowCard`, `NewsFilingsTimeline`) expose pure presentation interfaces with typed properties and zero inline fetch calls.
- **AC-5**: Custom React hooks (`useMarketIntelligence`, `useNewsFilings`, `useExplainableAnalysis`) manage cached data fetching with SWR, background revalidation, and live event subscription.
- **AC-6**: Reusable components provide uniform visual states for skeleton loading, zero data states, degraded feed warnings, and network error recovery.
- **AC-7**: Deterministic safety gating automatically disables entry and manage buttons, rendering a prominent NO TRADE banner whenever feed latency exceeds five seconds or the quote stream disconnects.
- **AC-8**: Institutional flow components clearly display historical end of day labels and time stamps, ensuring delayed disclosures are never mistaken for live order book flow.
- **AC-9**: Corporate announcement components provide verified source document links and visually isolate source facts from language model interpretations.
- **AC-10**: The analysis page supports one click export of an audited JSON snapshot matching the deterministic evidence schema.

## Decision

**Chosen option**: Option 1: Modular Intelligence Controller with Shared Contract Types and Split Container Presentation Hooks

We implement a dedicated `IntelligenceController` and services in the NestJS backend, export shared data contracts, and build custom React hooks in the Next.js web application that feed pure presentational components.

**Implementation skills**:
- `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)
- `supabase` (`.agents/skills/supabase/`)
- `supabase-postgres-best-practices` (`.agents/skills/supabase-postgres-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Shared Contract Interfaces

The shared type definitions establish the data contract between frontend and backend:

```typescript
// Shared domain contract types
export type MarketRegimeType = 
  | 'BULLISH_TREND_DAY' 
  | 'BEARISH_TREND_DAY' 
  | 'RANGE_BOUND_CONGESTED' 
  | 'VOLATILE_DISLOCATED' 
  | 'UNCLEAR';

export interface SectorMetricContract {
  name: string;
  ltp: number;
  changePct: number;
  alphaVsNifty: number;
  leaderSymbol: string;
  leaderChangePct: number;
  advances: number;
  declines: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export interface MarketContextContract {
  regime: MarketRegimeType;
  regimeLabel: string;
  regimeDescription: string;
  vix: number;
  vixChangePct: number;
  niftyLtp: number;
  niftyChangePct: number;
  advancesCount: number;
  declinesCount: number;
  unchangedCount: number;
  sectors: SectorMetricContract[];
  updatedAt: string;
}

export interface NewsFilingContract {
  id: string;
  symbol: string;
  source: 'NSE' | 'BSE' | 'RBI' | 'WIRE';
  sourceType: 'OFFICIAL_FILING' | 'REGULATORY_CIRCULAR' | 'MEDIA_NEWS';
  isOfficialFiling: boolean;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  headline: string;
  summary: string;
  confirmedFacts: string[];
  inferredInterpretation?: string;
  pubTime: string;
  ingestTime: string;
  clockSkewSeconds: number;
  referenceId: string;
  sourceUrl?: string;
  embargoActive?: boolean;
}

export interface InstitutionalFlowContract {
  reportDate: string;
  fiiNetCrores: number;
  diiNetCrores: number;
  isDelayedEod: boolean;
  bulkDeals: Array<{
    symbol: string;
    clientName: string;
    dealType: 'BUY' | 'SELL';
    quantity: number;
    tradePrice: number;
    valueCrores: number;
    timestamp: string;
  }>;
}

export interface ExplainableEvidenceContract {
  symbol: string;
  confidenceScore: number;
  direction: 'LONG' | 'SHORT';
  ruleVersion: string;
  categoryA_MarketAndSector: {
    regimeAlignment: string;
    sectorAlpha: number;
    sectorRank: string;
  };
  categoryB_NewsEvents: {
    verifiedFilingFound: boolean;
    recentHeadline?: string;
    impactRating?: string;
    eventEmbargoStatus: 'CLEAR' | 'EMBARGOED';
  };
  categoryC_BreadthParticipation: {
    sectorBreadthPct: number;
    advances: number;
    declines: number;
  };
  categoryD_InstitutionalFlow: {
    fiiNetContext: string;
    blockDealsToday: string;
  };
  riskGates: Array<{
    id: string;
    name: string;
    detail: string;
    status: 'PASS' | 'REJECT' | 'NO_TRADE';
  }>;
  contradictoryFactors: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}
```

### API Surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/intelligence/context` | GET | none | `MarketContextContract` | Public | 500 Feed Degraded |
| `/api/v1/intelligence/news` | GET | `symbol?`, `officialOnly?`, `limit?` | `NewsFilingContract[]` | Public | 400 Invalid Query |
| `/api/v1/intelligence/institutional` | GET | `date?` | `InstitutionalFlowContract` | Public | 404 No Data Available |
| `/api/v1/intelligence/analysis/:symbol` | GET | `symbol` path param | `ExplainableEvidenceContract` | Public | 404 Symbol Not Found |
| `/api/v1/scanner/stream` | GET (SSE) | none | Event stream | Public | 503 Stream Disconnected |

### Value Sourcing

| Value | Source | Sourcing mechanism |
|---|---|---|
| Market Breadth | Angel One WebSocket ticks | In memory aggregation across watched cash universe |
| India VIX | Angel One index tick | Live WebSocket quote for token 26009 |
| Sector Matrix | Grouped stock ticks | Calculated median price change per sector basket |
| Corporate Filings | NSE NEAPS RSS and BSE feed | Scheduled backend polling worker every sixty seconds |
| Institutional Flows | SEBI and NSE reports | Scheduled daily worker writing to Supabase table |
| Deterministic Risk Gates | Live quote and strategy rules | Evaluated on demand against setup snapshot |

### Component Architecture

The reusable component hierarchy separates presentation from state:

1. **Presentation Layer (`components/domain/`)**:
   - Pure functional components accepting typed properties.
   - Zero side effects, zero network calls.
   - Built in support for loading skeleton, empty state, and error message.
   - Strict CSS token usage from the design system.

2. **Container and Hook Layer (`lib/hooks/` and `components/containers/`)**:
   - `useMarketIntelligence()`: SWR fetch with thirty second revalidation and SSE listener.
   - `useNewsFilings(symbol?)`: SWR fetch with sixty second revalidation and event listener.
   - `useExplainableAnalysis(symbol)`: SWR fetch with cached setup snapshots.
   - Automatic latency calculation and stale state detection.

3. **Gating and Safety Layer**:
   - If stream latency exceeds five thousand milliseconds, `isFeedStale` evaluates to true.
   - When `isFeedStale` is true, all action buttons render in disabled state with warning badges.

## Build plan

### Slice 1: Shared Contracts and NestJS Intelligence Controller (Tracer Bullet)
- Task 1: Create shared TypeScript interfaces in a shared types module (AC-1)
- Task 2: Implement `IntelligenceController` in NestJS with `/context`, `/news`, `/institutional`, and `/analysis/:symbol` (AC-2)
- Task 3: Hook intelligence events into the existing SSE stream in `ScannerController` (AC-3)

### Slice 2: Frontend Data Hooks and Gating Infrastructure
- Task 4: Implement `useMarketIntelligence`, `useNewsFilings`, and `useExplainableAnalysis` hooks with SWR and SSE listeners (AC-5, AC-7)
- Task 5: Add feed latency calculation and automatic safety lock gating (AC-7)

### Slice 3: Component Presentation Refactoring and State Handling
- Task 6: Refactor `MarketRegimeStrip` and `RiskCapitalGuard` into pure presentational components with skeletons (AC-4, AC-6)
- Task 7: Refactor `ExplainableEvidenceCard`, `RiskGatesChecklist`, and `ContradictoryFactorsCard` with pure prop interfaces (AC-4, AC-6)
- Task 8: Refactor `NewsFilingsTimeline` and `InstitutionalFlowCard` with explicit delayed stamps and source fact callouts (AC-8, AC-9)
- Task 9: Implement verified JSON audit document download on analysis page (AC-10)

## Migration plan

**Strategy**: Strangler pattern  
**Phases**:
1. Phase 1: Deploy backend intelligence endpoints and shared contracts alongside existing scanner routes. Existing endpoints remain untouched.
2. Phase 2: Deploy custom frontend hooks with fallback to mock data when backend endpoints return connection errors.
3. Phase 3: Switch page components to consume live container hooks, completing the cut over.

**Rollback**: Revert frontend container imports back to static mock data providers; no database rollback required.  
**Risks**: Angel One SmartAPI WebSocket reconnections could briefly report stale latency; mitigated by exponential backoff and cached snapshots.

## Consequences

- The web application gains fully decoupled visual components that can be reused in any layout or testing harness without mock setup.
- Front and backend share identical type definitions, eliminating runtime contract mismatches.
- Traders gain clear visibility into data freshness and source verification with guaranteed safety locks during feed degradation.

## Follow-up

- Consider adding historical calibration replay to test how deterministic risk gates performed on prior market sessions.
- Monitor SSE connection counts during peak morning session to assess if connection pooling or Redis pub sub is warranted.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
