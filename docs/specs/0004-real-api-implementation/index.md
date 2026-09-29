# 0004. Real API Implementation

**Date**: 2026-09-28
**Status**: in-progress

## Summary

This spec outlines the transition from local mock data to a production backend for the Intraday Stock Tracker. It adopts a unified NestJS Backend for secure API communication and a continuous Scanner Worker, with Supabase for authentication and PostgreSQL data persistence. The Next.js frontend will be moved to `apps/web` to form a proper monorepo.

## Structure

This umbrella spec coordinates the real API rollout. Child specs (to be created as needed):
- `0004-database-and-auth.md`: Database schema, Supabase Auth, and RLS rules
- `0004-database-and-auth.md`: Database schema, Supabase Auth, and RLS rules
- `0004-nestjs-backend.md`: Unified NestJS application handling REST API endpoints, continuous market data, strategy execution, and Angel One integration

## Decision

**Chosen option**: Next.js UI + NestJS Backend + Supabase PostgreSQL

The architecture uses a unified NestJS application to manage the continuous Angel One market data connection, deterministic strategy engine, and to expose REST API endpoints. Supabase provides PostgreSQL storage, Auth, and RLS. The Next.js application serves only as the frontend UI.

**Implementation skills**: (No community skills documented for nextjs/supabase yet)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | End-to-end type safety between UI, API, and strategy engine |
| Framework | Next.js (Frontend) / NestJS (Backend) | Next.js for UI, NestJS for a unified API and background worker |
| Primary DB | Supabase (PostgreSQL) | Provides persistence, Auth, RLS, and realtime capabilities out of the box |
| Auth | Supabase Auth | Native integration with PostgreSQL and RLS for secure, user-scoped data |
| Background jobs | NestJS Scheduler / Lifecycle Hooks | Required for continuous market data connection and fixed IP for broker |
| Observability | TBD (Standard Logging) | Required for monitoring worker health, feed latency, and API errors |

## Consequences

**Positive**:
- Persistent, consistent data for signals, trades, and journal entries.
- Clear security boundary: broker credentials and market data logic are fully isolated from the browser.
- Deterministic strategy execution runs independently of user interaction.

**Negative / tradeoffs**:
- Increased infrastructure complexity with two distinct application runtimes (Next.js and NestJS).
- The NestJS Backend requires its own deployment, monitoring, health checks, and secret management.
- Additional latency introduced as data travels from NestJS to Supabase, and then to the Next.js UI.

**Neutral**:
- Requires deliberate API design handling authentication, validation, and idempotency in NestJS.
- Synchronization concerns around signal lifecycle and feed health between the backend, database, and UI.

## Follow-up

- [ ] Create child specs for database schema, API contracts, and scanner worker implementation.
- [ ] Determine hosting solution and CI/CD pipeline for the standalone Scanner Worker.
- [ ] Define observability and logging stack for monitoring Scanner Worker health.

Reasoning and options: see `rationale.md`.
