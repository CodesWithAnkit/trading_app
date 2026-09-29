# Intraday Stock Tracker --- Real API & Data Integration Plan

**Phase:** API + Real Data Integration\
**Date:** 2026-09-28\
**Status:** Planned

## 1. Objective

Replace the completed UI mock repositories with real authenticated APIs
and persistent Supabase data while preserving the existing UI and
repository contracts.

Target:

``` text
Browser UI
  ↓ HTTPS
Next.js API
  ↓
Supabase PostgreSQL
  ↑
Scanner Worker
  ↑
Deterministic Strategy Engine
  ↑
Angel One Market Data
```

The product remains a manual decision-support/journal application. It
must never place, modify, or cancel broker orders, and it must never
expose Angel One credentials to the browser.

## 2. Architecture

### Browser

Responsible for:

-   dashboard;
-   signals;
-   signal detail;
-   trades;
-   journal;
-   settings;
-   submitting manual journal actions.

The browser never talks directly to Angel One.

### Next.js API

Responsible for:

-   authentication;
-   authorization;
-   request validation;
-   signal reads;
-   trade/journal mutations;
-   audit records;
-   settings;
-   market/feed status;
-   UI-safe DTOs.

### Scanner Worker

Responsible for:

-   Angel One authentication;
-   market-data connection;
-   tick ingestion;
-   1-minute/5-minute candles;
-   feed health;
-   strategy execution;
-   signal lifecycle;
-   signal persistence.

Angel One is market-data-only.

### Strategy Engine

Must remain:

-   deterministic;
-   stateless;
-   side-effect-free;
-   network-free;
-   broker-independent.

It consumes canonical candles + strategy configuration and produces
signal snapshots/outcomes.

## 3. Delivery phases

``` text
API-01 Database
API-02 Authentication
API-03 Domain/repositories
API-04 API contracts
API-05 Signal APIs
API-06 Trade/journal APIs
API-07 Audit/settings/feed APIs
API-08 Replace UI mocks
API-09 API/E2E testing
API-10 Strategy integration
API-11 Scanner worker
API-12 Angel One market-data
API-13 Realtime
API-14 Security/production hardening
```

Do not implement this as one uncontrolled change.

------------------------------------------------------------------------

# API-01 --- Supabase Database

Create reproducible migrations.

## Core tables

### instruments

``` text
id
symbol
exchange
name
instrument_token
isin
status
is_eligible
eligibility_reason
last_price
last_volume
last_value_traded
created_at
updated_at
```

First release: NSE cash-equity instruments only.

### signals

``` text
id
instrument_id
symbol
exchange
direction
setup_family
strategy_version
config_hash
status
created_at
expires_at
activated_at
invalidated_at
entered_at
skipped_at
current_price
entry_low
entry_high
stop_price
target_1
target_2
trailing_guidance
confidence_score
confidence_band
rationale
snapshot_json
created_at
updated_at
```

### signal_metrics

Store the immutable feature/score snapshot:

``` text
price_action_score
rvol_score
trend_score
volatility_score
liquidity_score
risk_reward_score
rvol
trend
volatility
liquidity
risk_reward
feature_snapshot_json
strategy_version
config_hash
created_at
```

### signal_status_history

``` text
id
signal_id
from_status
to_status
reason
event_time
actor_type
metadata
```

### trades

``` text
id
user_id
signal_id
symbol
exchange
direction
status
entry_time
average_entry_price
original_quantity
remaining_quantity
gross_realized_pnl
estimated_charges
net_realized_pnl
holding_duration_seconds
notes
created_at
updated_at
```

### trade_legs

``` text
id
trade_id
leg_type
quantity
price
timestamp
gross_pnl
estimated_charges
net_pnl
exit_reason
target_reference
created_at
```

Entry, partial exit, and full exit are immutable legs.

### audit_events

``` text
id
user_id
entity_type
entity_id
event_type
actor_type
payload
created_at
```

### feed_health

``` text
id
source
status
last_tick_at
last_candle_at
latency_ms
message
metadata
created_at
```

Statuses:

``` text
LIVE
DELAYED
STALE
DISCONNECTED
SIMULATED
```

### user_settings

``` text
user_id
notification_enabled
risk_budget
risk_per_trade
charge_estimate_config
display_preferences
created_at
updated_at
```

### strategy_versions

``` text
id
strategy_id
version
config_hash
config_json
status
created_at
```

## Database rules

Immutable:

-   signal snapshots;
-   signal metrics;
-   signal status history;
-   trade legs;
-   audit events;
-   strategy versions.

Add foreign keys, constraints, indexes and RLS.

------------------------------------------------------------------------

# API-02 --- Authentication

Use Supabase Auth.

Never expose:

``` text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
ANGEL_ONE_API_KEY
ANGEL_ONE_CLIENT_ID
ANGEL_ONE_PASSWORD
ANGEL_ONE_TOTP_SECRET
ANGEL_ONE_SESSION_TOKEN
```

to client code.

Every browser-facing query must be scoped to the authenticated user.

RLS is defense in depth; server-side authorization is still required.

------------------------------------------------------------------------

# API-03 --- Domain Layer

Use:

``` text
Database
 ↓
Repository
 ↓
Domain Service
 ↓
DTO
 ↓
API Route
```

Do not expose database rows directly.

Keep existing UI repository interfaces and implement real adapters
behind them.

Recommended domains:

``` text
SignalRepository
TradeRepository
JournalRepository
AuditRepository
SettingsRepository
MarketStatusRepository
```

------------------------------------------------------------------------

# API-04 --- Signal API

## GET /api/v1/signals

Filters:

``` text
direction
setup
status
confidenceMin
symbol
limit
cursor
```

Return:

``` json
{
  "data": [],
  "nextCursor": null,
  "meta": {
    "marketStatus": "LIVE",
    "lastUpdatedAt": "..."
  }
}
```

Active signals must be ranked according to the strategy ranking
contract.

## GET /api/v1/signals/:id

Return:

``` text
signal
plan
confidence
metrics
historicalOutcome
lifecycle
feedStatus
```

## POST /api/v1/signals/:id/skip

Record the lifecycle event and audit event.

## POST /api/v1/signals/:id/watch

Record the user's watch action.

## GET /api/v1/signals/:id/history

Return immutable lifecycle history.

Never recalculate historical signals using today's configuration. Always
retain the original strategy version and config hash.

------------------------------------------------------------------------

# API-05 --- Trade API

## GET /api/v1/trades

Support:

``` text
status
symbol
direction
from
to
cursor
limit
```

## GET /api/v1/trades/:id

Return:

``` text
trade
originalSignal
plannedLevels
tradeLegs
pnl
charges
audit
```

## POST /api/v1/trades

Input:

``` json
{
  "signalId": "signal-id",
  "entryTime": "...",
  "entryPrice": 1452.8,
  "quantity": 100,
  "notes": "Manual entry"
}
```

Server validates:

-   authenticated user;
-   signal exists;
-   signal is actionable;
-   signal has not expired;
-   quantity \> 0;
-   price \> 0;
-   direction consistency;
-   risk limits;
-   duplicate entry.

Transaction:

``` text
validate
→ create trade
→ create entry leg
→ mark signal ENTERED
→ create audit event
```

------------------------------------------------------------------------

# API-06 --- Risk Validation

## POST /api/v1/trades/validate-entry

Input:

``` text
signalId
price
quantity
```

Output:

``` json
{
  "valid": false,
  "risk": {
    "riskPerShare": 14.8,
    "totalRisk": 7400,
    "configuredRiskBudget": 3000
  },
  "safeQuantity": 40,
  "reason": "RISK_BUDGET_EXCEEDED"
}
```

The browser may preview risk, but the server is authoritative.

------------------------------------------------------------------------

# API-07 --- Exit API

## POST /api/v1/trades/:id/exits

Input:

``` json
{
  "quantity": 50,
  "exitPrice": 1468,
  "exitTime": "...",
  "reason": "TARGET_1",
  "notes": "Partial exit"
}
```

Validate:

``` text
trade belongs to user
trade is OPEN/PARTIAL
quantity > 0
quantity <= remaining quantity
price > 0
timestamp valid
```

Transaction:

``` text
validate
→ create exit leg
→ calculate P&L
→ calculate charges
→ update remaining quantity
→ update trade status
→ create audit event
```

If exit quantity equals remaining quantity, status becomes `CLOSED`.

------------------------------------------------------------------------

# API-08 --- Server-Side P&L

Long:

``` text
(exitPrice - entryPrice) × quantity
```

Short:

``` text
(entryPrice - exitPrice) × quantity
```

Then:

``` text
netPnl = grossPnl - estimatedCharges
```

For partial exits calculate each leg independently.

Never trust client P&L.

------------------------------------------------------------------------

# API-09 --- Journal API

## GET /api/v1/journal

Filters:

``` text
from
to
symbol
direction
setup
status
search
cursor
limit
```

Return:

``` json
{
  "data": [],
  "summary": {
    "netPnl": 0,
    "grossPnl": 0,
    "tradeCount": 0,
    "winRate": 0,
    "profitFactor": 0
  },
  "nextCursor": null
}
```

This powers the existing journal UI.

------------------------------------------------------------------------

# API-10 --- Audit API

## GET /api/v1/trades/:id/audit

Return immutable:

``` text
trade created
entry
partial exits
full exit
corrections
notes
status changes
```

This powers the existing Audit Drawer.

------------------------------------------------------------------------

# API-11 --- Settings API

## GET /api/v1/settings

## PATCH /api/v1/settings

Support:

``` text
notification preference
risk budget
risk-per-trade
charge configuration
display preferences
```

Validate everything server-side.

------------------------------------------------------------------------

# API-12 --- Market Status API

## GET /api/v1/market/status

Example:

``` json
{
  "status": "LIVE",
  "source": "ANGEL_ONE",
  "lastTickAt": "...",
  "lastCandleAt": "...",
  "latencyMs": 230,
  "marketSession": "OPEN"
}
```

The UI must not infer live status from HTTP success.

------------------------------------------------------------------------

# API-13 --- Strategy Engine Integration

Keep `packages/strategy-engine` independent.

``` text
packages/
  strategy-engine/
    config/
    candles/
    eligibility/
    features/
    structure/
    setups/
    plan/
    confidence/
    lifecycle/
    outcomes/
    simulation/
    calibration/
```

It must have zero dependency on:

``` text
HTTP
Supabase
Angel One
WebSocket
database
credentials
```

It accepts canonical candles + StrategyConfig and returns
signals/outcomes.

## Important

Do NOT expose:

``` text
runSimulation
calculateConfidence
evaluateOutcome
```

as unrestricted browser APIs.

They are internal strategy functions.

If calibration endpoints are required later, make them
authenticated/admin-only.

------------------------------------------------------------------------

# API-14 --- Scanner Worker

Create a separate worker application:

``` text
apps/
  web/
  scanner/

packages/
  strategy-engine/
  domain/
  contracts/
```

Pipeline:

``` text
Angel One
 ↓
Tick validation
 ↓
1m candle builder
 ↓
5m aggregation
 ↓
Feed quality gate
 ↓
Eligibility
 ↓
Strategy Engine
 ↓
Signal lifecycle
 ↓
Supabase
```

The strategy engine never receives raw Angel One objects.

------------------------------------------------------------------------

# API-15 --- Angel One Boundary

Allowed only in the scanner:

-   authentication;
-   market-data subscription;
-   tick ingestion;
-   reconnect;
-   market status;
-   feed health.

Forbidden:

-   order placement;
-   order modification;
-   order cancellation;
-   order status;
-   funds;
-   holdings;
-   portfolio;
-   automatic execution.

There must be no browser path to Angel One.

------------------------------------------------------------------------

# API-16 --- Signal Persistence

When the strategy engine produces a signal:

``` text
SignalSnapshot
 ↓
validate
 ↓
persist signal
 ↓
persist metrics
 ↓
persist planned levels
 ↓
persist lifecycle event
```

Persist:

``` text
strategyVersion
configHash
symbol
direction
setupFamily
createdAt
expiresAt
entry
stop
T1
T2
trailing
rawFeatures
confidence
riskReward
eligibility
inputs
```

Use a transaction.

------------------------------------------------------------------------

# API-17 --- Deduplication

Signal identity should be derived from the strategy contract:

``` text
instrument
direction
setupFamily
strategyVersion
referenceLevel
```

Hash a canonical representation.

Back it with a database uniqueness constraint where possible.

------------------------------------------------------------------------

# API-18 --- Signal Expiry

Enforce:

``` text
expiresAt - createdAt <= 30 minutes
```

The worker/server controls expiration.

The browser countdown is presentation only.

------------------------------------------------------------------------

# API-19 --- Realtime

After REST is stable:

``` text
Scanner
 ↓
Supabase
 ↓
Realtime
 ↓
Next.js/UI
```

Use realtime for:

-   new signals;
-   signal lifecycle changes;
-   feed health;
-   journal updates.

REST/database remains the source of truth.

------------------------------------------------------------------------

# API-20 --- UI Migration

Keep the existing contracts:

``` text
SignalRepository
TradeRepository
JournalRepository
```

Replace:

``` text
MockSignalRepository
MockTradeRepository
MockJournalRepository
```

with:

``` text
ApiSignalRepository
ApiTradeRepository
ApiJournalRepository
```

React components should not directly call fetch.

Target:

``` text
Component
 ↓
Hook
 ↓
Repository
 ↓
API
```

The UI should retain the existing Stitch implementation.

------------------------------------------------------------------------

# API-21 --- Error Contract

All APIs use:

``` json
{
  "error": {
    "code": "SIGNAL_EXPIRED",
    "message": "This signal is no longer actionable.",
    "details": {}
  },
  "requestId": "..."
}
```

Codes include:

``` text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
SIGNAL_EXPIRED
SIGNAL_ALREADY_ENTERED
SIGNAL_NOT_ACTIONABLE
RISK_BUDGET_EXCEEDED
INVALID_QUANTITY
INVALID_EXIT_QUANTITY
TRADE_ALREADY_CLOSED
STALE_DATA
FEED_DISCONNECTED
CONFLICT
INTERNAL_ERROR
```

Never return raw database or stack errors.

------------------------------------------------------------------------

# API-22 --- Idempotency

Protect:

``` text
POST /api/v1/trades
POST /api/v1/trades/:id/exits
POST /api/v1/signals/:id/skip
```

against duplicate requests.

Use an idempotency key or equivalent request identity.

------------------------------------------------------------------------

# API-23 --- Transactions

Entry transaction:

``` text
validate signal
→ validate risk
→ create trade
→ create entry leg
→ update signal
→ audit
```

Exit transaction:

``` text
validate trade
→ create exit leg
→ calculate P&L
→ update trade
→ audit
```

Signal transaction:

``` text
signal
→ metrics
→ levels
→ lifecycle
```

------------------------------------------------------------------------

# API-24 --- Pagination and Performance

Use cursor pagination from the beginning.

Required for:

-   signals;
-   trades;
-   journal;
-   audit.

Do not return entire histories.

Add indexes for common filters:

``` text
signals(status, created_at)
signals(symbol, created_at)
trades(user_id, created_at)
trades(user_id, status)
trade_legs(trade_id, timestamp)
audit_events(entity_type, entity_id, created_at)
```

------------------------------------------------------------------------

# API-25 --- Observability

Every API request records:

``` text
requestId
userId
route
duration
status
errorCode
```

Scanner records:

``` text
feed connection
last tick
last candle
reconnect count
strategy runs
signals generated
signals rejected
signals expired
errors
```

Never log credentials or tokens.

------------------------------------------------------------------------

# API-26 --- Testing

## Unit

Test:

-   validation;
-   repositories;
-   P&L;
-   risk validation;
-   state transitions;
-   authorization;
-   pagination.

## Integration

Test:

``` text
API → service → repository → Supabase
```

## Strategy

Preserve deterministic tests:

``` text
same candles + same config + same version
=
same output
```

## Playwright

Test:

``` text
Dashboard
→ Signal Detail
→ I entered
→ Risk validation
→ Open Trade
→ Partial Exit
→ Full Exit
→ Journal
→ Audit
```

Also test:

``` text
Live
→ Delayed
→ Disconnected
```

------------------------------------------------------------------------

# API-27 --- Migration Strategy

Do not delete mocks immediately.

Use:

``` text
MockRepository
ApiRepository
```

behind the same interfaces.

Development can support:

``` text
DATA_MODE=mock
DATA_MODE=api
```

After real API validation, remove the mock production path while
retaining mocks as test fixtures.

------------------------------------------------------------------------

# API-28 --- Environment Variables

Client-safe:

``` text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only:

``` text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Scanner-only:

``` text
ANGEL_ONE_API_KEY
ANGEL_ONE_CLIENT_ID
ANGEL_ONE_PASSWORD
ANGEL_ONE_TOTP_SECRET
ANGEL_ONE_FEED_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

No secret may use `NEXT_PUBLIC_`.

Never commit `.env`.

------------------------------------------------------------------------

# API-29 --- Implementation Order

Implement exactly in this sequence:

1.  Supabase migrations/schema.
2.  Supabase Auth.
3.  Domain models/repositories.
4.  DTOs/validation.
5.  Signal APIs.
6.  Trade APIs.
7.  Journal APIs.
8.  Audit APIs.
9.  Settings/risk APIs.
10. Market-status API.
11. API repository adapters.
12. Connect UI to APIs.
13. API/integration tests.
14. Integrate deterministic strategy engine.
15. Historical/simulated scanner.
16. Scanner worker foundation.
17. Angel One market-data integration.
18. Persist live signals.
19. Realtime updates.
20. Production security/observability.

Do not start with Angel One.

------------------------------------------------------------------------

# Definition of Done

## Database

-   [ ] Supabase schema exists.
-   [ ] Migrations are reproducible.
-   [ ] RLS works.
-   [ ] Immutable records are protected.
-   [ ] Constraints and indexes exist.

## API

-   [ ] Authentication works.
-   [ ] Authorization works.
-   [ ] Signal APIs work.
-   [ ] Trade APIs work.
-   [ ] Journal APIs work.
-   [ ] Audit APIs work.
-   [ ] Settings APIs work.
-   [ ] Feed-health API works.
-   [ ] Pagination works.
-   [ ] Error contract is consistent.
-   [ ] Idempotency works.

## UI

-   [ ] Mock repositories replaced by API adapters.
-   [ ] Dashboard reads real data.
-   [ ] Signal detail reads real data.
-   [ ] Entry persists a real trade.
-   [ ] Partial exit persists.
-   [ ] Full exit persists.
-   [ ] Journal reflects persisted data.
-   [ ] Audit drawer reads real events.

## Strategy

-   [ ] Strategy remains deterministic.
-   [ ] Config hash is persisted.
-   [ ] Strategy version is persisted.
-   [ ] Signal snapshots are immutable.
-   [ ] No-look-ahead tests pass.
-   [ ] Historical outcome evaluation works.

## Scanner

-   [ ] Separate worker exists.
-   [ ] Canonical candles are produced.
-   [ ] Feed health is persisted.
-   [ ] Strategy runs without network dependencies.
-   [ ] Signal lifecycle is persisted.

## Angel One

-   [ ] Credentials exist only in worker secrets.
-   [ ] Market data only.
-   [ ] No order endpoints.
-   [ ] No funds/holdings/portfolio endpoints.
-   [ ] No automatic execution.

## Production

-   [ ] No secret leakage.
-   [ ] Request IDs exist.
-   [ ] Error monitoring exists.
-   [ ] Logs are sanitized.
-   [ ] Playwright E2E passes.
-   [ ] Cross-user access tests pass.

------------------------------------------------------------------------

# Final Target

``` text
Browser
  ↓
Authenticated Next.js API
  ↓
Supabase
  ↑
Scanner Worker
  ↑
Deterministic Strategy Engine
  ↑
Angel One Market Data
```

The user flow remains:

``` text
Signal detected
 ↓
Tracker displays plan
 ↓
User decides
 ↓
User executes manually in Angel One
 ↓
"I entered"
 ↓
Tracker journals entry
 ↓
"I exited"
 ↓
Tracker calculates/stores outcome
```

There is intentionally no:

``` text
Tracker → Angel One → Place Order
```

------------------------------------------------------------------------

# Coding-Agent Prompt

Implement the Real API + Data Integration phase for the Intraday Stock
Tracker.

Before coding, inspect:

1.  PRD.md
2.  Architecture.md
3.  DESIGN_SYSTEM.md
4.  the completed UI implementation
5.  STRATEGY_SPEC.md
6.  STRATEGY_DECISIONS.md
7.  STRATEGY_CONFIG.md
8.  decision `0001`
9.  existing database/Supabase setup
10. existing repository interfaces and mock repositories

Plan first, then execute.

Do not redesign the UI.

Do not remove the existing repository interfaces.

Implement real repository adapters behind those interfaces.

Execute in this order:

1.  Supabase migrations/schema.
2.  Authentication.
3.  Domain/repositories.
4.  DTOs/validation.
5.  Signal APIs.
6.  Trade APIs.
7.  Journal APIs.
8.  Audit APIs.
9.  Settings/risk APIs.
10. Market-status API.
11. API repository adapters.
12. UI integration.
13. Integration/E2E tests.
14. Strategy-engine integration.
15. Scanner worker.
16. Angel One market-data integration.
17. Realtime.
18. Production hardening.

Do not implement broker order placement, modification, cancellation,
funds, holdings, portfolio, or broker positions.

Keep Angel One credentials exclusively in the scanner worker.

Keep the strategy engine deterministic, stateless and network-free.

Do not expose runSimulation, calculateConfidence, or evaluateOutcome as
unrestricted browser APIs.

Never trust client-calculated P&L, risk, or trade state.

Use transactions for trade entry, trade exit and signal persistence.

Use immutable signal snapshots, signal metrics, trade legs, audit events
and strategy versions.

Add idempotency protection to journal mutations.

Use cursor pagination.

Use consistent API error codes and request IDs.

Maintain the existing UI appearance and UX.

At every stage run relevant tests before proceeding.

Do not report completion until this real flow works:

``` text
UI
→ authenticated API
→ Supabase
→ persisted signal/trade
→ UI refresh
```

Then verify:

``` text
Angel One market data
→ scanner
→ canonical candles
→ strategy engine
→ signal snapshot
→ Supabase
→ API
→ UI
```

Finally run Playwright for:

``` text
Dashboard
→ Signal Detail
→ I entered
→ Risk Validation
→ Open Trade
→ Partial Exit
→ Full Exit
→ Journal
→ Audit
```

Also verify:

-   no Angel One secret reaches browser code;
-   no broker order endpoint exists;
-   no funds/holdings/portfolio API exists;
-   strategy engine has zero network dependencies;
-   identical strategy inputs produce identical outputs;
-   signal snapshots are immutable;
-   P&L is server-side;
-   RLS prevents cross-user access;
-   pagination works;
-   duplicate mutations cannot create duplicate trade legs.

Return a final implementation report with:

-   schema;
-   migrations;
-   endpoints;
-   repositories;
-   authentication;
-   authorization;
-   strategy integration;
-   scanner;
-   Angel One boundary;
-   tests;
-   Playwright results;
-   security checks;
-   environment variables;
-   remaining limitations;
-   next step for paper tracking.
