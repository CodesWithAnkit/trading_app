# Verify: Guru Strategy Live Promotion · spec 0023 · updated 2026-11-10
_Steps derived from spec 0023 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Prerequisites: history loaded (spec 0022), at least one guru rule with `passed_gate = true`, an admin user (spec 0021), `MARKET_DATA_PROVIDER=angelone`, market open for the live steps._

## Setup
- [x] Migration `20261110120000_strategy_live_toggles.sql` applied → `strategy_live_toggles` exists with RLS on → AC-1
- [x] Backend boots with `GuruLiveService` loaded and no errors when no toggle is enabled → AC-2

## Commands
- [x] `GET /api/v1/backtest/toggles` and `PATCH /api/v1/backtest/toggles/UP_ORB/NIFTY` without a token → 401 → AC-8
- [x] Toggle rules against the real database: on with no run → 409 "No done backtest run…"; off → stored; baseline → 422; list returns all 10 pairs with `no run` → AC-1, AC-8
- [ ] With an admin token: `PATCH …/toggles/<rule>/NIFTY {"enabled":true}` for a passing rule → 200, state `warming up` or `live`; for a failing rule → 409 → AC-1
- [ ] Non admin token on `/toggles` → 403 → AC-8
- [x] `cd apps/backend && npx vitest run src/scanner/guru-live src/backtest/live src/backtest` → live engine matches `simulate()` on UP_ORB, stop entries, OCO, expiry, warm up, plan book collisions and shorts, toggle states → AC-2, AC-3, AC-4, AC-6, AC-7
- [x] `cd apps/web && npx vitest run components/domain/backtest components/domain/SignalCard.test.tsx` → Live switch, settings list, GURU card tag → AC-1, AC-5, AC-8

## Live (market hours, a passing rule switched on)
- [ ] Backend log shows `Guru live: subscribed NIFTY (NSE 99926000)` (and SENSEX on BSE) within a minute of enabling → AC-2
- [ ] A live SENSEX tick arrives (latest price for `SENSEX` updates) → AC-2 (BSE exchange type 3)
- [ ] `candles` gains `5m` rows for `NIFTY` / `SENSEX` while live, with volume 0 → AC-2
- [ ] Before enough history: the lab shows `warming up` with the reason (bars or prior days) → AC-3
- [ ] A CLOSE rule (e.g. UP_ORB) fires at the bar close: a signal card appears with `GURU · UP_ORB`, the direction, and an evidence chip → AC-4, AC-5
- [ ] A stop rule fires only when price crosses its trigger; an untriggered setup produces no card → AC-4
- [ ] The evidence chip opens `/dashboard/backtest?run=<id>` with that run selected → AC-5
- [ ] A SHORT guru signal closes at its target when price falls to it, and at stop when price rises to it → AC-6
- [ ] An open guru plan closes as TIME at 15:15 IST → AC-6
- [ ] Two different guru rules on NIFTY can both be open at once → AC-6
- [ ] Run a new backtest that fails for a live rule → within 5 minutes the lab shows `blocked` and no new signals fire; a later passing run resumes it → AC-7
- [ ] Settings shows "Live guru rules" for an admin, read only; a non admin does not see it → AC-8
- [ ] No order is placed anywhere (no broker order calls in logs) → AC-9

## Value sourcing checks
- [ ] Index tokens and exchanges come from the instrument file (NIFTY NSE 99926000, SENSEX BSE 99919000) → token source
- [ ] Live entries carry no slippage; the backtest still applies 1 / 3 points → slippage source
- [ ] The evidence `runId` is the latest done run for that rule **and** symbol → evidence source
- [ ] After a backend restart, open guru plans are rebuilt keyed by rule id (not `GURU`) → plan identity source

## Acceptance-criteria coverage
- AC-1 toggle rules · AC-2 index feeds and 5m bars · AC-3 warm up · AC-4 close and stop entries, OCO, shared fills · AC-5 GURU signal and evidence · AC-6 plan book, shorts, 15:15 · AC-7 blocked and resume · AC-8 states, lists, admin only · AC-9 no orders
