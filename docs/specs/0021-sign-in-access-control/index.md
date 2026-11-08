# 0021. Sign In and Access Control

**Date**: 2026-11-06
**Status**: In Progress

## Summary

The app has no sign in today, so anyone who can reach the web app or the backend URL sees everything. This spec adds Supabase email and password sign in for invited users only. Every page and every API route then requires a signed in user, and the backtest lab ([0020](../0020-guru-strategy-backtest-lab/index.md)) additionally requires the admin role. The web sends the Supabase access token to the NestJS API, which checks it against Supabase's public keys.

## Requirements

**User stories**:
- As the owner, I want to sign in with my email and password so that only I (and people I invite) can use the app.
- As the owner, I want strangers unable to create accounts so that a leaked URL is harmless.
- As the admin, I want the backtest lab hidden from and refused to non admins.
- As a user, I want to reset a forgotten password by email.

**Acceptance criteria**:
- **AC-1**: `/login` signs in with email and password through Supabase Auth. A wrong password shows "Email or password is incorrect" without saying which one was wrong. Success redirects to `next` only if `new URL(next, origin).origin === origin` (path and query kept), else to `/dashboard`.
- **AC-2**: Public sign up is off. There is no sign up page, and Supabase project setting "Allow new users to sign up" is disabled. A sign up attempt through the API is refused by Supabase.
- **AC-3**: Every page except `/login`, `/forgot-password` and `/reset-password` redirects a visitor with no session to `/login?next=<original path>`, checked in `proxy.ts` (with `supabase.auth.getUser()`, writing refreshed cookies onto the response; matcher excludes `_next`, static files and `/api`) and again in the server layout with `getUser()`. The public paths live in one `lib/auth/publicPaths.ts`. The `next` value keeps the original query string.
- **AC-4**: Every NestJS route under `/api/v1/` returns 401 without a valid Supabase access token. `GET /health` and `GET /` stay public. Tokens are verified with `jose` `jwtVerify` against `SUPABASE_JWKS_URL`, pinning `issuer: ${SUPABASE_URL}/auth/v1`, `audience: 'authenticated'`, `algorithms: ['ES256','RS256']`, and `clockTolerance: 5`. At startup the backend refuses to boot if `SUPABASE_JWKS_URL` is not `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Only HTTP contexts are guarded (`context.getType() === 'http'`), and preflight `OPTIONS` requests pass through.
- **AC-5**: The web sends `Authorization: Bearer <access_token>` on every API call through one shared `apiFetch` helper. No component calls `fetch('/api/...')` or the backend host directly.
- **AC-6**: `GET /api/v1/scanner/stream` (SSE) authenticates with `?ticket=`, a random single use ticket from `POST /api/v1/auth/sse-ticket` (bearer auth, 30 s TTL, kept in memory, deleted on first use). The real access token never appears in a URL. The server ends the stream when the ticket's user token expires (`exp` stored at connect), and the web reconnects with a fresh ticket on `onerror` or at `exp` minus 60 s.
- **AC-7**: `AdminGuard` (used by spec 0020's `/api/v1/backtest/*`) returns 403 unless the user's `app_metadata.role` is `admin`. The role is read with `auth.admin.getUserById` using `SUPABASE_SERVICE_ROLE_KEY`, cached per user id for 60 s (both yes and no), so removing the role takes effect within a minute even for a token issued earlier. If the lookup fails, the guard returns 503 and never falls back to the token's own claims.
- **AC-8**: For non admins, the "Backtest Lab" nav link is not rendered, and visiting `/dashboard/backtest` redirects to `/dashboard` (server side, no flash).
- **AC-9**: "Forgot password" on `/login` sends a Supabase reset email. Its link (PKCE flow) goes to `/auth/confirm`, a route handler that calls `exchangeCodeForSession` and forwards to `/reset-password`, where a new password (min 10 characters) can be set. The page always says "If that email has an account, a reset link is on its way", whether or not the account exists. Invite emails use the same `/auth/confirm` route, so an invited user sets their first password on `/reset-password`. A user who is already signed in can also use it.
- **AC-10**: The session refreshes silently. `apiFetch` shares one in flight refresh across parallel calls. When a refresh fails, or an API call returns 401 after one retry with a refreshed token, the user is sent to `/login?next=<current path>`.
- **AC-11**: A "Sign out" item in the Topbar avatar menu ends the Supabase session and lands on `/login`.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 1: Supabase Auth with email and password, invite only, with the access token sent as a bearer header and verified in NestJS against Supabase's JWKS.

Recommended implementation calls (made here, not left to the build):
- **JWT verification**: `jose` (`createRemoteJWKSet` plus `jwtVerify`) on the backend. It's small, maintained, and caches keys. Runner up: `@supabase/supabase-js` `auth.getUser(token)`, which costs a network call per request.
- **Global guard**: an `AuthGuard` registered as `APP_GUARD`, with a `@Public()` decorator for `/` and `/health`. Runner up: per controller `@UseGuards`, which is easy to forget on a new controller.
- **Web session**: `@supabase/ssr` `createBrowserClient` in the client, `createServerClient` in `proxy.ts` and server components, following the Next 16 `proxy.ts` convention (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`). Proxy does the optimistic redirect, and the server layout does the real check.
- **Login page look**: built to the Stitch design system tokens in `globals.css`. It's one centered card, with no new design decisions.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase` (installed skill, SSR auth patterns)

## Feature design

**Data model sketch**: no new tables. Identity lives in Supabase `auth.users`. The role is `auth.users.raw_app_meta_data.role` (`'admin'` or absent), which only the service role can set, so users can't grant it to themselves.

**State transitions**: session: `signed_out → signed_in` (login) `→ refreshed` (silent, repeats) `→ signed_out` (sign out, refresh failure, or a 401 after a retry).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/health`, `/` | GET | none | status | public | none |
| `/api/v1/*` (all existing and new) | any | `Authorization: Bearer <jwt>` | unchanged | signed in | 401 missing, invalid or expired token |
| `/api/v1/auth/sse-ticket` | POST | bearer | `{ ticket, expiresIn: 30 }` | signed in | 401 |
| `/api/v1/scanner/stream` | GET (SSE) | `ticket` query (single use) | event stream, closed at token `exp` | ticket | 401 unknown, used or expired ticket |
| `/api/v1/backtest/*` (spec 0020) | any | bearer | per 0020 | admin | 401, 403 not admin |
| `/api/v1/me` | GET | bearer | `{ id, email, isAdmin }` | signed in | 401 |

The web pages are `/login`, `/forgot-password` and `/reset-password` (public), and everything else (signed in). Supabase Auth endpoints are called directly by `@supabase/ssr`.

**Value sourcing**:
| Action | Value | Source |
|---|---|---|
| verify token | signing keys | `SUPABASE_JWKS_URL` (env, already set) via `createRemoteJWKSet` |
| verify token | expected issuer | `${SUPABASE_URL}/auth/v1` (env) |
| verify token | user id | JWT `sub` |
| AdminGuard | role | `auth.admin.getUserById(sub).app_metadata.role`, service role client, cached 60 s |
| `/api/v1/me` | `isAdmin` | same as AdminGuard |
| web nav / page gate | is admin | server side `user.app_metadata.role` from `supabase.auth.getUser()` (the single source; `/me` mirrors it for clients) |
| sse-ticket | ticket | `crypto.randomUUID()`, in memory map `ticket → { sub, exp, createdAt }` |
| apiFetch | access token | `supabase.auth.getSession()` in the browser client (refreshes when expired) |
| login redirect | `next` | query param, accepted only if it starts with `/` and not `//` |
| reset email link | redirect URL | `${NEXT_PUBLIC_SITE_URL}/reset-password` |

**Key invariants**:
- No `/api/v1/*` handler runs without a verified token, except the routes marked `@Public()`.
- A `ticket` query is honoured only on routes marked `@SseAuth()`, once, within 30 s. No access token is ever read from a query string.
- `next` redirects never leave the site (open redirect guard).
- Error messages never reveal whether an email has an account.

**Security model**: invited users are signed in. Admins are signed in users with `app_metadata.role = 'admin'`. Password rules and rate limits are enforced by Supabase Auth (set minimum length 10 in the project). The service role key stays on the backend only. Tokens are never in URLs (fix: SSE tickets), and the Nest request logging does not log query strings. CORS is `app.enableCors({ origin: WEB_ORIGIN, allowedHeaders: ['Authorization','Content-Type'] })`. Internal callers: the NestJS scheduler runs in process and makes no HTTP self calls, and the CLIs use the service role directly against Supabase, so the guard affects neither. Login and reset rate limits are Supabase Auth's built in limits, which are enough for an invite only app.

**Configuration required**:
- `NEXT_PUBLIC_SITE_URL`: base URL for the reset email redirect (web).
- `SUPABASE_JWKS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: already present on the backend.
- `WEB_ORIGIN`: the web app origin allowed by CORS (backend; e.g. `http://localhost:3000`, and the Vercel URL in production).
- `BACKEND_API_URL`: the `/api` rewrite target, set per environment (web, server side).
- Note: `NEXT_PUBLIC_*` values are fixed at build time on Vercel, so changing them needs a redeploy.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: needed by the web client. Confirm they are set in the web env and on Render/Vercel.
- Supabase dashboard: **confirm the project uses asymmetric JWT Signing Keys (not the legacy HS256 secret); migrate it if not, or JWKS verification fails for everyone**, disable new user sign ups, set the minimum password length to 10, add `${NEXT_PUBLIC_SITE_URL}/auth/confirm` to the redirect URLs, invite your user, and set `app_metadata.role = 'admin'` on it.

**Critical test scenarios**:
- Happy path: sign in, land on `next`, and API calls succeed with a bearer token, verifies **AC-1**, **AC-5**
- No token gets 401 on every `/api/v1/*` controller, and `/health` still returns 200, verifies **AC-4**
- An expired token gets 401, then the web refreshes and retries once, then redirects to login, verifies **AC-10**
- A ticket opens `/scanner/stream` once; reuse, a 31 s old ticket, or a raw token in the query all get 401; the stream closes at token `exp` and the client reconnects, verifies **AC-6**
- A failed role lookup gets 503, not admin access, verifies **AC-7**
- `next=/\\evil.com` and encoded variants land on `/dashboard`, verifies **AC-1**
- A preflight `OPTIONS` with `Authorization` is not rejected, verifies **AC-4**
- A non admin gets 403 from AdminGuard, has no nav link, and `/dashboard/backtest` redirects them, verifies **AC-7**, **AC-8**
- With the role removed, admin access ends within 60 s on a still valid token, verifies **AC-7**
- `next=//evil.com` lands on `/dashboard`, verifies **AC-1**
- A reset request for an unknown email shows the same message, verifies **AC-9**

## Build plan

Tracer Bullet (no approach recorded, default assumed): one protected call end to end first, then widen.

1. Confirm Supabase asymmetric signing keys. Then backend `AuthGuard` (jose JWKS verify, pinned claims, startup URL check, HTTP only, OPTIONS pass) as a global `APP_GUARD`, `enableCors` with `WEB_ORIGIN`, `@Public()` on `/` and `/health`, plus `GET /api/v1/me`, satisfies **AC-4**
2. Web Supabase clients (browser and server), the `/login` page, and the shared `apiFetch` with a bearer header and one refresh retry, used first by `/api/v1/me`, satisfies **AC-1**, **AC-5**, **AC-10**
3. `proxy.ts` redirect and server layout check for all pages except the public ones, with the `next` handling, satisfies **AC-3**, **AC-1**
4. Move every web API call to `apiFetch`, including `TradeContext.tsx`'s direct `localhost:3001` URL, satisfies **AC-5**
5. SSE: `POST /auth/sse-ticket`, the `@SseAuth()` ticket check on `/scanner/stream`, closing at `exp`, and the web `EventSource` reconnecting with a fresh ticket, satisfies **AC-6**
6. `AdminGuard` with a 60 s role cache, plus an `isAdmin` nav filter in Sidebar and a server redirect helper for admin pages, satisfies **AC-7**, **AC-8**
7. `/auth/confirm` PKCE route, forgot and reset password pages (also used by invites), and sign out in the Topbar avatar menu, satisfies **AC-9**, **AC-11**
8. Supabase project settings (sign ups off, password length, redirect URL, invite, admin role), applied by you and listed in `verify.md`, satisfies **AC-2**
9. Tests for the scenarios above (backend guard specs, web `apiFetch` and redirect tests), satisfies **AC-1** to **AC-11**

## Consequences

**Positive**:
- Your data stops being public, and spec 0020's admin gate becomes buildable.
- One `apiFetch` helper replaces scattered `fetch` calls and the hardcoded backend URL.

**Negative / tradeoffs**:
- Every existing hook and context must move to `apiFetch`, which touches many files.
- Local dev now needs a signed in user, and scripts that call the API (not the CLIs, which use the service role) need a token.
- SSE tickets add a small in memory store. It's lost on restart, which is fine because clients just fetch a new ticket.
- Playwright e2e tests will need a test user and a sign in step.

**Neutral**:
- No migration. The admin role is set by hand once in Supabase.

## Follow-up

- [ ] After this ships, `/develop Guru Strategy Backtest Lab` resumes spec 0020 (API, AdminGuard usage, web page).
- [ ] Update the Playwright e2e tests with a seeded test user.
