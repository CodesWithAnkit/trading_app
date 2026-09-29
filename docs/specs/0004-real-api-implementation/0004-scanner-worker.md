# 0004. Scanner Worker (Child Spec)

**Status**: Superseded by [0004-nestjs-backend.md](0004-nestjs-backend.md)
## Summary
Defines a standalone Node.js/TypeScript worker application responsible for continuous Angel One market data ingestion, tick processing, and deterministic strategy execution. The worker connects to the broker, aggregates 1-minute and 5-minute candles, runs the strategy engine, and persists signals to Supabase, ensuring the web UI never directly handles market data or broker credentials.

## Requirements

**Acceptance criteria**:
- **AC-1**: The worker maintains a persistent connection to Angel One for market data subscription and tick ingestion, handling disconnects and reconnections automatically.
- **AC-2**: Incoming ticks are validated, aggregated into canonical 1-minute and 5-minute candles, and passed through a feed quality gate before strategy execution.
- **AC-3**: The deterministic strategy engine runs on the aggregated candles and produces verifiable Signal Snapshots.
- **AC-4**: Valid signals, metrics, and lifecycle events are persisted to Supabase transactionally, while enforcing deduplication and expiry rules.
- **AC-5**: The worker never executes, modifies, or cancels broker orders (market-data only constraint).

## Decision
**Chosen option**: Standalone Node.js/TypeScript Worker Application
The scanner will be a dedicated Node.js/TypeScript process deployed alongside the Next.js app but running as a separate service. This architecture supports long-lived WebSocket connections to Angel One, requires a fixed outbound IP, and isolates the heavy processing of tick data and strategy execution from the web tier.

## Feature design

**Data model sketch**:
- Uses Supabase tables: `signals`, `signal_metrics`, `signal_status_history`, `feed_health`
- Angel One entities: Market-data ticks

**State transitions**:
- Ticks -> 1m candles -> 5m candles -> Feed Quality Gate -> Eligibility -> Strategy Engine -> Signal Snapshot
- Signal lifecycle: `CREATED` -> `EXPIRED` (controlled by worker if `expiresAt - createdAt > 30 minutes`)

**Value sourcing**:
| Action | Value produced | Source |
|---|---|---|
| Signal Snapshot | Signal Entry/Targets, Confidence | Strategy engine output based on live 1m/5m candles |
| Feed Health | Latency, Status (`LIVE`, `STALE`, etc.) | Worker tracking tick timestamps vs system time |
| Signal Identity | `configHash` | Hashed canonical representation of strategy config |

**Key invariants**:
- The strategy engine never receives raw Angel One objects; it only processes canonical candles.
- The worker is explicitly forbidden from placing, modifying, or cancelling orders, or checking funds and holdings.
- Realtime signals and feed health updates are pushed to Supabase, which the UI subscribes to via Supabase Realtime.

**Security model**:
- Angel One credentials (`ANGEL_ONE_API_KEY`, `ANGEL_ONE_PASSWORD`, etc.) exist exclusively in the worker environment and are never shared with the Next.js API or browser.
- The worker uses the `SUPABASE_SERVICE_ROLE_KEY` for secure backend access to the database.

## Build plan
1. [x] Scaffold the standalone `scanner` worker application within the monorepo (`apps/scanner`), satisfies **AC-1**
2. [x] Implement Angel One authentication, market data subscription, and reconnect logic, satisfies **AC-1**, **AC-5**
3. [x] Build the tick validation, 1m/5m candle aggregation, and feed quality gate pipeline, satisfies **AC-2**
4. [ ] Integrate the existing `strategy-engine` to consume the aggregated candles and produce signals, satisfies **AC-3**
5. [ ] Implement transactional persistence to Supabase (signals, metrics, levels, lifecycle) including deduplication logic, satisfies **AC-4**

## Consequences

**Positive**:
- Clear boundary for broker credentials and continuous market data ingestion.
- The web UI is completely decoupled from high-frequency tick processing.
**Negative / tradeoffs**:
- Requires dedicated deployment infrastructure capable of running persistent workers (e.g., Docker container on a VM/PaaS) rather than serverless functions.
- Complex state management for reconnects, stale feeds, and tick aggregation.
