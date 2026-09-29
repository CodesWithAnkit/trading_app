# 0004. NestJS Backend

**Date**: 2026-09-28
**Status**: Proposed

## Summary

This spec supersedes the previous plan of using Next.js API routes and a raw Node.js script. We will build a unified **NestJS Backend** in `apps/backend` that handles both the REST API endpoints and the continuous background Scanner Worker for market data ingestion and strategy execution. The Next.js frontend will be moved to `apps/web` to complete the monorepo structure.

## Requirements

- **AC-1**: Scaffold a new NestJS application in `apps/backend` and migrate the existing Next.js app to `apps/web`.
- **AC-2**: The NestJS app must expose REST API endpoints for the frontend to consume (signals, trades, journal entries).
- **AC-3**: The NestJS app must run a continuous background service (using NestJS lifecycle hooks and scheduler) to manage the Angel One WebSocket connection and run the strategy engine.
- **AC-4**: NestJS must connect to Supabase PostgreSQL using the `@supabase/supabase-js` client.
- **AC-5**: The strategy engine in `packages/strategy-engine` must be consumable by both `apps/web` and `apps/backend`.

## Decision

**Chosen option**: Unified NestJS Backend + Next.js Frontend Monorepo
**Implementation skills**: nestjs, typescript

We decided to use NestJS because it provides a robust, opinionated structure capable of handling both HTTP requests and long-running background tasks (market data streaming). This completely decouples the heavy processing from the Next.js frontend and avoids the pitfalls of running WebSockets inside serverless Next.js API routes.

## Build plan

1. [ ] Move the existing Next.js application into `apps/web` and set up NPM Workspaces in the root `package.json`.
2. [ ] Scaffold a new NestJS application in `apps/backend` using `@nestjs/cli`.
3. [ ] Delete the temporary `apps/scanner` folder and migrate its code (AngelOne Auth, Socket, Pipeline) into a dedicated NestJS Module (`ScannerModule`) running as a background service.
4. [ ] Create a `SupabaseModule` in NestJS to wrap the `@supabase/supabase-js` client and provide it for dependency injection.
5. [ ] Create API Controllers in NestJS to expose the `/api/v1/` endpoints for signals, trades, and journal entries, replacing the planned Next.js API routes.
6. [ ] Update `apps/web` (Next.js) to call the new NestJS backend API instead of local mock repositories.

## Consequences

**Positive**:
- Single backend application handles all business logic, database access, and background jobs.
- Clean standard monorepo structure (`apps/web`, `apps/backend`, `packages/strategy-engine`).
- NestJS dependency injection makes testing and modularizing the scanner and API much easier.

**Negative / tradeoffs**:
- Replaces the simple Next.js API route model with a heavier framework.
- Requires learning and adhering to NestJS conventions (Controllers, Providers, Modules).

## Follow-up

- Configure CORS and authentication guards in NestJS to securely communicate with the Next.js frontend.
- Define a deployment strategy for the NestJS app (e.g., Docker container on a VPS or AWS ECS) to ensure the fixed IP requirement for Angel One.
