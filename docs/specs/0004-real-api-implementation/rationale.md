## Context

The Intraday Stock Tracker currently uses UI mocks and local data storage. As the product transitions to production, it requires persistence for signals, journal entries, P&L, audit history, and strategy snapshots. A robust and secure backend architecture must replace these mocks while preserving the existing UI and repository contracts. The system needs to support a deterministic, stateless strategy engine and handle continuous market data scanning without exposing broker credentials to the browser or burdening the web UI with long-running connection management.

## Options considered

### Option 1: Retaining mock/local data
Continued use of local or mocked data for the application.
**Pros**:
- Zero additional infrastructure or operational overhead.
**Cons**:
- Insufficient for a production application needing persistence, consistency, and audit history.

### Option 2: A different BaaS (Backend as a Service)
Migrating to an alternative BaaS provider instead of Supabase.
**Pros**:
- Could offer similar persistence and authentication capabilities.
**Cons**:
- The current architecture is already designed around Supabase (PostgreSQL, Auth, RLS, realtime capabilities), making a switch unnecessary churn without a clear benefit.

### Option 3: A custom backend
Building a fully custom backend service (e.g., Node.js/Express, Go, or Python) to handle all API needs.
**Pros**:
- Maximum flexibility and control over API logic and database interactions.
**Cons**:
- Introduces significant operational work for authentication, authorization, realtime updates, and API hosting, duplicating capabilities Supabase already provides.

### Option 4: Scanner inside Next.js/Vercel
Running the market data scanner within the Next.js application on Vercel.
**Pros**:
- Single application runtime to deploy and monitor.
**Cons**:
- Continuous market-data scanning requires a persistent worker and a fixed outbound IP for the broker connection, which serverless environments like Vercel do not support well.

## Rationale

The chosen architecture splits the system into three primary components: a Next.js API, Supabase PostgreSQL, and a separate Scanner Worker. This approach ensures a clear separation of responsibilities. The Next.js API acts as the secure, browser-facing boundary. Supabase handles persistent application state, user-scoped data, and authentication out of the box, avoiding the overhead of a custom backend. The separate Scanner Worker isolates the continuous market data consumption and deterministic strategy engine, providing the necessary persistent connection and fixed IP for the Angel One integration. This separation explicitly keeps Angel One credentials away from the browser and decouples market data processing from web request serving.

## References

**Project sources**:
- `docs/REAL_API_IMPLEMENTATION_PLAN.md`
