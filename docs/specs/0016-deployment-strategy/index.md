# 0016. Deploy Monorepo Web and Backend on Free Tier Infrastructure

**Date**: 2026-10-14
**Status**: Accepted

## Summary

This decision defines a reliable, zero cost deployment strategy for your trading monorepo. Your Next.js web application will deploy to the Vercel Hobby tier, while your NestJS backend will deploy to a Render free web service using a multi stage container. Because the backend maintains active Angel One WebSockets and streams market data, a free external pinger will keep the service awake during trading hours while allowing it to sleep at night to stay within free tier limits.

## Decision

**Chosen option**: Option 1: Vercel for Frontend plus Render for Backend with Market Hours Heartbeat

The Next.js web application will deploy to Vercel Hobby tier, while the NestJS backend scanner will deploy to a Render free web service packaged via Docker. A free external heartbeat will keep the backend awake only during Indian stock market hours (09:00 to 15:35 IST on weekdays), allowing it to sleep overnight and on weekends to remain well below the monthly 750 hour quota.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Web Hosting | Vercel Hobby Tier | Native Next.js 16 support, automated git deployments, global edge delivery, free custom domain SSL |
| Backend Hosting | Render Free Web Service | Supports persistent WebSockets for Angel One and Server Sent Events without extra charges |
| Container Runtime | Multi Stage Dockerfile | Isolates NestJS build in monorepo context, guarantees identical Node 20 environment |
| Persistence | Supabase Free Project | Managed Postgres with pooling, 500 megabyte storage, built in authentication, zero server maintenance |
| Market Hours Heartbeat | Cron Job Org (Free) | Sends automated pings to the health endpoint every 10 minutes between 09:00 and 15:35 IST on weekdays |
| Monorepo Config | Render Blueprint (render.yaml) | Declares backend service settings, build filters, and environment variables in code |
| Routing Proxy | Next.js Rewrites | Proxies `/api/:path*` directly to Render backend, avoiding browser cross origin obstacles |

## Deployment architecture

### 1. Backend Packaging

A production multi stage Dockerfile at `apps/backend/Dockerfile` packages the NestJS application:

- **Build stage**: Uses `node:20-alpine`, copies root workspace package files and `apps/backend`, installs production and development dependencies, and runs `npm run build -w apps/backend`.
- **Production stage**: Copies compiled output (`dist/`), production `node_modules`, and package manifests, setting `NODE_ENV=production` and exposing the port defined by `process.env.PORT`.

### 2. Render Blueprint (`render.yaml`)

A root blueprint file defines the web service:

- **Type**: `web`
- **Environment**: `docker`
- **DockerfilePath**: `apps/backend/Dockerfile`
- **Docker Context**: `.` (monorepo root)
- **Plan**: `free`
- **Health Check Path**: `/health`
- **Build Filter Paths**: `apps/backend/**`, `package.json`, `package-lock.json`, `.dockerignore`
- **Required Environment Variables**:
  - `SUPABASE_URL`: Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase server role key
  - `ANGEL_ONE_API_KEY`: Angel One SmartAPI developer key
  - `ANGEL_ONE_CLIENT_ID`: Trading account client identification
  - `ANGEL_ONE_PASSWORD`: Trading account PIN or password
  - `ANGEL_ONE_TOTP_SECRET`: Base32 secret for dynamic two factor authentication
  - `GEMINI_API_KEY`: Google Gemini API key for stock prediction insights
  - `PORT`: Automatically assigned by Render (defaults to 10000)

### 3. Frontend Web Configuration (Vercel)

- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous Supabase key
  - `BACKEND_API_URL`: Render backend URL (example `https://trading-backend.onrender.com`)
  - `NEXT_PUBLIC_SCANNER_STREAM_URL`: (Optional) Direct URL for SSE stream if bypass is preferred
- **Next.js Rewrite Update** (`apps/web/next.config.ts`):
  Destination reads `process.env.BACKEND_API_URL || 'http://localhost:3001'` dynamically.

### 4. Heartbeat Configuration (Cron Job Org)

- **Target URL**: `https://trading-backend.onrender.com/health`
- **Schedule**: `*/10 3-10 * * 1-5` (UTC time, which translates to 08:30 to 15:30 IST on Monday through Friday)
- **Method**: HTTP GET
- **Expected Status**: 200 OK

## Consequences

**Positive**:
- Zero recurring hosting costs for both web and backend services
- Angel One WebSocket feed remains stable and continuous throughout all trading hours
- Clean separation of concerns between static edge frontend and stateful backend scanner
- Declarative infrastructure via `render.yaml` enables reproducible deployments

**Negative / tradeoffs**:
- Outside market hours (evenings and weekends), initial API requests will encounter a cold start delay of roughly 50 seconds while Render spins up the container
- Dependent on third party external pinging service to maintain backend wakefulness during market hours
- Monthly free hours cap (750 hours) means running 24/7 continuous pings is not recommended if other services share the account

**Neutral**:
- Requires adding and maintaining a production Dockerfile in the repository
- Secrets must be entered in two separate dashboards (Vercel for web and Render for backend)

## Follow-up

- [x] Create production Dockerfile supporting the monorepo structure
- [x] Add `render.yaml` blueprint file to root directory with backend build filters
- [x] Update `apps/web/next.config.ts` to read `BACKEND_API_URL` environment variable for rewrites
- [ ] Create Render Web Service and verify live health check response
- [ ] Deploy `apps/web` to Vercel and verify live connection
- [ ] Schedule heartbeat cron on cron-job.org
