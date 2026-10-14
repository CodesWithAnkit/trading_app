# Market Intelligence Subsystem

Context and conventions for the backend market intelligence, official filings, institutional flows, and explainable analysis subsystem.

## Governing Specs
- [0017 Market Intelligence and Explainable Analysis](../../../docs/specs/0017-market-intelligence-and-explainable-analysis/index.md)
- [0018 Reusable Components and API Integration Architecture](../../../docs/specs/0018-reusable-components-and-api-integration/index.md)

## Purpose and Key Services
The intelligence module delivers explainable setup evidence, broad market breadth, corporate disclosures, and delayed institutional flow reporting to the trading terminal.

1. `MarketBreadthService`: Computes market wide advance to decline ratio, VWAP participation, and sector relative alpha from live streaming quotes in memory.
2. `OfficialFilingsAndNewsService`: Ingests and persists corporate disclosures and news with provenance tracking.
3. `InstitutionalContextService`: Provides delayed End of Day FII and DII cash turnover reports and bulk deal filings with mandatory delay warnings.
4. `ExplainableAnalysisService`: Evaluates six deterministic pre trade safety gates and compiles positive supporting evidence versus contradictory friction factors.
5. `IntelligenceController`: Exposes endpoints under `/api/v1/intelligence` for `/context`, `/news`, `/institutional`, and `/analysis/:symbol`.

## Key Conventions and Constraints
- External News API Integration Status: Real production third party news APIs and live exchange RSS polling are not yet integrated. The subsystem currently operates using Supabase cache persistence, verified exchange seed datasets, and synthetic surveillance notices.
- Zero Automated Broker Execution: Intelligence and explainable analysis never submit automated orders. All trades require manual user confirmation through the terminal.
- Feed Health and Safety Gating: If market feed latency exceeds five seconds, the terminal triggers a prominent NO TRADE banner and disables order entry.
- Delayed Context Separation: Institutional flows must always carry the delayed regulatory disclaimer to prevent mistaking historical filings for live order book flow.

## Verification and Tests
Run unit tests for this subsystem:
```bash
npm test -- src/intelligence
```

_Drafted by /sync from the introducing change, worth a quick human pass._
