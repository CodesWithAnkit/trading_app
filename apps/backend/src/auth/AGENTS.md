# Auth and access control (backend)

Supabase sign in, enforced on every NestJS route. Governing spec: [0021](../../../../docs/specs/0021-sign-in-access-control/index.md).

- **Files:**
  - `auth.guard.ts`: global `APP_GUARD`. Verifies the `Authorization: Bearer` Supabase token on every HTTP route.
  - `tokenVerifier.ts`: `jose` JWKS verification with issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`, `ES256`/`RS256`, 5 s clock tolerance. Refuses to boot unless `SUPABASE_JWKS_URL` is `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
  - `admin.guard.ts`: `AdminGuard` + `RoleService`. Admin = `app_metadata.role === 'admin'`, read with the service role via `auth.admin.getUserById`, cached per user 60 s. A failed lookup is 503, never access.
  - `ticketStore.ts`: in memory single use SSE tickets, 30 s TTL.
  - `auth.controller.ts`: `GET /api/v1/me`, `POST /api/v1/auth/sse-ticket`.
  - `decorators.ts`: `@Public()`, `@SseAuth()`, `@CurrentUser()`.

- **Conventions:**
  - Every new controller is protected by default. Mark a route `@Public()` only if the spec says it is public (today: `/` and `/health`).
  - Admin only controllers add `@UseGuards(AdminGuard)` at class level (see `backtest/backtest.controller.ts`).
  - SSE routes use `@SseAuth()`: they take `?ticket=` (from `POST /api/v1/auth/sse-ticket`), never a raw access token in a query string. End the stream at the user's token `exp`.
  - Import `AuthUser` with `import type` in decorated signatures (`isolatedModules` + `emitDecoratorMetadata`).
  - CORS allows only `WEB_ORIGIN` (comma separated) with `Authorization, Content-Type` headers (`main.ts`).
  - Internal callers (scheduler, CLIs) do not go through HTTP, so the guard does not affect them.
  - The backend's Supabase client uses the service role, which bypasses RLS. Any route reading or writing per user rows (journal, settings) takes `@CurrentUser()` and filters by `user.id` in code; set `user_id` from the token, never from the request body.

- **Env:** `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN`.

_Drafted by /sync from the introducing change, worth a quick human pass._
