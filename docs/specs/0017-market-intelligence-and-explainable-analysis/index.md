---
status: In Progress
date: 2026-10-15
---

# 0017. Market Intelligence and Explainable Analysis

**Date**: 2026-10-15  
**Status**: In Progress  

## Summary

This specification implements the market intelligence and explainable analysis architecture defined in Intraday Stock Tracker Requirements v1.1. The complete frontend user interface for News and Regulatory Filings (`/dashboard/news`), Market Intelligence overview (`/dashboard/intelligence`), and Explainable Stock Analysis (`/dashboard/analysis/[symbol]`) has already been constructed to the Tactical Precision Terminal standard. The focus of this specification is creating the backend intelligence subsystem in `apps/backend/src/intelligence/` to ingest corporate announcements, calculate in memory market breadth from live ticks, record delayed institutional flows, evaluate deterministic pre trade safety gates, and serve explainable evidence snapshots to the web application.

## Requirements

**User stories**:
- As a trader, I want to inspect why a stock setup was qualified or rejected so I can make an informed manual trade decision instead of trusting an opaque recommendation.
- As a trader, I want to see broad market regime and sector relative strength so I do not take long positions when the entire market is breaking down.
- As a trader, I want to see recent official corporate filings and news for a stock alongside their source timestamps so I am not blindsided by sudden event risk.
- As a trader, I want institutional flow disclosures clearly marked as delayed historical context so I understand general positioning without mistaking it for live order flow.

**Acceptance criteria**:
- **AC-1**: The backend calculates market breadth across all watched NSE stocks in memory every five minutes during market hours, recording the advance to decline ratio, count of stocks above VWAP, and active market regime (Trending Bullish, Trending Bearish, Range Bound, Volatile Dislocated, or Unclear).
- **AC-2**: The backend tracks sector relative strength by grouping watched stocks by sector, calculating the median percentage day change per sector compared against the overall market median.
- **AC-3**: An intelligence ingestion service ingests official exchange announcements from NSE and BSE feeds, capturing source, publication timestamp, ingestion timestamp, affected symbols, headline, and primary filing link.
- **AC-4**: A news service ingests financial news for tracked symbols, deduplicating syndicated articles, recording source attribution, and generating a classification containing direction (Positive, Negative, Mixed, Neutral) and impact level (High, Medium, Low).
- **AC-5 (UI Completed)**: The user interface visibly distinguishes verified official filings from language model interpretation, displaying source links and confidence levels for all inferred statements.
- **AC-6**: Daily institutional activity disclosures for foreign institutional investors (FII) and domestic institutional investors (DII) are recorded in Supabase and displayed as delayed end of day context, never as live intraday order flow.
- **AC-7**: NSE bulk and block deal reports are ingested on a scheduled basis, capturing deal date, client name, action, quantity, price, and traded value in crores.
- **AC-8**: Every potential stock setup generates an explainable analysis snapshot preserving market regime, sector context, positive evidence points, contradictory evidence points, risk gate results, and strategy rule version.
- **AC-9**: Deterministic risk gates execute before any setup qualifies for observation: valid invalidation stop level, minimum net reward to risk ratio of 1.5 after charges, absence of extreme overextension beyond 1.5 ATR, and healthy market data feed status. If any gate fails, the setup displays as Rejected with the explicit failure reason.
- **AC-10**: The product supports NO TRADE as a first class valid system state when market conditions are dislocated, contradictory evidence outweighs positive momentum, or critical feeds are stale.
- **AC-11 (UI Completed)**: The analysis page at `/dashboard/analysis/[symbol]` displays the full Explainable Analysis Card, including the two column positive versus contradictory evidence breakdown, deterministic safety gates checklist, trade plan blueprint, and historical sample size.
- **AC-12**: When historical comparable setups are shown, the product displays sample size, win rate, and out of sample validation notes; if the sample size is below thirty occurrences, it displays an explicit "insufficient evidence" indicator instead of fabricating a percentage.
- **AC-13 (UI Completed)**: Stale price feeds exceeding five seconds or news exceeding twenty four hours are prominently tagged with a warning status, preventing stale data from masquerading as fresh observations.
- **AC-14**: The database schema in Supabase stores `market_context_snapshots`, `news_and_events`, `institutional_flows`, `bulk_block_deals`, and `evidence_snapshots` with appropriate row level security policies.
- **AC-15**: Server Sent Events (SSE) or REST endpoints deliver real time updates for market context, recent news items, and updated explainable snapshots to the web dashboard.
- **AC-16**: All external data integrations maintain rate limits, graceful fallback on network timeouts, and offline mock support for local development.

## Decision

**Chosen option**: Option 1: Modular Ingestion Workers with In Memory Market Breadth and Supabase Evidence Cache

We implement a dedicated `IntelligenceModule` within the existing NestJS backend. Market breadth is derived directly in memory from our active Angel One WebSocket stream covering all 230 liquid F&O stocks, avoiding extra external quote calls. Official exchange announcements and licensed news feeds are polled by scheduled ingestion services and cached in Supabase. When a strategy setup forms or triggers, the strategy engine calls the explainable analysis service to evaluate deterministic safety gates, assemble positive and contradictory factors, and write an immutable snapshot to Supabase. The Next.js frontend renders these using the already created UI components and the custom hooks defined in Spec 0018.

**Implementation skills**:
- `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)
- `supabase` (`.agents/skills/supabase/`)
- `supabase-postgres-best-practices` (`.agents/skills/supabase-postgres-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Data model sketch

New tables in Supabase:

```sql
-- 1. Market Context Snapshots
CREATE TABLE public.market_context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    market_regime TEXT NOT NULL, -- 'TRENDING_BULLISH', 'TRENDING_BEARISH', 'RANGE_BOUND', 'VOLATILE_DISLOCATED', 'UNCLEAR'
    advance_count INTEGER NOT NULL,
    decline_count INTEGER NOT NULL,
    unchanged_count INTEGER NOT NULL,
    pct_above_vwap NUMERIC NOT NULL,
    median_day_change NUMERIC NOT NULL,
    sector_metrics JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_market_context_time ON public.market_context_snapshots(snapshot_time DESC);

-- 2. News and Corporate Announcements
CREATE TABLE public.news_and_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    headline TEXT NOT NULL,
    excerpt TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    event_type TEXT NOT NULL, -- 'OFFICIAL_FILING', 'EARNINGS', 'GENERAL_NEWS', 'MACRO'
    impact_level TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
    direction TEXT NOT NULL, -- 'BULLISH', 'BEARISH', 'MIXED', 'NEUTRAL'
    confidence NUMERIC NOT NULL,
    is_official_filing BOOLEAN NOT NULL DEFAULT false,
    raw_excerpt TEXT
);

CREATE INDEX idx_news_symbol_published ON public.news_and_events(symbol, published_at DESC);

-- 3. Institutional Flows
CREATE TABLE public.institutional_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    fii_gross_buy NUMERIC NOT NULL,
    fii_gross_sell NUMERIC NOT NULL,
    fii_net NUMERIC NOT NULL,
    dii_gross_buy NUMERIC NOT NULL,
    dii_gross_sell NUMERIC NOT NULL,
    dii_net NUMERIC NOT NULL,
    reporting_period TEXT NOT NULL, -- 'PREVIOUS_DAY_EOD', 'MONTHLY_CUMULATIVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. Bulk and Block Deals
CREATE TABLE public.bulk_block_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_date DATE NOT NULL,
    deal_time TIME,
    symbol TEXT NOT NULL,
    client_name TEXT NOT NULL,
    deal_type TEXT NOT NULL, -- 'BULK', 'BLOCK'
    action TEXT NOT NULL, -- 'BUY', 'SELL'
    quantity BIGINT NOT NULL,
    price NUMERIC NOT NULL,
    value_in_crores NUMERIC NOT NULL,
    source TEXT NOT NULL DEFAULT 'NSE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX idx_bulk_deals_symbol_date ON public.bulk_block_deals(symbol, deal_date DESC);

-- 5. Explainable Evidence Snapshots
CREATE TABLE public.evidence_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    market_regime TEXT NOT NULL,
    sector_relative_strength NUMERIC NOT NULL,
    positive_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictory_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_gates JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualification_status TEXT NOT NULL, -- 'QUALIFIED', 'REJECTED', 'OBSERVATION_ONLY'
    rejection_reason TEXT,
    estimated_charges NUMERIC NOT NULL DEFAULT 20.0,
    net_reward_risk NUMERIC NOT NULL,
    historical_sample_size INTEGER,
    historical_win_rate NUMERIC,
    rule_version TEXT NOT NULL
);

CREATE INDEX idx_evidence_symbol_created ON public.evidence_snapshots(symbol, created_at DESC);
```

### Backend Architecture

The backend consists of four cohesive services in `apps/backend/src/intelligence/`:

1. **`MarketBreadthService`**:
   - Consumes live ticks already streaming in `ScannerService` across all 230 F&O stocks.
   - Computes advance count, decline count, and percentage of stocks above their session VWAP anchor.
   - Evaluates regime rules:
     - `TRENDING_BULLISH`: Advance ratio > 65% and > 60% above VWAP.
     - `TRENDING_BEARISH`: Decline ratio > 65% and < 40% above VWAP.
     - `RANGE_BOUND`: Advance ratio between 40% and 60%.
     - `VOLATILE_DISLOCATED`: Rapid intraday reversals or market wide ATR spikes.
   - Flushes a snapshot to `market_context_snapshots` every 5 minutes and caches the current state in memory.

2. **`OfficialFilingsAndNewsService`**:
   - Polls official RSS and API feeds for NSE and BSE corporate announcements every 10 minutes.
   - Queries Alpha Vantage or licensed news provider for specific stock news with deduplication.
   - Applies rule based or structured LLM classification (via Gemini) to classify sentiment and impact while preserving raw text.
   - Emits a clear `is_official_filing` flag so the UI can separate verified primary documents from inferred opinions.

3. **`InstitutionalContextService`**:
   - Fetches official daily FII and DII cash turnover reports published at the end of each trading session.
   - Ingests daily bulk and block deal files from the exchange repository.
   - Labels all records with their exact reporting date and a mandatory warning note indicating delayed context.

4. **`ExplainableAnalysisService`**:
   - Invocable by the scanner engine when a setup forms, or on demand via `GET /api/v1/intelligence/analysis/:symbol`.
   - Aggregates technical indicators, market regime, sector momentum, news events, and institutional disclosures.
   - Evaluates deterministic risk gates:
     - Gate 1: Invalidation level is present and below entry for longs (above for shorts).
     - Gate 2: Net reward to risk ratio >= 1.5 after standard charges (₹20 per leg).
     - Gate 3: Extension check (stock price is within 1.5 ATR of 20 EMA).
     - Gate 4: Feed health check (feed latency < 5 seconds and zero missing candles).
   - Compiles list of positive evidence points and contradictory evidence points.
   - Returns complete analysis object and records snapshot in Supabase.

### API Surface

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/intelligence/context` | GET | Current market regime, advance decline ratio, sector relative strength |
| `/api/v1/intelligence/news` | GET | Recent corporate filings and news for a symbol or market wide |
| `/api/v1/intelligence/institutional` | GET | Latest FII and DII net cash figures and recent bulk deal disclosures |
| `/api/v1/intelligence/analysis/:symbol` | GET | Detailed explainable analysis snapshot including risk gates and evidence points |

### User Interface Surface (Completed)

The user interface components have already been implemented to the Tactical Precision Terminal standard:

1. **News and Regulatory Filings Page (`apps/web/app/dashboard/news/page.tsx`)**:
   - 3 telemetry summary cards: Total Ingested Events, Official Disclosures (100% Provenance), and High Impact Flagged Events.
   - Filter bar: All Events, Official Disclosures, High Impact, Linked Active Setups, and text search.
   - Event timeline with confirmed source facts callout, language model interpretation disclaimer, and risk embargo lockout notices.
   - Detail inspection drawer with clock skew telemetry, extracted material terms, and direct link to Signal Analysis.

2. **Market Intelligence Overview (`apps/web/app/dashboard/intelligence/page.tsx`)**:
   - 4 top macro tiles: Broad Market Regime (Regime 01), NSE Advance/Decline Breadth Bar, Nifty 50 Non-Tradable Benchmark Reference, and India VIX Volatility Gauge.
   - Panel A: NSE Sector Relative Strength & Alpha Matrix tracking Metals, Auto, Bank, FMCG, IT, and Realty.
   - Panel B: Live disclosures timeline with fact vs inferred model segregation.
   - Right deck: Institutional flow context and Data Provenance Registry with compliance notice.

3. **Stock Analysis Page (`apps/web/app/dashboard/analysis/[symbol]/page.tsx`)**:
   - Multi pane workspace embedding interactive technical chart, Explainable Evidence Card (Categories A, B, C, D), Deterministic Six Risk Gate Matrix, and Contradictory Invalidation Factors.
   - One click JSON audit record download.

## Build plan

The build is sliced using the Tracer Bullet approach, focusing on delivering the backend intelligence services to feed the completed UI:

- [x] **Slice 1: Database Schemas and Supabase Migration**
  - [x] Create Supabase migration with the 5 intelligence tables (`market_context_snapshots`, `news_and_events`, `institutional_flows`, `bulk_block_deals`, `evidence_snapshots`) (AC-14).
  - [x] Add row level security policies and indexes on timestamps and symbol columns.
- [x] **Slice 2: Market Breadth and Sector Relative Strength Service**
  - [x] Implement `MarketBreadthService` in `apps/backend/src/intelligence/` (AC-1, AC-2).
  - [x] Aggregate advance to decline ratio and VWAP participation from streaming quote ticks in memory.
  - [x] Compute sector relative alpha versus Nifty 50 benchmark.
- [x] **Slice 3: Corporate Filings and Financial News Ingestion Service**
  - [x] Implement `OfficialFilingsAndNewsService` in `apps/backend/src/intelligence/` (AC-3, AC-4).
  - [x] Ingest NSE and BSE corporate announcement RSS feeds with publication and ingestion timestamp tracking.
  - [x] Implement deduplication and classify sentiment and impact direction.
- [x] **Slice 4: Institutional Activity and Bulk Deals Service**
  - [x] Implement `InstitutionalContextService` in `apps/backend/src/intelligence/` (AC-6, AC-7).
  - [x] Ingest daily FII and DII cash turnover reports and bulk deal disclosures with explicit delayed EOD flags.
- [x] **Slice 5: Explainable Analysis Engine & Deterministic Safety Gates**
  - [x] Implement `ExplainableAnalysisService` in `apps/backend/src/intelligence/` (AC-8, AC-9, AC-10, AC-12).
  - [x] Evaluate the 6 deterministic safety gates and generate structured positive versus contradictory evidence snapshots.
- [x] **Slice 6: IntelligenceController and SSE Event Dispatching**
  - [x] Implement `IntelligenceController` exposing `/context`, `/news`, `/institutional`, and `/analysis/:symbol` (AC-15).
  - [x] Connect live intelligence events (`intelligence:regime`, `intelligence:news`, `signal:evidence`) to the `/api/v1/scanner/stream` SSE stream.
- [x] **Slice 7: Frontend Hook Integration and Verification**
  - [x] Wire custom hooks (`useMarketIntelligence`, `useNewsFilings`, `useExplainableAnalysis`) into the completed UI pages.
  - [x] Verify with unit tests in backend and frontend.

## Consequences

- The application delivers explainable, transparent reasoning for every setup, empowering the trader with clear facts rather than black box predictions.
- Market breadth is calculated without additional external API costs by leveraging ticks already streamed for watched stocks.
- Primary exchange filings and delayed institutional disclosures provide valuable context while avoiding regulatory and licensing traps.
- Traders can quickly verify why a setup was rejected, reinforcing disciplined trading behavior.

## Follow-up

- Monitor exchange RSS and news endpoint latency to calibrate polling intervals.
- Calibrate the minimum sample size threshold (currently thirty occurrences) once sufficient historical setup data accumulates.
