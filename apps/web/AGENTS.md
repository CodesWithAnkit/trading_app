<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Auth and API calls (spec 0021)
- Call the NestJS API only through `lib/api/apiFetch.ts` (`apiFetch`, bearer token, one shared refresh) and `openAuthedStream` for SSE. Never `fetch('/api/...')` directly or a backend host URL.
- Public pages are listed once in `lib/auth/publicPaths.ts`; `proxy.ts` redirects everything else to `/login?next=...`.
- Signed in areas render through `components/layout/ProtectedShell.tsx` (server `requireUser()`); data providers mount there, not in the root layout. Admin pages call `requireAdmin()` from `lib/supabase/server.ts`.
- `isAdmin` on the web comes from the server verified user (`useSessionUser()`), never a client claim.
- Unit tests get a pass through `apiFetch` mock from `vitest.setup.ts`; `lib/api/apiFetch.test.ts` tests the real one.
- Market and institutional data (spec 0026): never render sample or fallback numbers; a missing value shows a dash and "No live data", and a last known value shows its "as of" time.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `BACKEND_API_URL`.
