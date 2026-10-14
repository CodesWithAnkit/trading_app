# Intraday Stock Tracker — Project Architecture

**Status:** Foundation architecture v1.1 — Market intelligence added  
**Applies to:** Phases 1–3 of the PRD

## 1. Architecture overview

The product is split into a web dashboard and an always-on scanner. This separation keeps the dashboard fast and easy to deploy on Vercel, while the scanner can maintain the persistent market-data connection and fixed outbound IP required by Angel One.

```text
Browser dashboard → Vercel / Next.js → Supabase
                                  ↑
Angel One SmartAPI → Fixed-IP scanner ┘
```

The browser has no Angel One credentials and never accesses broker-order endpoints. The scanner is market-data-only; it writes time-bound alerts and data freshness information to Supabase. The dashboard reads that data and records user-entered trade-journal actions.

## 2. Runtime components

| Component | Deployment | Responsibility | Trust boundary |
| --- | --- | --- | --- |
| Browser dashboard | User's browser | Displays alerts, signal plans, journal, notifications, and settings. | Public client; no secrets. |
| Next.js application | Vercel | Authenticated UI, server-side data access, validation, and API boundary. | Server-side application secrets only. |
| Scanner worker | Always-on server with fixed public IP | Angel One market-data session, candle aggregation, market/sector metrics, technical rules, setup lifecycle, and feed health. | Protected; Angel One secrets remain here. |
| Intelligence ingestion worker | Server-side scheduled/queue worker | Fetches approved news, official announcements, macro releases, and institutional disclosures; normalizes, deduplicates, timestamps, and classifies items. | Server-side credentials only; source terms and rate limits enforced. |
| Analysis/evidence service | Server-side module/worker | Joins timestamp-safe market context, news, institutional disclosures, technical metrics, rule versions, and risk gates into explainable analysis snapshots. | No broker order APIs; deterministic risk gates remain authoritative. |
| Supabase | Managed cloud service | Authentication, PostgreSQL, real-time updates, storage of alerts/trades/settings/audit records. | Row-level security and server access policies. |
| Angel One SmartAPI | External service | Market data and session authentication. | Accessed only by the scanner worker. |

## 3. Responsibilities and boundaries

### Browser dashboard

- Shows active and historical signals, open trades, P&L, and connection freshness.
- Sends authenticated requests to the Next.js application for journal actions and settings.
- Uses browser notifications only after user permission.
- Never receives Angel One API key, client ID, MPIN, TOTP secret, session token, or worker credentials.

### Next.js application

- Renders the responsive dashboard.
- Validates requests to create/update manual trade entries and exits.
- Reads permitted data from Supabase using user-scoped authorization.
- Publishes UI-safe data changes for the dashboard.
- Never implements broker order, funds, holdings, position, or portfolio operations.

### Scanner worker

- Maintains the authenticated Angel One market-data session during market hours.
- Builds one-minute and five-minute candles from subscribed live ticks.
- Filters for eligible/liquid NSE cash-equity instruments.
- Calculates long and short setup metrics, planned levels, technical evidence, and expiry.
- Creates explainable evidence snapshots with positive/negative factors, source freshness, rule version, and risk-gate outcomes.
- Suppresses qualification when critical feeds are stale, inputs are missing, or risk controls fail.
- Persists signals and feed health to Supabase.
- Can invalidate/expire signals; it cannot place, modify, or cancel broker orders.

### Intelligence ingestion and analysis

- Only ingest sources approved for use and documented in a source registry (provider, data type, license/terms, rate limits, retention, expected latency, and outage behaviour).
- Prefer official NSE/BSE disclosures, company investor-relations releases, RBI and other relevant official macro/regulatory publications for primary facts. Use an approved licensed financial-news provider for broader news coverage only after terms and costs are reviewed.
- Ingest official FII/FPI/DII publications and bulk/block deal disclosures as dated context. Do not represent these as live institutional positions.
- Store source timestamp, ingestion timestamp, source URL/identifier, affected symbols/sectors, reporting period, classification, and classification confidence. Keep the raw-source reference or legally permitted excerpt for auditability.
- Deduplicate syndicated articles and retain links to original sources. Separate source facts from model-generated summary, sentiment, or impact inference.
- Use time-aware joins: a backtest or historical signal may only use news and disclosures that were available at the decision timestamp.
- Treat sentiment as derived evidence, not ground truth. Keep news sentiment, market breadth, price/volume behaviour, institutional disclosures, and technical setup as separate components.
- The deterministic risk layer can reject a setup regardless of sentiment or composite quality.

### Supabase

- Hosts application data and authentication.
- Enforces row-level security for user-facing records.
- Stores immutable alert-plan snapshots so later analysis can compare plan vs. result.
- Stores audit records for manual journal and signal state transitions.

## 4. Data flow

### Market scanning

1. The scanner worker authenticates with Angel One SmartAPI using server-side secrets.
2. Angel One streams allowed market-data updates to the worker.
3. The worker aggregates ticks, calculates rules, and creates or updates a signal.
4. The worker writes signal, metric, expiry, and health records to Supabase.
5. The dashboard retrieves authorized changes through the Next.js application and renders them to the user.

### Manual trade journal

1. The user chooses **I entered** or **I exited** on the dashboard.
2. The browser sends the proposed journal record to the authenticated Next.js application.
3. The application validates required data and records the trade or trade leg in Supabase.
4. Supabase stores the audit event and the dashboard refreshes its P&L and status views.

## 5. Database domains

| Domain | Principal records |
| --- | --- |
| Market universe | instruments, eligibility, liquidity metadata |
| Signals | signals, signal_metrics, planned_levels, expiry/status history |
| Trade journal | trades, trade_legs, charges, notes |
| User configuration | notification preferences, risk preferences, charge estimates |
| Governance | audit_events, strategy_versions, feed_health, source_registry, source_health |
| Market intelligence | news_events, disclosure_events, market_context_snapshots, sector_context_snapshots, evidence_snapshots |
| Validation | backtest_runs, backtest_metrics, paper_signal_outcomes, probability_calibration_reports |

## 6. Security model

- Keep Angel One secrets exclusively in the scanner worker's secret store; rotate/revoke them if exposed.
- Restrict the worker's database role to required scanner tables and operations.
- Use Supabase Auth and row-level security for browser-facing data.
- Validate every journal mutation on the server; do not trust client-calculated P&L.
- Log state changes with timestamps and actor identity.
- Encrypt data in transit and rely on managed encryption at rest.
- Treat all feed failures as visible product states: delayed, stale, disconnected, incomplete, or simulated.
- Initial live-feed stale threshold: no expected update for 5 seconds during market hours; tune after observing provider behaviour and documenting the service expectations.
- Show source publication time and ingestion time for news; an initial 30-minute window may rank intraday-impact news as fresh, while older relevant items remain visible as context. These are configurable product defaults, not provider guarantees.
- Official filings, macro releases, and institutional disclosures use publication/reporting-period freshness, not assumed real-time freshness.
- If critical price data is stale or a required input has unknown provenance, suppress actionable setup qualification. A source outage must not silently reuse old data as live.
- Store timestamps in UTC and render in the user's local timezone; preserve source timezone and original timestamp when available. Detect clock skew and duplicate/out-of-order events.
- Version all feature calculations, classification prompts/models, rules, thresholds, and cost assumptions.

## 7. Deployment environments

| Environment | Purpose | Live broker data |
| --- | --- | --- |
| Local development | UI, simulated scanner data, schema work | No |
| Preview | Review UI and journal changes with generated/sample data | No |
| Production dashboard | Vercel-hosted dashboard | Reads production records only |
| Production worker | Fixed-IP server during market hours | Yes, market data only |

## 8. Explainability, risk gates, and backtesting

### Explainability contract

Every analysis snapshot should preserve:

- decision timestamp and exact market-data snapshot/candle versions;
- stock, sector, and broad market context;
- relevant news/events with source and publication/ingestion times;
- institutional disclosures with reporting period and publication time;
- sentiment components and their lookback windows;
- technical setup inputs and rule version;
- positive evidence, contradictory evidence, missing inputs, and source freshness;
- planned entry, invalidation/stop, targets, estimated charges/slippage, and net reward/risk;
- each passed/failed risk gate and the final qualification or no-trade reason.

Do not make a language model the authority for numerical levels, risk limits, trade eligibility, or performance claims. Models may summarize/classify content; deterministic code validates data and applies risk rules.

### Risk gates

- Critical price feed stale/disconnected, missing provenance, or incomplete candle where a close is required → suppress setup.
- Instrument ineligible, liquidity/spread thresholds failed, or event dislocation outside tested rules → reject or mark context-only.
- Stop/invalidation absent, risk exceeds configured limit, net reward/risk below configured threshold, or daily risk limit reached → reject.
- Contradictory signals should be displayed, not hidden by a composite score.
- “NO TRADE” is a normal outcome and must be represented in logs and validation metrics.
- Exact risk thresholds remain configuration decisions; never silently assume they are user-approved.

### Backtesting integrity

- Use point-in-time market and news data; no future announcements, revised values, or completed candles may leak into a historical decision.
- Use chronological development/validation/test splits and walk-forward evaluation across market regimes.
- Model charges, taxes where applicable, spread, slippage, latency, missed fills, gaps, and conservative intrabar target/stop ordering.
- Track win rate alongside net expectancy, profit factor, maximum drawdown, average win/loss, loss streaks, costs, sample size, regime breakdown, and probability calibration.
- Compare candidate rules against a fixed baseline on identical out-of-sample periods; reject improvements that only exist in-sample or disappear after costs.
- Keep paper trading separate from backtest results and record frozen strategy version, source version, and evaluation window.

## 9. Delivery sequence

1. Create Next.js dashboard foundation and Supabase schema with generated signals, source provenance, source health, and explainability fields.
2. Implement authenticated trade journal, audit records, and calculation service.
3. Build technical historical/simulated scanner and a realistic baseline backtest.
4. Add official announcement/macro ingestion and timestamped market/sector context.
5. Add an approved licensed news provider and official institutional-disclosure ingestion; classify with traceable evidence and source links.
6. Build explainable analysis views and deterministic risk/no-trade gates.
7. Provision fixed-IP worker, add Angel One market-data-only client, and test freshness, gaps, reconnects, and feed-health states.
8. Run chronological out-of-sample and walk-forward tests with realistic costs, then paper-track frozen rules.
9. Enable live analysis only after source reliability and validation gates are met; all Angel One execution remains manual.

## 10. Explicit exclusions

The architecture must not add Angel One endpoints for:

- order placement, amendment, cancellation, or status management;
- funds, holdings, portfolio, or position retrieval;
- automatic trade execution of any kind.
