# 0020. Guru Strategy Backtest Lab

**Date**: 2026-11-06
**Status**: In Progress

## Summary

This spec adds a backtest lab. It takes five intraday rules from popular trading YouTubers, writes each one down as an exact definition, and tests it on years of Nifty and Sensex 5 minute history with realistic costs. Each rule is compared against two baselines, buy and hold and a coin toss. Each rule gets a PASS or FAIL against a strict gate, written down before any test runs and judged only on data it was never tuned on. Switching passing rules on in the live scanner is a separate later spec (phase 2). Only an admin can see or use any of it, and no order is ever placed automatically.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- As the admin, I want each guru rule tested on long history with real costs, so that I trust numbers, not claims.
- As the admin, I want a leaderboard against buy and hold and a coin toss, so that I can see whether a rule has any edge at all.
- As the admin, I want a fixed PASS or FAIL gate per rule, so that the later live promotion spec has an objective input.

**Acceptance criteria**:
- **AC-1**: A backfill command fetches 5m and 1d candles for `NIFTY` (NSE index) and `SENSEX` (BSE index) from the Angel One historical API, as far back as the API allows. It stores them in `candles` without duplicates, and running it again resumes from the last stored candle.
- **AC-2**: The five rules are implemented exactly as the pre-registered definitions in this spec (the **Rule definitions v1** table), as pure functions on 5m candles. Every run records `definitions_version = 'v1'`.
- **AC-3**: A run simulates trades bar by bar using only data available at that bar (no lookahead). Entries are filled at the trigger price plus slippage. If neither stop nor target is hit, the trade exits at the 15:15 IST bar close. If one bar touches both stop and target, the trade counts as a stop. There are no overnight positions.
- **AC-4**: Every trade has the realistic intraday cost model applied (brokerage, STT, exchange charges, GST, stamp duty, and one tick of slippage on each side, as in **Cost model v1**). Each run stores `r_gross`, `cost_r`, and `r_net` per trade, plus the cost model JSON.
- **AC-5**: A run reports trades, win rate, net R, profit factor, max drawdown in R, and per year results, separately for in sample (the first 70% of trading dates) and out of sample (the last 30%).
- **AC-6**: The baselines `BASE_BUYHOLD` (buy at the first bar after warm up and hold to the end, reported only as % return and max drawdown %, and excluded from the gate) and `BASE_COIN` (random side at 09:30 each day, stop 1 ATR(14, 5m), target 2R, same costs, 1000 seeds, median stored) run alongside and appear on the leaderboard.
- **AC-7**: `passed_gate` is true for a rule only when its **out of sample** results meet all of these on **both** NIFTY and SENSEX: profit factor at least 1.10, at least 100 trades, at least 2 full calendar years in the out of sample window, positive net R in at least 60% of those full years, and net R above the `BASE_COIN` median for that symbol. A run with no losing trades gets PF 99. The gate values are constants in code, not settings.
- **AC-8**: An admin can start runs from `backtest-cli.ts` or from `POST /api/v1/backtest/runs`. The run executes in the background with status `queued → running → done | failed`. Only one active run per rule and symbol is allowed (409 otherwise).
- **AC-9**: `/dashboard/backtest` shows the leaderboard (one row per rule and symbol, plus the baselines), with out of sample PF, win rate, net R, max drawdown, years positive, and a PASS or FAIL badge. It also shows an equity curve and per year table per row, a trade list drawer, the read only Rule definitions v1, and a Run button. It follows the Stitch design system, with stacked cards on mobile.
- **AC-10**: Rule functions live in `apps/backend/src/scanner/strategy/guru/` as pure exports, `(closed bars up to i, daily context) → signal | null`, with no backtest specific dependencies, so the phase 2 live spec can call them unchanged. No live wiring ships in this spec.
- **AC-11**: Only users with `app_metadata.role = 'admin'` can reach the backtest API (403 otherwise) or see the page and nav link. Everyone else gets a 403 from the API and a redirect to `/dashboard` on the web.
- **AC-12**: Backfill retries each chunk up to 3 times with backoff and respects the Angel One rate limit. A trading day with missing 5m candles is skipped and counted in the run's `gap_days`. A run that throws is marked `failed` with its error message.

## Decision

**Chosen option**: Option 2: In process backtest module on the existing NestJS backend, with rule functions shaped for later reuse by the live engine.

The rules are written once as pure functions in `apps/backend/src/scanner/strategy/guru/`. Only the backtester calls them for now. Phase 2 will call the same functions from `multiStrategyEngine`, so the rule that passed is exactly the rule that runs live.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase-postgres-best-practices` (installed skill, for the migration and RLS)

## Feature design

### Rule definitions v1 (pre-registered, do not tune)

All rules run on 5m candles, between 09:15 and 15:15 IST, with at most one trade per rule per day per symbol unless stated. `R` is entry minus stop, as an absolute value. ATR means Wilder ATR(14).

| Rule id | Source | Entry | Stop | Target |
|---|---|---|---|---|
| `GJ_PDHL` | Gautam Jha | Buy stop at the previous day high or sell stop at the previous day low, whichever is touched first after 09:15. One trade per day. | 0.5 × daily ATR(14) from entry | 10R |
| `MR_EMA_PIN` | Mayank Raj | Long only. Conditions: EMA9 > EMA15, EMA9 above its value 3 bars ago, and EMA15 above its value 3 bars ago. The signal bar is a pin bar: lower wick ≥ 2 × body, lower wick ≥ 60% of the bar's range, and the bar's low ≤ max(EMA9, EMA15). Buy stop at the pin high, valid for the next bar only. | Pin bar low | 2R |
| `UP_ORB` | Umar Punjabi | Opening range = high and low of the 09:15 to 09:45 bars (6 bars). Take the first 5m close outside the range, buy above or sell below, entering at that bar's close. | Opposite side of the range | 2R |
| `SP_5EMA` | Subhash Pani | Short only. The alert candle has its low above EMA5, so the whole bar sits above the EMA without touching it. A sell stop at the alert low is valid on the next bar. If it doesn't trigger and the next bar also qualifies as an alert, that bar becomes the new alert. | Alert candle high | 3R |
| `AST_RG` | Anish Singh Thakur | A red bar, then a green bar whose body is under 50% of the red body. Buy at the close of the next bar if it closes above the green bar's high. One trade per day. | Low of the green bar | 1R (1:1) |
| `BASE_BUYHOLD` | baseline | Buy the first bar of the window | none | hold to window end |
| `BASE_COIN` | baseline | Random side at the 09:30 bar close, seeded | 1 × ATR(14, 5m) | 2R |

### Precision rules v1 (shared by every rule)

- **Time**: `start_time` is the bar open, stored in UTC and compared in IST. A bar is closed at `start_time + 5m`. Only closed bars are ever evaluated, in the backtest and live.
- **Warm up**: EMAs carry over across days. The first 30 bars of the window and the first 20 trading days (for daily ATR) are warm up and produce no trades.
- **Daily ATR**: Wilder ATR(14) on `1d` candles up to and including the previous day only.
- **Entry window**: no new entries after 14:45 IST. Pending stop orders expire one bar after they're placed.
- **Fills**: a stop entry fills at `max(open, trigger)` for longs and `min(open, trigger)` for shorts. "Enter at close" fills at that bar's close. Slippage is then applied against you on entry and exit (1 point NIFTY, 3 points SENSEX, configurable). R is measured from the actual fill to the stop.
- **Exits**: the entry bar can hit the stop or the target. If a bar touches both, it counts as a stop, entry bar included. Stop and target fills use the level itself (or the open if price gapped through it). Time exit is the 15:15 bar close.
- **Rule specifics**: `UP_ORB` skips any day whose range is more than 1.5 × daily ATR. `SP_5EMA` replaces its alert bar with each new qualifying bar until a trigger or 14:45.
- **Metrics**: the equity curve is cumulative `r_net` ordered by `exit_time`, per rule and symbol, with the in sample and out of sample parts shaded. Max drawdown is the largest peak to trough fall on that curve. Partial calendar years are shown but don't count toward the gate.

Definitions are versioned. Any change needs a new version (`v2`) and a fresh out of sample window. It never edits `v1`.

### Cost model v1

All numbers live in one `costModel.ts` constant, and each run stores a copy as JSON. The model treats each trade as one index futures contract round trip:
- Brokerage ₹20 per order (₹40 round trip)
- STT 0.02% on the sell side
- Exchange transaction charge 0.00173% (NSE) or 0.00325% (BSE) of turnover
- SEBI fee ₹10 per crore
- GST 18% on brokerage plus exchange charges
- Stamp duty 0.002% on the buy side
- Slippage is applied in the fill price only (see Precision rules), never in `cost_r`.
- Rates carry an `as_of` date (2026-11-06), so a rate change means a new cost model version.

Turnover = price × lot size, for both legs. `cost_r` = total ₹ charges ÷ (R in points × lot size), using lot sizes from `instrumentFile.ts`.

### Data model sketch

| Table | Columns | Constraints |
|---|---|---|
| `candles` (existing) | no new columns (volume stays optional for indices) | add `UNIQUE (symbol, timeframe, start_time)`. The migration first deduplicates, keeping the row with the newest `created_at` |
| `backtest_locks` | `name text PK` (e.g. `backfill`), `acquired_at timestamptz` | a row exists while a backfill runs, deleted when it finishes; older than 2 h counts as stale |
| `backtest_runs` | `id uuid PK`, `rule_id text NOT NULL`, `symbol text NOT NULL`, `definitions_version text NOT NULL`, `cost_model jsonb NOT NULL`, `window_start date NOT NULL`, `window_end date NOT NULL`, `oos_start date NOT NULL`, `status text NOT NULL` (check: queued, running, done, failed), `trades int`, `win_rate numeric`, `net_pnl_r numeric`, `profit_factor numeric`, `max_drawdown_r numeric`, `per_year jsonb`, `in_sample jsonb`, `out_of_sample jsonb`, `gap_days int DEFAULT 0`, `passed_gate boolean DEFAULT false`, `error text`, `created_by uuid`, `created_at timestamptz`, `finished_at timestamptz` | partial unique index on `(rule_id, symbol) WHERE status IN ('queued','running')`; index `(rule_id, symbol, created_at DESC)` |
| `backtest_trades` | `id uuid PK`, `run_id uuid FK → backtest_runs ON DELETE CASCADE`, `trade_date date`, `side text` (LONG, SHORT), `entry_time timestamptz`, `entry numeric`, `stop numeric`, `target numeric`, `exit_time timestamptz`, `exit numeric`, `exit_reason text` (target, stop, time), `r_gross numeric`, `cost_r numeric`, `r_net numeric`, `is_oos boolean` | index `(run_id, entry_time)` |

Relationships: one run has many trades.

### State transitions

`backtest_runs.status`: `queued → running → done`, `queued → running → failed`. On backend boot, any run still `running` is marked `failed` with the error `interrupted by restart`, and `queued` runs are picked up again. `POST /runs` is all or nothing: if any requested rule and symbol pair is already active, the whole request returns 409. The runner yields to the event loop every 5,000 bars so the live scanner is never starved.

### API surface

All under `/api/v1/backtest`, guarded by `AdminGuard` (verifies the Supabase JWT, requires `app_metadata.role = 'admin'`).

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/runs` | POST | `ruleIds: string[]` (req), `symbols: ('NIFTY'\|'SENSEX')[]` (req) | `runIds[]`, `status: queued` | admin | 409 active run exists, 422 unknown rule or symbol |
| `/runs` | GET | `limit` (opt, default 50), `cursor` (opt) | runs with metrics, `nextCursor` | admin | 403 |
| `/leaderboard` | GET | none | the latest done run per rule and symbol, baselines included | admin | 403 |
| `/runs/:id/trades` | GET | `limit` (default 200), `cursor`, `oos` (opt bool) | trades page | admin | 404 |
| `/backfill` | POST | `symbols[]` (req) | `jobId`, chunks planned | admin | 409 backfill already running, 502 broker error |
| `/definitions` | GET | none | Rule definitions v1, cost model v1, gate constants | admin | 403 |

CLI: `npx ts-node src/scanner/backtest-cli.ts --backfill NIFTY,SENSEX` and `--run all --symbols NIFTY,SENSEX`, following the pattern of `replay-cli.ts`.

### Value sourcing

| Action | Value | Source |
|---|---|---|
| backfill | historical candles | Angel One `getCandleData`, NSE token for NIFTY, BSE token for SENSEX, from `instrumentFile.ts` |
| run | previous day high and low, daily ATR | `candles` where timeframe = `1d` |
| run | EMA5, EMA9, EMA15, ATR(14, 5m) | computed from 5m candles in the run (never stored) |
| run | `oos_start` | the trading date at the 70% index of distinct dates in the window |
| run | costs | Cost model v1 constant plus lot size from `instrumentFile.ts` |
| run | coin toss randomness | seeded PRNG, seeds 1..1000 |
| leaderboard | years positive | derived from `out_of_sample.per_year` |
| admin gate | role | `app_metadata.role` from the verified Supabase JWT |

### Key invariants

- Rule functions are pure: `(bars up to i, daily context) → signal | null`. They never read bar `i+1`.
- `r_net = r_gross − cost_r` for every trade.
- `passed_gate` uses only `is_oos = true` trades.
- At most one active run per rule and symbol (enforced by the partial unique index).

### Security model

- Admin only for the whole feature. `AdminGuard` is new and lives in `apps/backend/src/auth/`. It confirms the role with `supabase.auth.admin.getUserById` (cached 60 s), so an old token can't keep admin rights after the role is removed. The web checks the role server side in the page and hides the Sidebar and BottomNav entries for anyone else.
- RLS is on for all three new tables, with no policies for `anon` or `authenticated`. Only the backend service role reads and writes them.
- No secrets are stored. The broker session uses the existing Angel One credentials.

### Configuration required

No new env vars. The admin role is set once in Supabase: `app_metadata.role = 'admin'` on your user (an SQL snippet goes in the Follow-up).

### Critical test scenarios

- Happy path: a fixture of 5m bars yields the expected trades for each rule, with hand computed R and cost, verifies **AC-2**, **AC-3**, **AC-4**
- Lookahead: changing bar `i+1` never changes the signal at bar `i`, verifies **AC-3**
- Same bar stop and target counts as a stop, and a trade with no exit by 15:15 exits on time, verifies **AC-3**
- Gate: PF 1.09, 99 trades, 59% years positive, one full out of sample year, failing on SENSEX only, or below the coin median each fail, verifies **AC-7**
- A gap open through a stop entry fills at the open, not the trigger, verifies **AC-3**
- A second POST while a run is active returns 409, and `/runs` with one active pair among several returns 409 with no runs created, verifies **AC-8**
- Rule modules import nothing from the backtest runner (a lint or import test), verifies **AC-10**
- A non admin JWT gets 403 from the API, and the page redirects, verifies **AC-11**
- Backfill resumes after a simulated failure partway through, with no duplicate rows, verifies **AC-1**, **AC-12**

## Build plan

Tracer Bullet order (no approach is recorded in AGENTS.md or the scope header, so this assumes the default): get one rule through backfill, run, and the leaderboard end to end first, then add the others.

1. Migration: the `candles` unique key (deduplicating first), `backtest_runs`, `backtest_trades`, `backtest_locks`, plus RLS, satisfies **AC-1**, **AC-5**
2. `AdminGuard` (verify the JWT, check the role), and a web server side admin check with nav hiding, satisfies **AC-11**
3. Historical backfill service and CLI for NIFTY and SENSEX (5m and 1d), chunked, with retry, rate limit, and resume, satisfies **AC-1**, **AC-12**
4. Backtest core: bar loop, fills, exits, the 15:15 flat rule, the stop first tie break, Cost model v1, metrics, and the 70/30 split, satisfies **AC-3**, **AC-4**, **AC-5**
5. First rule `UP_ORB`, with the gate and persistence, and `POST /runs` and `GET /leaderboard`, satisfies **AC-2**, **AC-7**, **AC-8**
6. A minimal `/dashboard/backtest` leaderboard and Run button for that thread, satisfies **AC-9**
7. The remaining rules `GJ_PDHL`, `MR_EMA_PIN`, `SP_5EMA`, `AST_RG`, plus the `BASE_BUYHOLD` and `BASE_COIN` baselines, satisfies **AC-2**, **AC-6**
8. The full page: equity curve, per year table, trade drawer, definitions panel, and mobile cards, satisfies **AC-9**
9. Tests for the scenarios above, satisfies **AC-2**, **AC-3**, **AC-7**, **AC-8**, **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- Guru claims become numbers you can audit, down to the trade.
- Phase 2 can reuse the rule functions as they are, so what passed is what runs.
- It adds the app's first real authorization guard, which other admin features can reuse.

**Negative / tradeoffs**:
- Index spot data has no real fills. Costs are modelled as one futures contract, which is close but not exact.
- 5m bars can't tell the order of intrabar moves. Stop first is pessimistic and may understate rules with tight targets.
- Backfilling years of 5m data takes a while because of Angel One rate limits, and the candles table grows by around 300k rows.
- Results are expected to be mostly negative, as in the video. The lab may well promote nothing, and that is a valid outcome.

**Neutral**:
- In process runs share CPU with the scanner. Run them outside market hours (the UI warns between 09:15 and 15:30 IST).

## Follow-up

- [ ] Set `app_metadata.role = 'admin'` on your Supabase user: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '<you>';`
- [ ] Confirm how far back Angel One actually serves 5m index history for SENSEX (BSE). If it's short, the window shrinks and fewer years count toward the gate.
- [ ] Phase 2 spec (separate feature): live promotion. Per `(rule_id, symbol)` toggles in Settings, only allowed when `passed_gate`, guru setups in `multiStrategyEngine` on closed bars, a `GURU` SetupFamily, the gate cached 5 minutes, and blocked rules emitting no new signals.
- [ ] Later: a combination rule (`GJ_PDHL` levels with the `MR_EMA_PIN` filter), as a `v2` definition with its own fresh out of sample window.
