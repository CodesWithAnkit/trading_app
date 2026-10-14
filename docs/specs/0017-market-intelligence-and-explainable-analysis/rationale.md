# 0017. Market Intelligence and Explainable Analysis: Rationale

## Context

The Intraday Stock Tracker started as a pure technical price action scanner using VWAP, momentum, and mean reversion rules. However, pure technical signals frequently fail when broad market sentiment turns sharply, when heavy sector rotation occurs, or when unexpected corporate filings hit the wire.

Intraday Stock Tracker Requirements v1.1 expands the system scope to provide comprehensive decision support. The product never executes broker orders directly, so its primary value is providing transparent, trustworthy evidence that helps the trader make high quality manual decisions.

To achieve this without degrading system reliability or generating misleading confidence, we must address three architectural challenges:
1. How to compute broad market regime and sector strength efficiently without overwhelming external broker rate limits.
2. How to ingest news and corporate filings while preserving strict provenance, avoiding false claims, and clearly distinguishing official facts from language model inference.
3. How to balance positive momentum factors with contradictory risk evidence and deterministic safety gates so that NO TRADE is supported as a normal, valid outcome.

## Options considered

### Option 1: Modular Ingestion Workers with In Memory Market Breadth and Supabase Evidence Cache (Selected)

We compute broad market breadth directly in memory from our existing Angel One WebSocket feed covering all 230 liquid F&O stocks. A scheduled ingestion worker in the NestJS backend polls official exchange filings and licensed news, caching them in Supabase. When a setup forms, an explainable analysis service aggregates technical indicators, market regime, news, and institutional flows, runs deterministic risk gates, and saves an immutable evidence snapshot.

**Pros**:
- Zero additional market data API calls or costs because market breadth reuses already streamed ticks.
- Full provenance and auditability because every factor and rule version is captured in an immutable snapshot.
- Fast, non blocking UI delivery backed by cached Supabase records.
- Deterministic risk gates act as a reliable circuit breaker regardless of news sentiment.

**Cons**:
- Requires managing background polling workers and deduplication logic in the NestJS application.

### Option 2: Heavy Python Microservice with Custom Sentiment and Prediction Pipelines

Build a separate FastAPI Python microservice running specialized financial NLP models (e.g. FinBERT) and complex statistical regression models, communicating with NestJS over gRPC or REST.

**Pros**:
- Access to specialized Python quantitative and NLP libraries.

**Cons**:
- Introduces significant infrastructure complexity, dual language stacks, extra hosting requirements, and higher operational overhead.
- Overkill for personal decision support where official announcements and rule based risk gates provide the primary edge.

### Option 3: Client Side Ad Hoc Assembly

The browser fetches news, market breadth, and technical signals directly from various public endpoints and stitches them together in React client code.

**Pros**:
- Minimal backend changes.

**Cons**:
- Exposes API keys or violates rate limits on client browsers.
- No central audit trail or historical reproducible snapshot of what evidence existed at signal creation.
- Fragile cross origin requests and high client battery consumption.

## Rationale

We selected Option 1 because it directly aligns with our established TypeScript monorepo architecture (Next.js web, NestJS backend, and Supabase Postgres). Reusing the 230 streamed F&O stocks for market breadth provides accurate NSE cash equity breadth at zero marginal cost. 

Furthermore, storing immutable evidence snapshots in Supabase ensures that every manual trade can later be audited against the exact evidence and risk gates that existed at entry time. The deterministic risk gates ensure that a setup cannot pass unless invalidation stop, net reward to risk, and feed health criteria are satisfied, preventing emotional or overexcited trading.

## References

1. Intraday Stock Tracker Requirements v1.1 (`docs/Intraday_Stock_Tracker_Requirements_v1.1/PRD_updated.md`)
2. Foundation Architecture v1.1 (`docs/Intraday_Stock_Tracker_Requirements_v1.1/Architecture_updated.md`)
3. Design System Foundations (`docs/DESIGN_SYSTEM.md` and `design/stitch_intraday_stock_tracker_dashboard (4)/DESIGN.md`)
4. Stitch UI Implementation Plan (`docs/STITCH_UI_IMPLEMENTATION_PLAN.md`)
5. Spec 0009 Real Stock Analysis (`docs/specs/0009-real-stock-analysis/index.md`)
6. Spec 0015 AI Stock Prediction (`docs/specs/0015-ai-stock-prediction/index.md`)
