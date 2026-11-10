# Review, feature/0020-guru-backtest-lab (news ingestion, spec 0024), 2026-11-10

**Reviewed by**: Sonnet 5.5 (author on unknown)
**Scope**: 24 files, d9f9963~1 vs working tree
**Verdict**: Changes requested

## Summary
Replaces the seeded news with real ingestion: exchange RSS feeds, market RSS, gated Alpha Vantage, rules then Gemini then default classification, a run log with cancel and pause, and admin-only controls. The code follows the spec closely, the security constraints (honest UA, no cookies, no browser headers, same-host redirects, skip not retry on 403) are met, and the vitest suites pass (backend intelligence 56, web hook 2). The headline gap is the missing pubDate lookback filter, which combines with "HIGH is never pruned" to keep stale items forever.

## Major
### 🟠 No lookback filter on feed items, `apps/backend/src/intelligence/news/news-ingestion.service.ts:271`
**Problem**: Spec "Source queries" requires filtering feed items on `pubDate` (2 days manual, 1 day scheduled). Nothing implements it (no lookback code anywhere in `news/`). Every item in a feed, however old, is mapped, stored, classified (spending Gemini budget) and pushed over SSE.
**Why it matters**: The first fetch of a feed with a long tail stores and SSE-announces old items as new, and burns the 200/day Gemini cap on them. Old HIGH items are exempt from the prune, so stale items persist permanently and feed the spec 0025 history.
**Suggested fix**: Drop items with `publishedAt` older than now minus the lookback (by trigger) before mapping, count them as filtered, and add a fixture test.

## Minor
### 🟡 304 validators are stored before items are persisted, `apps/backend/src/intelligence/news/news.adapters.ts:99`
**Problem**: ETag / Last-Modified are saved when the body is received. If `storeItem` then throws (it aborts the source loop at `news-ingestion.service.ts:326`), the next poll gets 304 and the missed items are not re-read until the feed changes. Same for an unparseable body.
**Suggested fix**: Commit validators only after the source finished storing, or clear them on source error; consider continuing past a single item store failure.

### 🟡 Universe load outside try, `news-ingestion.service.ts:222`
**Problem**: `loadUniverse` runs before the per-source try/catch. A throw (e.g. DB client missing) is only logged by the caller's `.catch`, leaving the run `running` until the 10 minute stale sweep, which blocks manual and scheduled runs meanwhile.
**Suggested fix**: Wrap `execute` so any crash finalizes the run as `failed`.

### 🟡 `company-names.json` is `{}`, `apps/backend/src/intelligence/news/company-names.json:1`
**Problem**: Name matching is inert; NSE items with no ticker token and BSE items with no scrip code drop unless the headline contains a symbol. Spec lists filling it as a follow-up, so this is expected, but the UI will look sparse.
**Suggested fix**: Track the follow-up; the startup log already reports the missing count.

### 🟡 Cooldown check precedes overlap check, `news-ingestion.service.ts:100`
**Problem**: AC-1 says an overlapping call returns the running run id, but a second call within 60 s of a manual run gets 429 instead. Spec is internally ambiguous.
**Suggested fix**: Decide and align spec or code (return the running id first, then apply cooldown).

### 🟡 Rule-matched, direction-null items keep the rule impact when Gemini is unavailable, `news.classifier.ts:55`
**Problem**: Spec says Gemini failure or cap gives Low/Neutral; code keeps rule impact (e.g. HIGH earnings) with Neutral direction, `classified_by = default`. HIGH rows are never pruned.
**Suggested fix**: Confirm intent and document it in the spec, or fall back to Low.

### 🟡 Dangling timer in Gemini timeout race, `news.classifier.ts:97`
**Problem**: The `setTimeout` is never cleared when Gemini answers first (8 s timers pile up per item). Harmless but wasteful.
**Suggested fix**: Clear the timer in a finally.

## Nits
- ⚪ `news.symbols.ts:105`, headline symbol match is case-insensitive on the whole headline, so common words equal to a symbol can false-match.
- ⚪ `news.rules.ts:50`, bare `budget` keeps unrelated market RSS headlines as MARKET macro.
- ⚪ `news-ingestion.service.ts:254`, cancel poll errors are ignored and the 1 s throttle can miss a cancel in the last second of a run.

## Strengths
- Request hygiene is exactly per the security constraints: only UA and Accept, manual redirects limited to same host, 403/HTML recorded as skipped and remembered, never worked around.
- Dedup via insert-on-conflict and classifying only inserted rows; atomic Gemini cap in a service-role-only SQL function; one-running-run enforced by a partial unique index.
- Admin routes use AdminGuard, PUT body validated (422), RLS on with no policies for new tables.

## Test coverage
Good: adapters, skip and block outcomes, partial runs, dedup, mapping, rules and Gemini fallbacks, hook behavior. Untested: lookback (not implemented), validator behavior after a failed store, crash before the per-source try.
