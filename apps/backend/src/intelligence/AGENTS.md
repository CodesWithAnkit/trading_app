# Market Intelligence Subsystem

Context and conventions for the backend market intelligence, official filings, institutional flows, and explainable analysis subsystem.

## Governing Specs
- [0017 Market Intelligence and Explainable Analysis](../../../docs/specs/0017-market-intelligence-and-explainable-analysis/index.md)
- [0018 Reusable Components and API Integration Architecture](../../../docs/specs/0018-reusable-components-and-api-integration/index.md)
- [0024 Real News Ingestion](../../../docs/specs/0024-real-news-ingestion/index.md): `news/` ingestion pipeline, admin fetch, cancel and pause controls

## Purpose and Key Services
The intelligence module delivers explainable setup evidence, broad market breadth, corporate disclosures, and delayed institutional flow reporting to the trading terminal.

1. `MarketBreadthService`: Computes market wide advance to decline ratio, VWAP participation, and sector relative alpha from live streaming quotes in memory.
2. `OfficialFilingsAndNewsService`: Read only access to stored real news (excludes seed rows and rows without `source_item_id`); a symbol view also includes `MARKET` items.
2a. `NewsIngestionService` (`news/`): fetch runs (manual via admin API, weekday cron in IST), one adapter per source, symbol mapping, classification rules then Gemini (daily cap via the `news_gemini_take` RPC) then a Low / Neutral default, dedup on `(source, source_item_id)`, run log in `news_fetch_runs`.
3. `InstitutionalContextService`: Provides delayed End of Day FII and DII cash turnover reports and bulk deal filings with mandatory delay warnings.
4. `ExplainableAnalysisService`: Evaluates six deterministic pre trade safety gates and compiles positive supporting evidence versus contradictory friction factors.
5. `IntelligenceController`: Exposes endpoints under `/api/v1/intelligence` for `/context`, `/news`, `/institutional`, and `/analysis/:symbol`.

## Key Conventions and Constraints
- News sources (spec 0024): NSE and BSE are read only from official exchange RSS feeds set in `NEWS_NSE_FEED_URLS` / `NEWS_BSE_FEED_URLS` (empty means skipped); market RSS from `NEWS_RSS_FEEDS`; Alpha Vantage only when `NEWS_ALPHAVANTAGE_ENABLED=true`. Every request goes through `FeedReader` in `news/news.adapters.ts`: only `User-Agent` (`NEWS_USER_AGENT`) and an XML `Accept`, no cookies, browser headers, or exchange website JSON APIs. A refusal (401, 403, 429, HTML page) is recorded as `skipped` and never worked around.
- Company names for symbol matching come only from the committed `news/company-names.json` (`{ "SYMBOL": "Name" | ["Name", "Alias"] }`), read from the `src` folder at runtime.
- `per_source` skipped reasons are a fixed list (`SKIP` in `news.adapters.ts`); the web status line matches on them, so change both together.
- Zero Automated Broker Execution: Intelligence and explainable analysis never submit automated orders. All trades require manual user confirmation through the terminal.
- Feed Health and Safety Gating: If market feed latency exceeds five seconds, the terminal triggers a prominent NO TRADE banner and disables order entry.
- Delayed Context Separation: Institutional flows must always carry the delayed regulatory disclaimer to prevent mistaking historical filings for live order book flow.

## Verification and Tests
Run unit tests for this subsystem:
```bash
npm test -- src/intelligence
```

_Drafted by /sync from the introducing change, worth a quick human pass._
