# Verify: Backtest History Provider · spec 0022 · updated 2026-11-08
_Steps derived from spec 0022 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Run commands from `apps/backend`. The 0020 migration must be applied._

## Commands
- [x] `npm run backtest -- --backfill NIFTY` (no `HISTORY_PROVIDER`) → prints "History provider: angelone" → AC-1
- [x] `npm run backtest -- --backfill NIFTY --provider kite` → prints "Kite history provider is not configured yet: its daily token flow is still undecided (spec 0022)." and exits with an error → AC-1, AC-3
- [ ] `HISTORY_PROVIDER=kite npm run backtest -- --backfill NIFTY` → same Kite message (env is used when no flag) → AC-1
- [ ] `npm run backtest -- --backfill NIFTY --provider upstox` → "Unknown history provider" error → AC-1
- [x] With the current Trading key, `npm run backtest -- --backfill NIFTY` → fails once with "Angel One rejected historical data for this API key (AG8004). See docs/specs/0022." and no RETRY lines → AC-2
- [ ] Set `ANGEL_ONE_HISTORICAL_API_KEY` to a historical enabled key and run the backfill → chunks store rows into `candles`; live trading still uses `ANGEL_ONE_API_KEY` → AC-2
- [x] With no NIFTY/SENSEX candles stored, `npm run backtest -- --run UP_ORB,BASE_COIN --symbols NIFTY,SENSEX` → every run ends `done` (not `failed`), `out_of_sample.unavailable = true`, `passed_gate = false` → AC-4
- [x] Same run → CLI leaderboard shows "no history from angelone (NO DATA)" rows and "Gate not judged: NIFTY history unavailable from angelone, SENSEX history unavailable from angelone." → AC-5
- [x] `select cost_model->'notes'->>'history_provider' from backtest_runs` → `angelone` on each new run → AC-6
- [ ] With NIFTY history stored and SENSEX empty, `--run all` → NIFTY rows have real metrics, SENSEX rows say NO DATA, and the CLI prints "Gate judged on NIFTY only: SENSEX history unavailable from <provider>." → AC-4, AC-5
- [ ] A backfill where the provider returns zero rows for a never stored series logs `UNAVAILABLE <symbol> <tf>: no history from <provider>` → AC-4
- [ ] `POST /api/v1/backtest/backfill` (admin token) with `{"provider":"kite"}` → 409; with `{"provider":"nope"}` → 422 → AC-1, AC-3
- [x] `cd apps/backend && npx vitest run src/backtest/history` → provider tests pass → AC-1, AC-2, AC-4, AC-5
- [x] `cd apps/web && npx vitest run components/domain/backtest` → includes the NO DATA and "judged on NIFTY only" test → AC-5

## UI / manual (signed in as admin, /dashboard/backtest)
- [ ] After a run with no history: rows show a NO DATA badge, and selecting one shows the "No 5m history for … from …" reason → AC-4
- [ ] With only NIFTY data: the banner reads "Gate judged on NIFTY only: SENSEX history unavailable from <provider>." → AC-5
- [ ] Backfill progress shows the provider, and a series with no history is marked unavailable in the chunk log → AC-4

## Blocked until decided
- [ ] Kite provider fetches `5minute` and `day` for NIFTY 50 and SENSEX within Kite's window and rate limits → AC-3 (waits on the token flow decision and a Zerodha account)

## Value sourcing checks
- [ ] Provider precedence: flag over request body over `HISTORY_PROVIDER` over `angelone` → provider source
- [ ] The historical key is used only for candle calls (`ANGEL_ONE_HISTORICAL_API_KEY`, else `ANGEL_ONE_API_KEY`) → key source

## Acceptance-criteria coverage
- AC-1 provider selection, unknown provider · AC-2 historical key, AG8004 not retried · AC-3 Kite (blocked) · AC-4 unavailable not failed · AC-5 NIFTY only gate and labels · AC-6 provider recorded per run
