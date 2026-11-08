# 0021 Rationale: Sign In and Access Control

## Context

The product is a personal intraday trading tool: a Next.js 16 web app (`apps/web`) that calls a NestJS API (`apps/backend`) through a `/api` rewrite, backed by Supabase Postgres. `@supabase/ssr` and `@supabase/supabase-js` are installed in the web, and `SUPABASE_JWKS_URL` is set on the backend, but no code uses either: there is no login page, no proxy file, no auth header, and no guard on any controller.

Spec 0020 needs an admin only area, which is impossible without an identity. The data the app shows (signals, the journal, trade plans) is personal and should not be public either. The live scanner pushes updates over Server Sent Events through `EventSource`, which cannot set request headers, so any token scheme has to handle that stream. One web call (`TradeContext.tsx`) bypasses the rewrite and hits `http://localhost:3001` directly.

If this stays undecided, the backtest lab ships unguarded, and anyone who learns the backend URL can read or change your journal.

## Options considered

### Option 1: Supabase Auth, bearer token verified by JWKS in NestJS (chosen)

**Pros**: uses the platform and packages you already have. Stateless verification on the backend (no call to Supabase per request), and invite only is a built in setting.
**Cons**: SSE needs a ticket endpoint and a small in memory ticket store. The backend must keep a JWKS cache.

### Option 2: Supabase Auth with the Next proxy forwarding the cookie as a header

**Pros**: the token never sits in browser JavaScript.
**Cons**: every API call needs a server hop or a custom route handler, the existing `/api` rewrite can't add headers from the session, and the SSE stream gets awkward to proxy.

### Option 3: Shared password or API key in an env var

**Pros**: smallest build.
**Cons**: no per user identity or role, the key ends up in the browser, and it can't support spec 0020's admin rule properly.

## Rationale

The project is already on Supabase, and its auth is the aligned choice: invite only and password reset come built in, and the packages are installed. Verifying the JWT locally against JWKS keeps the NestJS API stateless and fast, which matters for a scanner that polls and streams all day. The role check is the one place a stale token would be dangerous, so `AdminGuard` alone pays for a cached lookup. For SSE, a short lived single use ticket gets around `EventSource`'s missing headers without ever putting the real access token into URLs or platform access logs. A fetch based stream rewrite would also work, but it isn't worth reworking the reconnect logic now.
