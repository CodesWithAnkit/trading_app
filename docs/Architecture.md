# Intraday Stock Tracker — Project Architecture

**Status:** Foundation architecture  
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
| Scanner worker | Always-on server with fixed public IP | Angel One login, live market-data feed, candle aggregation, strategy evaluation, alert lifecycle. | Protected; Angel One secrets remain here. |
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
- Calculates long and short setup metrics, planned levels, confidence, and expiry.
- Persists signals and feed health to Supabase.
- Can invalidate/expire signals; it cannot place, modify, or cancel broker orders.

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
| Governance | audit_events, strategy_versions, feed_health |

## 6. Security model

- Keep Angel One secrets exclusively in the scanner worker's secret store; rotate/revoke them if exposed.
- Restrict the worker's database role to required scanner tables and operations.
- Use Supabase Auth and row-level security for browser-facing data.
- Validate every journal mutation on the server; do not trust client-calculated P&L.
- Log state changes with timestamps and actor identity.
- Encrypt data in transit and rely on managed encryption at rest.
- Treat all real-time feed failures as visible product states: delayed, stale, disconnected, or simulated.

## 7. Deployment environments

| Environment | Purpose | Live broker data |
| --- | --- | --- |
| Local development | UI, simulated scanner data, schema work | No |
| Preview | Review UI and journal changes with generated/sample data | No |
| Production dashboard | Vercel-hosted dashboard | Reads production records only |
| Production worker | Fixed-IP server during market hours | Yes, market data only |

## 8. Delivery sequence

1. Create Next.js dashboard foundation and Supabase schema with generated signals.
2. Implement authenticated trade journal, audit records, and calculation service.
3. Build historical/simulated scanner and signal-performance views.
4. Provision fixed-IP worker, add Angel One market-data-only client, and test feed health.
5. Enable live scanner after paper-tracking validation.

## 9. Explicit exclusions

The architecture must not add Angel One endpoints for:

- order placement, amendment, cancellation, or status management;
- funds, holdings, portfolio, or position retrieval;
- automatic trade execution of any kind.
