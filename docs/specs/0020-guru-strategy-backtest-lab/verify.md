# Verify: Guru Strategy Backtest Lab · spec 0020 · updated 2026-11-08
_Steps derived from spec 0020 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Setup (you, once)
- [x] Apply the migration: `psql "$DATABASE_URL" -f supabase/migrations/20261106120000_backtest_lab.sql` → `backtest_runs`, `backtest_trades`, `backtest_locks` exist with RLS on → AC-1, AC-5
- [ ] Spec 0021 sign in works and your user has `app_metadata.role = 'admin'` → AC-11
- [ ] Backend env has Angel One credentials (`ANGEL_ONE_API_KEY`, `_CLIENT_ID`, `_PASSWORD`, `_TOTP_SECRET`) → AC-1

## Commands
- [ ] `cd apps/backend && npm run backtest -- --backfill NIFTY,SENSEX` → logs chunks per series; ends with "Backfill complete" → AC-1
- [ ] Run the same backfill again → logs `RESUME … from <last date>`, and the `candles` row count for NIFTY/SENSEX barely changes (no duplicates) → AC-1
- [ ] Start a second backfill while one runs → 409 "Backfill already running" → AC-12
- [ ] `npm run backtest -- --run all --symbols NIFTY,SENSEX` → every rule and baseline ends `done`, then the leaderboard prints → AC-2, AC-5, AC-6, AC-8
- [ ] `select definitions_version, count(*) from backtest_runs group by 1` → only `v1` → AC-2
- [ ] `select count(*) from backtest_trades where abs(r_net - (r_gross - cost_r)) > 0.0002` → 0 → AC-4
- [ ] `select count(*) from backtest_trades t where (extract(hour from t.exit_time at time zone 'Asia/Kolkata')*60 + extract(minute from t.exit_time at time zone 'Asia/Kolkata')) > 15*60+15` → 0 (no exit after 15:15 IST, no overnight) → AC-3
- [ ] `select count(*) from backtest_trades where entry_time::date <> exit_time::date` → 0 → AC-3
- [ ] `select count(*) from backtest_trades t join backtest_runs r on r.id = t.run_id where t.is_oos and t.trade_date < r.oos_start` → 0 → AC-5
- [ ] Every guru run with `passed_gate = true` also passes on the other symbol, and beats `BASE_COIN` there → AC-7
- [ ] `BASE_BUYHOLD` runs have `out_of_sample.returnPct` and `maxDrawdownPct`, and never `passed_gate = true` → AC-6
- [ ] `POST /api/v1/backtest/runs` twice quickly for the same pair (admin token) → second is 409 and creates no rows → AC-8
- [ ] Kill the backend partway through a run, restart → that run shows `failed` with "interrupted by restart"; queued runs continue → AC-8, AC-12
- [ ] `curl -i localhost:3001/api/v1/backtest/leaderboard` with no token → 401; with a non admin token → 403 → AC-11
- [x] `cd apps/backend && npx vitest run src/backtest src/auth` → all pass → AC-2, AC-3, AC-4, AC-7, AC-8, AC-11
- [x] `cd apps/web && npx vitest run components/domain/backtest` → all pass → AC-9

## UI / manual (signed in as admin)
- [ ] Sidebar shows "Backtest Lab"; `/dashboard/backtest` opens → AC-11
- [ ] Before any history: "No history yet" with a Backfill button and the CLI command → AC-1, AC-9
- [ ] Click Backfill history → progress bars per series, retries and rows counters, a chunk log → AC-1, AC-12
- [ ] Click Run all rules → run status shows QUEUED / RUNNING n%, then the leaderboard fills → AC-8, AC-9
- [ ] Leaderboard: one row per rule and symbol, plus baselines; out of sample trades, win %, net R, PF, max DD, years +, and PASS / FAIL / BASELINE → AC-5, AC-6, AC-7, AC-9
- [ ] Both / NIFTY / SENSEX switch filters the rows → AC-9
- [ ] Selecting a row shows its equity curve, per year table (full vs partial), and why it failed the gate → AC-5, AC-7, AC-9
- [ ] "View all trades" opens the drawer: out of sample / in sample / all tabs, target / stop / time counts, R gross, cost R, R net, CSV export, paging → AC-4, AC-9
- [ ] Definitions v1 panel shows the selected rule's locked wording → AC-2, AC-9
- [ ] Run from terminal panel: 4 commands, Copy works → AC-9
- [ ] During 09:15 to 15:30 IST on a weekday, the "Market hours" warning shows → AC-9
- [ ] At phone width: leaderboard turns into stacked cards; drawer opens as a bottom sheet → AC-9
- [ ] Signed in as a non admin: no sidebar link; `/dashboard/backtest` redirects to `/dashboard` → AC-11

## Value sourcing checks
- [x] NIFTY lot size and token printed by the CLI match the Angel One instrument file today (`Nifty 50` 99926000, nearest NIFTY FUTIDX lot) → lot and token source
- [ ] SENSEX history is requested with exchange BSE → exchange source
- [ ] `oos_start` equals the date at 70% of the run's trading days → split source
- [ ] Changing nothing and running `BASE_COIN` again gives the same median net R → seeded randomness source

## Acceptance-criteria coverage
- AC-1 backfill, resume, no duplicates · AC-2 v1 rules only · AC-3 no lookahead (tests), 15:15 exit, no overnight, stop first (tests) · AC-4 r_net identity, cost in drawer · AC-5 in/out of sample split · AC-6 baselines · AC-7 gate on both symbols and the coin · AC-8 queue, 409, restart · AC-9 page states, drawer, terminal panel, mobile · AC-10 rule functions are pure and reusable (tests) · AC-11 admin only API and page · AC-12 retries, lock, gap days, failed runs
