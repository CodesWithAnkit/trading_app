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

## Components (coding rules)
- **Reuse before you build.** Check `components/ui/` first. A control used, or likely to be used, on more than one page (filters, pickers, toggles, dialogs, empty and error states) lives there, never as a local function inside a page file.
- **`components/ui/`** holds generic building blocks: one component per file, kebab case file name (`checkbox-filter.tsx`), a named export in PascalCase (`CheckboxFilter`), an exported `<Name>Props` type, and an optional `className` merged with `cn()` from `lib/utils`. No API calls, no domain words (strategy, signal, trade) and no app state inside; everything comes in through props, and changes go out through callbacks (`onChange`). Example: `components/ui/checkbox-filter.tsx`.
- **`components/domain/`** holds feature components that know the trading domain or fetch data (e.g. `ScorecardMinSampleSetting.tsx`); they compose `components/ui/` pieces. Data fetching lives in hooks under `lib/hooks/`, not inside `components/ui/`.
- **Pages stay thin:** `app/**/page.tsx` arranges components and holds page state. If a page grows a second component that could stand alone, move it out.
- **Readable text only:** never show a raw id or enum (`breakout_momentum`, `BULLISH_TREND_DAY`) to the person. Map it to words with a helper in `lib/<feature>/labels.ts` (e.g. `lib/scorecard/labels.ts`); keep the raw value for the API and in a `title` tooltip if useful.
- **Styling and access:** use the design tokens from `app/globals.css` (Tailwind classes like `text-text-primary`, `bg-surface`, `border-border-subtle`), never new hex colours in components. Use real `<button>`, `<label>` and `<input>` elements, touch targets of at least 40 px, and close popovers on Escape and an outside click.
