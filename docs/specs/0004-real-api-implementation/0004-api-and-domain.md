# 0004. API and Domain (Child Spec)

**Status**: Superseded by [0004-nestjs-backend.md](0004-nestjs-backend.md)
## Summary
Defines the Next.js API routes and Domain Layer that interface between the frontend UI and the Supabase database. Establishes the API contracts for Signals, Trades, Journal, Audit, Settings, and Market Status, ensuring that all database interactions occur through secure, authenticated domain services rather than direct client-side queries.

## Requirements

**Acceptance criteria**:
- **AC-1**: All API endpoints authenticate requests using Supabase Auth and validate inputs server-side.
- **AC-2**: Trade entry validations (risk limits, duplicate entries, price/quantity checks) and P&L calculations occur exclusively server-side.
- **AC-3**: The existing UI repository interfaces (`SignalRepository`, `TradeRepository`, etc.) are implemented by adapters that call these Next.js API routes.

## Decision
**Chosen option**: Next.js API Routes + Domain Services
The system will route all browser requests through Next.js API routes (`/api/v1/*`). These routes will delegate to a Domain Layer (Domain Services) which interacts with the Supabase Database. The UI will not query Supabase directly.

## Feature design

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/signals` | GET | `direction`, `status`, `cursor` | `data`, `meta` | bearer | 401 |
| `/api/v1/signals/:id` | GET | `id` | `signal`, `metrics` | bearer | 404, 401 |
| `/api/v1/trades` | POST | `signalId`, `entryPrice`, `quantity` | Trade record | bearer | 400, 401, 403 |
| `/api/v1/trades/validate-entry` | POST | `signalId`, `price`, `quantity` | `valid`, `risk` | bearer | 400, 401 |
| `/api/v1/trades/:id/exits` | POST | `quantity`, `exitPrice`, `reason` | Trade leg | bearer | 400, 401, 404 |
| `/api/v1/journal` | GET | `from`, `to`, `cursor` | `data`, `summary` | bearer | 401 |
| `/api/v1/trades/:id/audit` | GET | `id` | Audit events | bearer | 404, 401 |
| `/api/v1/settings` | PATCH | `risk_budget`, `display` | Updated settings | bearer | 400, 401 |
| `/api/v1/market/status` | GET | none | `status`, `latencyMs` | bearer | 401 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Trade Entry | Server-Side P&L | Calculated server-side `(exitPrice - entryPrice) * quantity` |
| Signal List | Ranked Signals | Sorted according to the strategy engine contract |
| Market Status | Feed Health | Polled from `feed_health` table |

**Key invariants**:
- The browser never computes authoritative P&L or validates its own risk limits.
- Internal strategy functions (`runSimulation`, `calculateConfidence`) are not exposed as unrestricted APIs.

**Security model**:
- All `/api/v1/*` routes demand a valid Supabase Auth session token.
- API inputs are validated rigorously using DTOs before being passed to the Domain Layer.

## Build plan
1. Implement Domain Services mapping to the UI repository contracts (`SignalRepository`, `TradeRepository`, etc.), satisfies **AC-3**
2. Scaffold and implement the Next.js API routes (`/api/v1/*`), injecting the Domain Services, satisfies **AC-1**
3. Implement strict server-side P&L and risk validation logic in the `TradeService`, satisfies **AC-2**
4. Update frontend repository adapters to consume the new Next.js API instead of local mock data, satisfies **AC-3**

## Consequences

**Positive**:
- Clear boundary between UI logic and authoritative business logic.
- UI components do not need to manage database connections or complex Supabase logic.
**Negative / tradeoffs**:
- Additional latency routing requests through Next.js instead of querying Supabase directly from the client.
