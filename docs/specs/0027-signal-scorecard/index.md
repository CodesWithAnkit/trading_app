# 0027. Signal Scorecard from reconciled outcomes

**Date**: 2026-11-11
**Status**: In Progress

## Summary

The Scorecard is a real data page that replaces the mock Performance page. For each strategy, setup, time of day bucket, market regime and entry news verdict, it shows win rate, average R (profit or loss measured in units of the risk you planned to take) and net expectancy (the average R per trade after costs). The numbers come only from the end of day reconciled outcomes, and every number shows its sample size and a "too few trades" flag. Building it needs a small migration: signals get a strategy id, a strategy version and a market regime stamped when they fire, and Settings get a minimum sample value.

## Requirements

**User stories**:
- As the trader, I want a report card per strategy in R terms, so I can keep the strategies that have an edge and switch off the ones that don't.
- As the trader, I want results cut by setup, time of day, market regime and news verdict, so I can see *when* a strategy works, not just whether it does.
- As the trader, I want every number to carry its sample size and a clear flag when the sample is small, so I don't act on noise.

**Acceptance criteria**:
- **AC-1**: `/dashboard/performance` shows the Scorecard with real data. All mock data and mock charts are gone from that page, and the nav label reads "Scorecard".
- **AC-2**: Only signals with `outcome_status` set (reconciled by the 15:32 IST job) are counted. Unreconciled signals are left out, and the page shows how many were left out.
- **AC-3**: Each signal's R is `outcome_pnl_pct / 100 × entry / |entry − stop|`, where entry is `referenceEntryOf(signal)` and stop is `snapshot_json.stop.level` (`outcome_pnl_pct` is already signed for direction, so shorts need no flip). A signal with no `stop.level` (the `stopOf` × 0.99 fallback is NOT used here), or whose `|entry − stop|` is 0, is left out and counted as "invalid risk".
- **AC-4**: Win rate = WON / all counted trades (NEUTRAL included in the denominator). NEUTRAL trades count in the trade total, average R and expectancy, using their real R.
- **AC-5**: Every row shows: trades, wins, losses, neutrals, win rate, average win R (WON trades only), average loss R (LOST trades only), average R (gross, all trades), and expectancy (net average R per trade after costs, all trades).
- **AC-6**: Net R = gross R − cost R. Cost R = charges ÷ (qty × |entry − stop|), with qty = max(1, floor(risk_budget ÷ |entry − stop|)). Charges come from `evidence_snapshots.estimated_charges` on the signal's latest evidence row (latest by `created_at`), or ₹20 when the signal has none. Each row shows the share of its trades that used the ₹20 estimate, and the page labels net figures "estimated" (the charges were not computed for this quantity).
- **AC-7**: The page shows five cuts: by strategy, by setup (scanner: `setup_family`; guru: `snapshot_json.setup`, the rule id, because guru rows carry `setup_family = 'GURU'`), by time of day bucket (IST: Opening 09:15 to 10:00, Morning 10:00 to 11:30, Midday 11:30 to 13:30, Afternoon 13:30 to 14:45, Late 14:45 to 15:30, and Other for anything outside the session, based on `created_at`), by market regime (the regime stamped on the signal, or "Unknown"), and by entry news verdict (`news_gate`: pass, warn, block, or "Not checked"). Every cut's trades add up to the overall total.
- **AC-8**: Any row with fewer trades than the minimum sample (`user_settings.scorecard_min_sample`, default 30) is visibly flagged "too few trades", and its numbers are visually muted.
- **AC-9**: Filters: date range (last 30 days as the default, last 90 days, all time, custom from/to as IST dates), direction (all, long, short), strategy, and strategy version. Every cut and the curve respect all filters. Counts are correct for any range size (no silent row limit).
- **AC-10**: A cumulative net R curve shows one line per strategy (the top 8 strategies by trade count; the rest are listed as "not charted"), x axis = trade time (`created_at`), each line stepping at its own trades.
- **AC-11**: New signals (scanner and guru live) are stamped at insert with `strategy_id`, `strategy_version`, and `market_regime` (the latest `market_context_snapshots` row with `snapshot_time <= created_at` on the same IST day, else null). Existing signals are backfilled once by the migration, taking regime from the signal's evidence row when one exists, else by the same snapshot rule.
- **AC-12**: The Settings page lets you edit the minimum sample (whole number, 5 or more). The Scorecard uses the new value on its next load.
- **AC-13**: Numbers match the reconciled outcomes. Running the aggregation again over the same rows gives identical results, and the trade count for any cut equals the number of reconciled, valid risk signals that match the filters.
- **AC-14**: Empty and error states: if no trades match the filters, the page shows "No reconciled trades in this range" with the excluded counts. If the API fails, it shows an error with a retry button and never shows stale or mock numbers.

## Decision

**Chosen option**: Option 2: Stamp grouping keys on signals, aggregate on read in the API.

Add `strategy_id`, `strategy_version` and `market_regime` to `signals`, stamped at insert and backfilled once. Then compute the scorecard per request in a pure TypeScript function in NestJS, from reconciled signals plus their evidence charges, and serve it from one authenticated endpoint that the rebuilt Performance page reads.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase-postgres-best-practices` (installed skill, for the migration and backfill)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (one migration, `supabase/migrations/2026111112xxxx_signal_scorecard.sql`):

| Table | Column | Type | Null | Notes |
|---|---|---|---|---|
| `signals` | `strategy_id` | text | nullable (backfilled; new rows always set) | Scanner: the setup family in lower case (`breakout_momentum`, …). Guru live: `guru:<rule_id>`. |
| `signals` | `strategy_version` | text | nullable | Scanner: the `strategy_version` field of the scanner strategy config (the same field `signal_metrics` stores). Guru: `definitionsVersion` from `guruLive.emit` (`run?.definitions_version ?? DEFINITIONS_VERSION`). Backfill: `signal_metrics.strategy_version` when present, else `'unversioned'`. |
| `signals` | `market_regime` | text | nullable | Same values as `market_context_snapshots.market_regime`. Null means "Unknown". |
| `user_settings` | `scorecard_min_sample` | integer | not null, default 30 | `CHECK (scorecard_min_sample >= 5)` |

- Index: `idx_signals_reconciled_scorecard` on `signals (created_at) WHERE outcome_status IS NOT NULL`, so range reads skip unreconciled rows.
- Backfill (same migration, idempotent, only where the column is null): `strategy_id` = `'guru:' || snapshot_json->'guru'->>'ruleId'` when `setup_family = 'GURU'` (verify the exact JSON path against a real guru row before writing the migration; `snapshot_json.setup` also holds the rule id), else `lower(setup_family)`. `market_regime` from the signal's latest `evidence_snapshots.market_regime`, else the latest `market_context_snapshots` row with `snapshot_time <= signals.created_at` on the same IST day.
- Charges are not copied onto signals. They are read at query time from `evidence_snapshots` in one query: `DISTINCT ON (signal_id) … ORDER BY signal_id, created_at DESC` over the signal ids in range (rows with null `signal_id` are ignored). Never one query per signal.
- Reads page through `signals` with `.range()` in chunks of 1000 until a short page, so the Supabase default row cap can never undercount.
- No new tables. Time bucket, R, and cost R are derived at read time, never stored.

**State transitions**: none new. A signal enters the scorecard when `outcome_status` goes from null to WON, LOST or NEUTRAL (the existing reconcile job).

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/scorecard` | GET | `range`: `all` (opt; ignores from/to), `from`: IST date (opt, default today − 30), `to`: IST date (opt, default today), `direction`: `LONG`\|`SHORT` (opt), `strategyId`: string (opt), `strategyVersion`: string (opt) | `range`, `settings {minSample, riskBudget, riskBudgetAssumed}`, `excluded {unreconciled, invalidRisk}`, `overall: Row`, `cuts {strategy[], setup[], timeBucket[], regime[], newsVerdict[]}: Row[]`, `curve[] {strategyId, points[{at, cumNetR}]}`, `curveOmitted[]`, `filterOptions {strategies[], versions[]}` | bearer (Supabase JWT guard) | 400 bad date or `from > to`, 401 no session, 500 DB read failed |
| `/api/v1/settings/scorecard` | GET | none | `{minSample}` | bearer | 401 |
| `/api/v1/settings/scorecard` | PATCH | `minSample`: integer ≥ 5 (req) | `{minSample}` | bearer | 400 not an integer or below 5, 401 |

`Row` = `{key, label, trades, wins, losses, neutrals, winRate, avgWinR, avgLossR, avgRGross, expectancyNet, estimatedCostShare, tooFew}`. Rows are sorted by trades, largest first. No pagination is needed: the cuts are bounded (a few strategies, 5 buckets, 5 regimes, 4 verdicts).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| GET scorecard | counted signals | `signals` where `outcome_status IS NOT NULL` and `created_at` in the IST range of `from`/`to` (via `istDayRange`) |
| GET scorecard | `excluded.unreconciled` | count of `signals` in range with `outcome_status IS NULL` |
| GET scorecard | entry, stop | `referenceEntryOf(signal)` in `signalMapper.ts`; `snapshot_json.stop.level` (missing means invalid risk) |
| GET scorecard | setup key (guru) | `snapshot_json.setup` (the rule id) |
| GET scorecard | gross R | derived: `outcome_pnl_pct / 100 × entry / |entry − stop|` (AC-3) |
| GET scorecard | charges (₹) | latest `evidence_snapshots.estimated_charges` for `signal_id`, else constant `DEFAULT_CHARGES_INR = 20` |
| GET scorecard | `estimatedCostShare` | derived: share of the row's trades with no evidence row |
| GET scorecard | risk budget | `user_settings.risk_budget` for the caller's `user_id`. If null, constant `DEFAULT_RISK_BUDGET_INR = 1000` and `riskBudgetAssumed = true` (shown on the page) |
| GET scorecard | qty, cost R, net R | derived (AC-6) |
| GET scorecard | min sample, `tooFew` | `user_settings.scorecard_min_sample` for the caller (30 when there is no row); `tooFew = trades < minSample` |
| GET scorecard | strategy, version, regime keys | `signals.strategy_id`, `signals.strategy_version`, `signals.market_regime` (null shows as "Unknown") |
| GET scorecard | setup key (scanner) | `signals.setup_family` |
| GET scorecard | time bucket | derived from `signals.created_at` converted to IST (the existing `scanner/time/ist` helpers); outside 09:15 to 15:30 is "Other" |
| GET scorecard | curve strategies | top 8 `strategy_id` by trade count; the rest returned in `curveOmitted[]` |
| GET scorecard | news verdict | `signals.news_gate` (null shows as "Not checked") |
| GET scorecard | curve points | derived: cumulative net R per `strategy_id`, ordered by `created_at` |
| GET scorecard | `filterOptions` | distinct `strategy_id` and `strategy_version` over all reconciled signals |
| Signal insert (scanner) | `strategy_id`, `strategy_version` | `lower(setupFamily)`; the config's `strategy_version` field |
| Signal insert (guru live) | `strategy_id`, `strategy_version` | `guru:<ruleId>`; `definitionsVersion` in `guruLive.emit` |
| Signal insert (both) | `market_regime` | the latest `market_context_snapshots.market_regime` with `snapshot_time <= created_at` on the same IST day, read once per insert (null when none) |
| PATCH settings | `minSample` | request body. Upsert on `user_settings` keyed by the JWT `user_id`, writing only `scorecard_min_sample` (never touching `risk_budget` or `display_preferences`) |

**Key invariants**:
- The scorecard never writes to `signals`. It is a pure read, and the same rows always give the same output (AC-13).
- `trades = wins + losses + neutrals` for every row, and the sum of trades across any one cut equals `overall.trades`.
- `expectancyNet = avgRGross − mean cost R` over the same trades.
- `market_regime` and the news verdict used for grouping are fixed at entry and never updated after insert.
- `scorecard_min_sample >= 5` is enforced by a DB check and validated in the DTO.

**Security model**: Every route sits behind the existing Supabase JWT guard (`apps/backend/src/auth`), with no admin role needed. The scorecard reads `signals` and `evidence_snapshots` with the service role on the backend, the same as other signal reads (signals are global in this single trader app). Settings read and write are scoped to the caller's `user_id` from the JWT, never from the request body. No PII, no money movement, no compliance scope. Decision support only: nothing here places orders.

**Configuration required**: none (no new env vars or credentials).

**Critical test scenarios**:
- Happy path: seed 3 strategies with WON, LOST and NEUTRAL signals across buckets, regimes and verdicts. The API cuts, totals and curve match hand computed values, and the page renders them. Verifies **AC-1**, **AC-4**, **AC-5**, **AC-7**, **AC-10**, **AC-13**
- R and cost math: a LONG and a SHORT with known entry, stop and pnl give the exact gross R; with and without an evidence row the net R uses the right charges; a null `risk_budget` uses ₹1,000 and is flagged. Verifies **AC-3**, **AC-6**
- Exclusion: unreconciled signals and `entry == stop` signals are not counted and appear in `excluded`. Verifies **AC-2**, **AC-3**
- Small sample: with min sample 30, a 12 trade row has `tooFew: true` and renders muted; after PATCH to 10 it is unflagged on reload; PATCH 3 returns 400. Verifies **AC-8**, **AC-12**
- Filters: direction, strategy and version filters narrow every cut and the curve; `from > to` returns 400. Verifies **AC-9**
- Stamping: a new scanner signal and a new guru signal carry `strategy_id`, `strategy_version` and the day's latest regime; with no snapshot that day, the regime is null. Migration backfill run twice changes nothing the second time. Verifies **AC-11**
- Volume: seed 2,500 reconciled signals; `range=all` counts all 2,500 (no 1,000 row cap), and every cut, including the Other time bucket, adds up to overall. Verifies **AC-7**, **AC-9**, **AC-13**
- Short with missing stop: a SHORT signal with no `stop.level` lands in `excluded.invalidRisk`, not in any cut. Verifies **AC-3**
- Empty and failure: an empty range shows the empty state with excluded counts; an API 500 shows the error with retry and no numbers. Verifies **AC-14**
- Auth: no bearer token returns 401 on all three routes; PATCH only changes the caller's own `user_settings` row. Verifies **AC-12**

## Build plan

Tracer Bullet: first a thin thread from the database through the API to the page, then thicken it cut by cut.

1. [x] Migration: add `strategy_id`, `strategy_version`, `market_regime` on `signals`, `scorecard_min_sample` on `user_settings`, the partial index, and the idempotent backfill. Satisfies **AC-11**, **AC-12**
2. [x] Stamp `strategy_id`, `strategy_version`, `market_regime` at insert in `scanner.service.ts` and `guru-live/guruLive.service.ts` (regime read once per insert; a failed regime read inserts null, never blocks the signal). Satisfies **AC-11**
3. [x] Pure aggregation module `apps/backend/src/scorecard/aggregate.ts`: per signal R, cost R, time bucket, and rows per cut, plus overall, curve, and `tooFew`. Unit tested with hand computed fixtures. Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-10**, **AC-13**
4. [x] Thin thread: `ScorecardModule` with `GET /api/v1/scorecard` (default range, no filters yet) returning `overall` and the strategy cut. Rebuild `/dashboard/performance` as the Scorecard showing those two, with the mock removed, the nav renamed, and the empty and error states. Satisfies **AC-1**, **AC-2**, **AC-14**
5. [x] Thicken: the setup, time bucket, regime and news verdict cuts on the API and page; the excluded counts; the estimated cost share and assumed risk budget notes. Satisfies **AC-5**, **AC-6**, **AC-7**
6. [x] Filters: query DTO validation (dates, direction, strategy, version), `filterOptions`, and the filter bar on the page (30 day default). Satisfies **AC-9**
7. [x] Cumulative net R curve per strategy (Recharts, already in the web app). Satisfies **AC-10**
8. [x] Settings: `GET`/`PATCH /api/v1/settings/scorecard` and a min sample field on the Settings page. `tooFew` rows render muted with the flag. Satisfies **AC-8**, **AC-12**
9. [x] Consistency check: an integration test that seeds signals and compares API counts with direct SQL counts of reconciled valid risk signals per cut. Satisfies **AC-13**

## Consequences

**Positive**:
- The scorecard gives the first honest, cost aware measure of each strategy. It unblocks the "keep or switch off" decision and the later slices (Paper Trading Ledger, Regime Strategy Filters).
- The stamped `strategy_id` and `market_regime` become reusable grouping keys for Regime Strategy Filters and Journal Tags.
- Aggregating on read keeps the numbers always fresh and makes the math one pure, testable function.

**Negative / tradeoffs**:
- Backfilled regime is approximate (the nearest earlier snapshot). Old signals from days with no snapshot land in "Unknown".
- Cost R depends on `risk_budget`. Until Position Sizing exists, a null budget falls back to an assumed ₹1,000, so net numbers are an estimate, and the page says so.
- Charges come from evidence rows that many signals lack. Those signals use a flat ₹20, which the page shows as a coverage share.
- Reconciled outcomes only consider target 1 and treat a candle that touches both stop and target as LOST. The scorecard inherits that conservative bias.
- Signals with no stored `stop.level` are left out as "invalid risk", so very old signals may shrink the sample.
- Reading on every request will slow down once there are tens of thousands of reconciled signals. That is fine for a single trader for years, and is the trigger to move to a Postgres RPC.

**Neutral**:
- The Performance route keeps its URL but changes meaning. The equity curve idea moves to Paper Trading Ledger.
- One more column on `user_settings`, and a new `scorecard` backend module.

## Follow-up

- [ ] Position Sizing and Risk Limits should make `risk_budget` required, which retires the ₹1,000 assumption here.
- [ ] Consider reconciling against the live exit too, later, to measure slippage between live and replay (deliberately out of scope here).
- [ ] `/sync` after build: add the `scorecard` module and the new signal columns to `apps/backend/src/scanner/strategy/AGENTS.md` (the stamping) and the root context list.
