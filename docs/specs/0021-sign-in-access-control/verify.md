# Verify: Sign In and Access Control · spec 0021 · updated 2026-11-08
_Steps derived from spec 0021 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Setup (you, once, in the Supabase dashboard and env)
- [ ] Authentication › JWT Signing Keys: the project uses an asymmetric key (ES256 or RS256), not the legacy HS256 secret → otherwise every token fails AC-4
- [ ] Authentication › Sign In / Providers: "Allow new users to sign up" is off → AC-2
- [ ] Authentication › Providers › Email: minimum password length 10 → AC-9
- [ ] Authentication › URL Configuration: `<site>/auth/confirm` is in Redirect URLs, and Site URL is set → AC-9
- [ ] Invite yourself (Authentication › Users › Invite), then set `raw_app_meta_data.role = 'admin'` on your user → AC-7
- [ ] Backend env: `SUPABASE_URL`, `SUPABASE_JWKS_URL` (= `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`), `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN` (e.g. `http://localhost:3000`) → AC-4, AC-7
- [ ] Web env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `BACKEND_API_URL` → AC-1, AC-9

## UI / manual
- [ ] Signed out, open `/dashboard/trades?tab=open` → redirected to `/login?next=%2Fdashboard%2Ftrades%3Ftab%3Dopen` → AC-3
- [ ] Sign in with a wrong password → "Email or password is incorrect." and no hint which was wrong → AC-1
- [ ] Sign in correctly → lands on `/dashboard/trades?tab=open` → AC-1
- [ ] Open `/login?next=//evil.com` and `/login?next=/%5Cevil.com`, sign in → lands on `/dashboard` → AC-1
- [ ] On `/login` with DevTools Network open → no `/api/v1/*` calls are made → AC-3
- [ ] Signed in, DevTools Network: every `/api/v1/*` request has `Authorization: Bearer …`; the stream URL has `?ticket=` and never an access token → AC-5, AC-6
- [ ] Dashboard live data updates (signals, momentum) arrive over the stream → AC-6
- [ ] Non admin user: no "Backtest Lab" in the sidebar; visiting `/dashboard/backtest` (once built) goes to `/dashboard` → AC-8
- [ ] Admin user: "Backtest Lab" link shows, and the avatar menu shows an ADMIN badge → AC-8
- [ ] Avatar menu → Sign out → lands on `/login`; Back button does not show app data → AC-11
- [ ] `/forgot-password` with an unknown email and with your email → same message both times; your inbox gets a link → AC-9
- [ ] Open the reset link → `/auth/confirm` → `/reset-password`; a 9 character password is refused; a 10+ one saves and lands on `/dashboard` → AC-9
- [ ] Open an already used reset link → "Link expired" with a way to request a new one → AC-9
- [ ] In Supabase, try to sign up a new email via the API → refused → AC-2
- [ ] Leave a tab open past the token lifetime (about 1 h) → data keeps loading (silent refresh) and the stream reconnects → AC-6, AC-10

## Commands
- [ ] `curl -i localhost:3001/health` → 200 with no token → AC-4
- [ ] `curl -i localhost:3001/api/v1/signals` → 401 → AC-4
- [ ] `curl -i -H "Authorization: Bearer <your access token>" localhost:3001/api/v1/me` → 200 `{ id, email, isAdmin }` → AC-4, AC-7
- [ ] `curl -i -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Headers: authorization" localhost:3001/api/v1/signals` → 204 with `access-control-allow-headers` including Authorization → AC-4
- [ ] `curl -i "localhost:3001/api/v1/scanner/stream?access_token=<token>"` → 401 (raw tokens never accepted in a query) → AC-6
- [ ] `POST /api/v1/auth/sse-ticket` with a bearer → `{ ticket, expiresIn: 30 }`; using the ticket twice → second is 401 → AC-6
- [ ] Remove your admin role in Supabase while signed in → `/api/v1/me` shows `isAdmin: false` within 60 s → AC-7
- [ ] Start the backend with a wrong `SUPABASE_JWKS_URL` → it refuses to boot with a clear message → AC-4
- [ ] `cd apps/backend && npx vitest run src/auth` → 10 passed → AC-4, AC-6, AC-7
- [ ] `cd apps/web && npx vitest run lib/api lib/auth` → apiFetch and safeNext tests pass → AC-1, AC-3, AC-5, AC-10
- [ ] `cd apps/web && npx next build` → builds, and lists `Proxy (Middleware)` → AC-3

## Value sourcing checks
- [ ] Token from another Supabase project (different issuer) → 401 → issuer pinned to `SUPABASE_URL`
- [ ] `isAdmin` in the UI matches `app_metadata.role` after a page reload, not a client claim → server side role source
- [ ] Reset email link host equals `NEXT_PUBLIC_SITE_URL` → redirect URL source

## Acceptance-criteria coverage
- AC-1 login, wrong password, next handling · AC-2 sign up refused · AC-3 page redirects, no API on /login · AC-4 curl 401/200, health, preflight, boot check · AC-5 bearer on every call · AC-6 ticket stream, single use, no raw token, reconnect · AC-7 /me, role removal within 60 s · AC-8 nav and page gate · AC-9 forgot, reset, expired link · AC-10 silent refresh past expiry · AC-11 sign out
