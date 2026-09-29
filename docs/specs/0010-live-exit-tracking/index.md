# 0010. Live exit tracking for trade plans

**Date**: 2026-09-29
**Status**: In Progress

## Summary

Today a signal tells you where to enter, with a stop and a target, but nothing watches it afterwards, so you never hear "exit now". This spec tracks every plan live from the moment it fires. On each tick it checks the price against the target and the stop, closes any plan still open at 15:15 IST, and pushes an exit alert to the dashboard. It also stops the same strategy firing twice on a stock while its first plan is open. The end of day reconciliation (spec 0009) stays as an independent check.

## Requirements

**User stories**:
- As a trader, I want to be told the moment a plan hits its target or stop, so I exit at the right time instead of watching every chart.
- As a trader, I want every open plan closed before the market closes, so I never carry an intraday position overnight.
- As a trader, I want one plan per setup per stock, so duplicate signals don't clutter the dashboard or distort the stats.

**Acceptance criteria**:
- **AC-1**: Every new plan is tracked live from the moment it fires, with entry = its reference entry. Tracking continues until it exits, even if the stock drops out of the top 20 gainers.
- **AC-2**: On every tick for a stock with an open LONG plan: last traded price at or above the target closes it as `TARGET_HIT`; at or below the stop closes it as `STOP_HIT`. The exit price is that tick's price, the exit time is the tick's time, and P&L % is measured from the entry.
- **AC-3**: At 15:15 IST, every plan still open closes as `TIME_EXIT` at the stock's last traded price. No new plan opens at or after 15:15.
- **AC-4**: While a plan is open for a stock and strategy, that strategy cannot open another plan for that stock. Other strategies on the same stock can.
- **AC-5**: Each exit updates the signal's `status`, `exit_price`, `exit_at`, and `exit_reason`, and appends one row to `signal_status_history` (from `ACTIVE` to the new status). An exit is recorded exactly once.
- **AC-6**: Each exit is pushed over the live stream as `signal:exit`. The dashboard shows a toast ("Exit RELIANCE: target hit at ₹1,474.00, +1.60%") and moves the signal from Active Signals to a "Closed today" list showing its reason, exit price, time, and P&L.
- **AC-7**: After a backend restart during the session, today's open plans are reloaded from `signals` and tracked again. A plan whose level was crossed while the backend was down closes on the first tick after restart, at that tick's price. A restart at or after 15:15 closes today's open plans immediately as `TIME_EXIT`, and any `ACTIVE` plan from an earlier day is closed at startup as `TIME_EXIT` marked stale.
- **AC-8**: `GET /api/v1/scanner/top-setups`, `/analysis/:symbol`, and `/outcomes` return the exit fields (`exitPrice`, `exitAt`, `exitReason`) and today's closed plans alongside open ones. The Active Signals list and counts show `status = ACTIVE` only.
- **AC-9**: The after hours comparison (spec 0009 AC-9) shows the live exit as the primary result and the 15:32 candle based outcome beside it, labelled "candle check", so a difference is visible.

## Decision

Track every plan in memory, keyed by stock and strategy. Check the plan on every tick against the target and the stop. Close any remaining plans at 15:15 IST. Persist each exit once, with a conditional update, plus a status history row. Push a `signal:exit` event that the dashboard turns into a toast and a "Closed today" entry. The 15:32 reconciliation (spec 0009) keeps its candle high and low rule as an independent audit, so the two can differ on a spike tick. That is expected and visible, not a bug.

**Implementation skills**: `supabase` (`.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`.agents/skills/supabase-postgres-best-practices/`) · `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Entity | Field | Type | Notes |
|---|---|---|---|
| `signals` (existing) | `exit_price` | NUMERIC | Nullable. Set once, at exit. |
| `signals` (existing) | `exit_at` | TIMESTAMPTZ | Nullable. The exit tick's time (or 15:15 for a time exit). |
| `signals` (existing) | `exit_reason` | TEXT | Nullable. `TARGET`, `STOP`, or `TIME` (check constraint). |
| `signals` (existing) | `status` | TEXT | Gains `TARGET_HIT`, `STOP_HIT`, `TIME_EXIT` alongside `ACTIVE` (the column has no check constraint today; none is added). Only `ACTIVE` can move to one of these, never back. `status` is what screens read; `exit_reason` is the compact reason for reports. |
| `close_signal_plan(signal_id, to_status, exit_price, exit_at, exit_reason)` | Postgres function (RPC) | new | In one transaction: `UPDATE signals ... WHERE id = signal_id AND status = 'ACTIVE' RETURNING id`, and only if a row changed, `INSERT` the history row. Returns whether it closed the plan. |
| `signal_status_history` (existing, append only) | `signal_id`, `from_status`, `to_status`, `event_time` | as is | One row per exit. |

No new tables. Index `signals (status, created_at)` for the restart reload. The 30 minute `expires_at` already on each signal stays as an "entry window" label only (don't enter after it). It never closes a plan.

**Plan lifecycle**: `ACTIVE` goes to exactly one of `TARGET_HIT` (tick at or above target), `STOP_HIT` (tick at or below stop), or `TIME_EXIT` (15:15 IST). All three are final.

**API surface**:

| Endpoint / event | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/scanner/stream` event `signal:exit` | SSE | none | `{ id, symbol, setup, reason: 'TARGET'\\|'STOP'\\|'TIME', exitPrice, exitAt, pnlPct }` | none (internal) | connection errors |
| `/api/v1/scanner/top-setups` | GET (enhanced) | `?include=approaching` | today's signals, open and closed, each with `status`, `exitPrice`, `exitAt`, `exitReason` | none | 500 |
| `/api/v1/scanner/analysis/:symbol` | GET (enhanced) | symbol | as today, signal carries exit fields | none | 404 |
| `/api/v1/scanner/outcomes` | GET (enhanced) | `?date` | each outcome also carries the live exit fields | none | 404, 500 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Open plan index | stock + strategy → plan (with direction, entry, stop, target, fired time) | reserved synchronously when a candidate passes, before the database insert, then given the inserted `id` (released if the insert fails); at startup, `signals` rows with `status = 'ACTIVE'` created today (IST); a row with a missing or malformed snapshot is skipped and logged |
| Entry | plan entry | `snapshot_json.reference_entry` (the trigger close) |
| Stop, target | plan levels | `snapshot_json.stop.level`, `signals.target_1` (via `signalMapper` helpers) |
| Hit check | price compared | each Quote mode tick's `ltp` for that stock (spec 0009 AC-14) |
| Exit price, exit time | recorded exit | the hitting tick's `ltp` and `timestamp`; for a time exit, the stock's last `latestTicks` price, else its last saved 1m candle close, else the entry (flagged stale), at 15:15:00 IST |
| Exit write | status, exit fields, history row | the `close_signal_plan` RPC, atomically |
| P&L % | exit result | `(exitPrice - entry) / entry * 100`, rounded to 2 decimals (LONG) |
| 15:15 time | time exit trigger | `@Cron('0 15 15 * * 1-5', { timeZone: 'Asia/Kolkata' })` |
| No new plans after 15:15 | entry gate | IST minute of the trigger candle (not the wall clock) ≥ 15:15 → skip; the 15:15 time exit sweep runs before any 15:15 candle evaluation |
| Tick validity for exits | which ticks can close a plan | `ltp > 0`, tick time after the plan's fired time, and IST time between 09:15 and 15:15 |
| Toast once | whether to toast | live `signal:exit` events only, skipped for an `id` already closed in client state or already toasted this session |
| Toast text, closed list | UI | the `signal:exit` payload; the closed list is today's signals with a final status |

**Key invariants**:
- A plan exits exactly once. It is removed from the in memory index before the database write, and the write is conditional on `status = 'ACTIVE'`, so a second attempt changes nothing.
- A plan is never closed by anything other than target, stop, or 15:15. The entry window label never closes it.
- No plan opens at or after 15:15 IST.
- At most one open plan per stock and strategy at any time.
- A stock leaving the top 20 never closes or hides its open plan.
- The daily reset (09:00 IST, spec 0009) does not silently drop open plans: any plan still `ACTIVE` from an earlier day is closed as a stale `TIME_EXIT` (at the reset, and again at startup).
- A plan is in the book before its insert completes, and the current price is checked as soon as it is added, so a hit during the insert is never missed. Two candidates of the same strategy on one stock in one pass cannot both open.
- Exits and their history rows are written together or not at all (the RPC).

**Security model**:
No auth changes. The endpoints stay internal (same origin), and the frontend only reads exits.

**Configuration required**:
None. Times are constants in code: the 15:15 time exit, in IST.

**Failure and edge cases**:
- Database write fails on exit: the SSE alert still goes out, the error is logged, and the write is retried once. If it still fails, the plan stays `ACTIVE` in the database; after a restart it can exit again at a different price and alert twice. This is accepted and logged loudly, and the 15:32 candle check still records a result.
- No tick for a stock near 15:15 (stale feed): time exit at the last known price, logged as stale if older than 5 minutes.
- A plan with its stop at or above its entry (a bad strategy plan) closes as `STOP_HIT` on its first tick. The replay flags these plans (spec 0009 AC-17); fixing the strategies is separate work.
- Restart between a hit and its write: the reload finds the plan `ACTIVE` and closes it on the next tick that crosses a level. That tick may be at a different price than the missed one.
- An SSE disconnect during an exit: the exit shows as a state change after the stream's reconnect snapshot, without a toast. That is acceptable.
- A bad tick (price 0) or a pre open or auction tick never closes a plan.

**Critical test scenarios**:
- Target hit: a plan with entry 100, target 102, stop 99 gets ticks 100.5, then 102.1 → `TARGET_HIT` at 102.1, +2.10%, one history row, one `signal:exit` event, verifies **AC-2**, **AC-5**, **AC-6**
- Stop hit: ticks 99.6, then 98.9 → `STOP_HIT` at 98.9, −1.10%, verifies **AC-2**
- Exactly once: two ticks past the target in the same millisecond close the plan once, and a second conditional update affects 0 rows, verifies **AC-5**
- Time exit: an open plan at 15:15 with last price 101.2 → `TIME_EXIT` at 101.2, +1.20%; a trigger at 15:16 opens no plan, verifies **AC-3**
- Dedupe: VWAP fires on RELIANCE while its VWAP plan is open → no new plan; ORB fires on RELIANCE → new plan, verifies **AC-4**
- Leaves top 20: a stock with an open plan drops to rank 30 and later hits its target → closed and alerted, verifies **AC-1**
- Restart: two `ACTIVE` plans from today are reloaded; the first tick above one's target closes it, verifies **AC-7**
- Dashboard: a `signal:exit` event shows the toast, and the card moves to "Closed today" with the reason and P&L, verifies **AC-6**
- API: `top-setups` returns a closed plan with `exitReason: 'TARGET'` and its price and time, and the Active list excludes it, verifies **AC-8**
- Insert race: a tick past the target arrives while the insert is still in flight → the plan closes once, right after the insert returns its id, verifies **AC-2**, **AC-5**
- Downtime at 15:15: a restart at 15:20 closes today's open plans as `TIME_EXIT` at once; an `ACTIVE` plan from yesterday closes as stale, verifies **AC-7**
- Bad tick: a tick with price 0 does not close a plan, verifies **AC-2**
- Two verdicts: a plan closed live as `TARGET_HIT` whose candle check says `LOST` shows both, labelled, verifies **AC-9**

## Build plan

Thin end to end first (Tracer Bullet, the default, since no build approach is recorded): one plan exits on a tick and the dashboard shows it, then the time exit, dedupe, and restart are added.

1. **Migration**: add `exit_price`, `exit_at`, and `exit_reason` (with a check constraint for `TARGET`, `STOP`, `TIME`) to `signals`, an index on `signals (status, created_at)`, and the `close_signal_plan` function. Apply it and confirm it is live, satisfies **AC-5**
2. **Plan tracker (pure)**: new `apps/backend/src/scanner/plans/` with `checkExit(plan, price)` (TARGET, STOP, or none), `pnlPct`, and a `PlanBook` keyed by symbol and strategy (add, has, take, all), unit tested, satisfies **AC-2**, **AC-4**
3. **Wire ticks to exits**: reserve the plan in the book before inserting the signal, attach the inserted `id` (release on failure), and check the current price at once. On every valid tick, check that stock's open plans; on a hit, take it from the book, call `close_signal_plan`, and emit `signal:exit`, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-6**
4. **Mapper and API fields**: `toApiSignal` adds `exitPrice`, `exitAt`, `exitReason`; `top-setups`, `analysis`, and `outcomes` return them, satisfies **AC-8**
5. **Dashboard**: `SignalContext` handles `signal:exit` (updates the signal and raises a toast once per id); a small toast component; the Signal type gains the exit fields and statuses; Active Signals shows `ACTIVE` only; a "Closed today" list under it; the after hours comparison shows the live exit plus the labelled candle check, satisfies **AC-6**, **AC-8**, **AC-9**
6. **Time exit and entry gate**: the 15:15 IST cron closes every open plan at its last price; `evaluateStrategy` skips triggers at or after 15:15, satisfies **AC-3**
7. **Dedupe**: `evaluateStrategy` skips a candidate whose stock and strategy already has an open plan in the book, satisfies **AC-4**
8. **Restart reload and catch up**: on startup, close `ACTIVE` plans from earlier days as stale `TIME_EXIT`; if it is 15:15 or later, close today's too; otherwise load today's `ACTIVE` signals into the book before ticks are processed. The 09:00 reset does the same stale sweep, satisfies **AC-7**

## Consequences

**Positive**:
- You get a real "exit now" moment for every plan, plus a hard stop on intraday positions at 15:15.
- Duplicate signals disappear, so the dashboard and the stats count each plan once.
- The live exit and the end of day reconciliation give two views of each plan, which makes the strategies easier to judge.

**Negative / tradeoffs**:
- Tick checking can exit on a single spike that the candle close would not confirm; the live P&L can then differ from the 15:32 reconciliation's.
- Exit prices are the tick price with no slippage or costs, so real results will be slightly worse.
- A restart can miss a level crossing that reversed while the backend was down; that plan then exits later, at a different price.
- More write traffic at 15:15 (every open plan at once), though small in absolute terms.

**Neutral**:
- Plans stay LONG only; SHORT tracking comes when a strategy produces SHORT plans.
- `lifecycle.ts` in the strategy engine stays unused; this spec's lifecycle is the live one.

## Follow-up

- [ ] Browser notifications with sound for exits (needs a browser permission)
- [ ] Trailing stops or momentum fade exits, once replays show whether they help
- [ ] SHORT plans and their exit rules, when a strategy produces them
- [ ] Replace the random confidence score (see spec 0009 Follow-up)
