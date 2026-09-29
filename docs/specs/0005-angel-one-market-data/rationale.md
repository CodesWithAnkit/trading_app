## Context

Phase 3 established the backend infrastructure (NestJS worker, Supabase) using a simulated market data feed. To move towards a live trading assistant, we must ingest real market data. However, this introduces challenges: maintaining a stable WebSocket connection, processing high-throughput ticks without overwhelming the database, isolating secrets from the client, and ensuring the strategy engine only acts on high-quality, verified data. A strict boundary must be maintained to prevent accidental live trade execution, as this product remains a decision-support application (paper strategy with manual execution).

## Options considered

### Option 1: Official SmartAPI SDK
Use the `smartapi-javascript` SDK provided by Angel One.
**Pros**:
- Handles the intricacies of authentication, session management, and feed token generation automatically.
- Maintained by the broker, receiving updates for protocol changes.
**Cons**:
- SDK quality and type definitions can sometimes be inconsistent.

### Option 2: Raw REST / WebSocket Implementation
Implement raw API calls directly using `ws` or `socket.io-client`.
**Pros**:
- Total control over the WebSocket implementation and reduced dependency bloat.
**Cons**:
- High maintenance burden to manually handle feed tokens, ping/pong heartbeats, and binary tick parsing.

## Decision

**Chosen option**: Option 1: Official SmartAPI SDK

We will integrate the official `smartapi-javascript` SDK within a dedicated `AngelOneMarketDataProvider` class that implements a generic internal `MarketDataProvider` interface. This shields the rest of the application from vendor-specific types.

## Rationale

The official SDK minimizes the risk of protocol parsing errors and reduces the boilerplate needed for authentication and feed token management. By wrapping the SDK in a strict adapter boundary (`AngelOneMarketDataProvider`), we mitigate the risk of SDK implementation details leaking into our domain logic. The data model decision to discard raw ticks and only persist aggregated candles significantly reduces Supabase storage costs and write contention, prioritizing the strategy engine's need for clean, aggregated intervals.

## References

**Project sources**:
- Phase 4 PRD (`docs/Phase 4 — Angel One SmartAPI Market Data Integration.md`)
- Architecture guidelines and conventions in `AGENTS.md`
