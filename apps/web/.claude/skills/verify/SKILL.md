---
name: verify
description: How to run and drive the trading web app (apps/web) signed in, to verify a change at its real surface.
---

# Verify the web app

## Handle
- Web: `next dev` on `localhost:3000` (`npm run dev -w apps/web`). Backend: NestJS on `localhost:3001` (`npm run start:dev -w apps/backend`). Check `lsof -iTCP:3000,3001 -sTCP:LISTEN` first; the engineer often has both running already. Don't kill theirs.
- Every page and API route needs a Supabase session (spec 0021).

## Sign in headless (no password)
1. Load `apps/backend/.env` (`set -a; . ./.env; set +a`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. With supabase-js admin: `auth.admin.listUsers()`, pick the account, `auth.admin.generateLink({ type: 'magiclink', email })`.
3. In Playwright (`playwright` is installed at the repo root; resolve it with `createRequire('<repo>/package.json')`), open
   `http://localhost:3000/auth/confirm?token_hash=<properties.hashed_token>&type=magiclink`. That sets the session cookie; then go to any page.
4. For raw API calls: `verifyOtp({ token_hash, type: 'magiclink' })` on a second generated link gives an `access_token` for `Authorization: Bearer` against `localhost:3001`.

## Gotchas
- Wait for the actual API response (`page.waitForResponse(r => r.url().includes('/api/v1/...'))`), not `networkidle`: the SSE stream keeps the network busy, and some endpoints (scorecard) take 2 to 5 s. While loading, pages keep the previous numbers dimmed, so reading early gives stale values.
- `getByLabel('To')` and similar short labels collide with the top bar search and Next dev tools; pass `{ exact: true }`.
- Restore any setting you change (e.g. the Scorecard min sample) at the end.
