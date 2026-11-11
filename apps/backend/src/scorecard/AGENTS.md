# Signal Scorecard (spec 0027)

Read only aggregation of reconciled signals into per strategy results in R. Governing spec: [0027 Signal Scorecard](../../../../docs/specs/0027-signal-scorecard/index.md).

- **Files:**
  - `aggregate.ts`: pure math (R, cost R, IST time buckets, cuts, curve). No database access; same rows give the same output.
  - `scorecard.service.ts`: loads reconciled signals, evidence charges and user settings, then calls `buildScorecard`.
  - `scorecard.controller.ts`: `GET /api/v1/scorecard`, `GET`/`PATCH /api/v1/settings/scorecard`, and `parseScorecardQuery` (the 400 rules).
  - `stamping.ts`: `scannerStrategyId`, `guruStrategyId`, `regimeAt`, used by the signal insert paths.

- **Conventions:**
  - Every code path that inserts into `signals` must set `strategy_id`, `strategy_version` and `market_regime` (use `stamping.ts`). Scanner: `lower(setup_family)` and the config `strategy_version`; guru live: `guru:<ruleId>` and `definitionsVersion`. A failed regime read stamps null, never blocks the insert.
  - Count only reconciled outcomes (`outcome_status` set). R is `outcome_pnl_pct / 100 × entry / |entry − stop|`, with the stop read from `snapshot_json.stop.level` directly; never use `stopOf` here (its 0.99 fallback invents a stop). A missing stop or zero risk counts as invalid risk.
  - Page every `signals` / `evidence_snapshots` read with `.range()` (`PAGE_SIZE` 1000) so the PostgREST row cap can't undercount; never one query per signal.
  - Settings writes touch only `scorecard_min_sample`; reads and writes filter by the JWT `user_id` (the service role client bypasses RLS).
  - Time buckets and date ranges are IST (`scanner/time/ist.ts`), never the server clock.

- **Verification:**
  - `npx vitest run apps/backend/src/scorecard --root apps/backend`
  - Manual and command checks: [verify.md](../../../../docs/specs/0027-signal-scorecard/verify.md).

_Drafted by /sync from the introducing change, worth a quick human pass._
