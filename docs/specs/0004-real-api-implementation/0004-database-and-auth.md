# 0004. Database and Auth (Child Spec)

## Summary
Defines the Supabase PostgreSQL database schema and Supabase Auth integration for the Intraday Stock Tracker. Establishes the core tables (instruments, signals, trades, etc.) and the security rules (Row Level Security and environment variable hygiene) required to transition from mock data to a production backend.

## Requirements

**Acceptance criteria**:
- **AC-1**: All user-facing tables (`trades`, `trade_legs`, `audit_events`, `user_settings`) enforce Row Level Security scoped to the authenticated user.
- **AC-2**: Core analytical and system tables (`signals`, `signal_metrics`, `signal_status_history`, `strategy_versions`) treat snapshots and lifecycle histories as immutable.
- **AC-3**: Angel One credentials and Supabase service role keys are strictly excluded from client-facing environments.

## Decision
**Chosen option**: Supabase PostgreSQL with Supabase Auth
The system will use Supabase Auth for user authentication and PostgreSQL for data persistence. The schema includes tables for instruments, signals, trades, audit events, feed health, and strategy configurations. Immutability rules will be applied to snapshots, metrics, and audit events.

## Feature design

**Data model sketch**:
- `instruments`: `id`, `symbol`, `exchange`, `instrument_token`, `status`, `last_price`
- `signals`: `id`, `instrument_id`, `direction`, `setup_family`, `status`, `entry_low/high`, `target_1/2`, `snapshot_json`
- `signal_metrics`: Immutable feature snapshot, `strategy_version`, `config_hash`
- `signal_status_history`: `signal_id`, `from_status`, `to_status`, `event_time`
- `trades`: `id`, `user_id`, `signal_id`, `direction`, `status`, `gross_realized_pnl`, `net_realized_pnl`
- `trade_legs`: `trade_id`, `quantity`, `price`, `timestamp`, `net_pnl` (immutable legs)
- `audit_events`: `user_id`, `entity_type`, `event_type`, `payload`
- `feed_health`: `source`, `status`, `latency_ms`
- `user_settings`: `user_id`, `risk_budget`, `display_preferences`
- `strategy_versions`: `strategy_id`, `version`, `config_json`

**Key invariants**:
- Signal snapshots, signal metrics, signal status history, trade legs, audit events, and strategy versions must be strictly immutable once written.
- Every browser-facing query must be scoped to the authenticated user using Supabase RLS policies.

**Security model**:
- Uses Supabase Auth.
- Row Level Security (RLS) ensures users can only access their own trades, journal entries, and settings.
- Secrets (`ANGEL_ONE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) are explicitly excluded from the browser.

## Build plan
1. Initialize Supabase project and define local migration for core tables (`instruments`, `signals`, etc.), satisfies **AC-2**
2. Define local migration for user-specific tables (`trades`, `trade_legs`, `user_settings`, `audit_events`), satisfies **AC-1**
3. Configure Row Level Security (RLS) policies for user isolation, satisfies **AC-1**
4. Integrate Supabase Auth within the Next.js app, satisfies **AC-1**, **AC-3**

## Consequences

**Positive**:
- Secure authentication and isolated user data with RLS.
- Robust audit trail and immutable historical data for strategy snapshots.
**Negative / tradeoffs**:
- Requires discipline with migrations to maintain schema consistency.
