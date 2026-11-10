# 0023. Guru Strategy Live Promotion

**Date**: 2026-11-10
**Status**: In Progress

## Summary

This spec lets an admin switch on, for live use, a guru rule that passed the backtest gate ([0020](../0020-guru-strategy-backtest-lab/index.md)), on the same index it passed on (NIFTY or SENSEX). A live rule runs the exact same pure rule function as the backtest, on closed 5 minute index bars, and shows up as a normal signal card with a `GURU` tag and a link to its backtest evidence. Long and short signals are supported. If a newer backtest fails the gate, the rule stops emitting new signals within 5 minutes, without anyone touching it. No order is ever placed automatically.

## Requirements

**User stories**:
- As the admin, I want to switch a passing rule on for the index it passed on, so that I get its signals live.
- As the admin, I want a rule that later fails the gate to stop signalling by itself, so that a stale pass never keeps trading.
- As the admin, I want guru signals to look and behave like my other signals, clearly tagged, with their evidence one click away.

**Acceptance criteria**:
- **AC-1**: `strategy_live_toggles` stores `(rule_id, symbol, enabled)`. In the Backtest Lab, each guru row whose rule has `passed_gate = true` shows a "Live" switch for that symbol. Turning it on via `PATCH /api/v1/backtest/toggles/:ruleId/:symbol` is refused with 409 unless that rule's latest done run passes the gate, and only `GURU_RULES` ids (not baselines) are allowed (422). Turning it off is always allowed.
- **AC-2**: The live engine subscribes to the NIFTY and SENSEX index feeds whenever at least one toggle is enabled for that symbol. The exchange type is mapped from the instrument file's `exch_seg` (`NSE` → 1, `BSE` → 3), and a live SENSEX tick arriving is part of verify. It builds 5 minute bars with the existing `CandleAggregator`, persisting them to `candles` like other symbols. Index ticks carry no volume, so bars have volume 0, and no guru rule reads volume. Enabled rules are evaluated only on closed bars, with entries between 09:15 and 14:45 IST, the same `maxTradesPerDay`, and one open position per rule and symbol.
- **AC-3**: Warm up and daily context come from `candles`: the last 400 `5m` bars and 30 `1d` bars for the symbol, with daily bars derived from stored 5m bars for any day missing a `1d` row. A rule that lacks the warm up the backtest uses (30 bars, and 15 prior days for daily ATR when the rule needs it) is shown as `warming up` and emits nothing.
- **AC-4**: CLOSE orders become a signal at that bar's close. STOP orders are watched on the next bar's ticks: the signal fires only if price crosses the trigger. It fires at `max(first tick, trigger)` for longs and `min` for shorts. OCO pairs (`GJ_PDHL`) cancel the other leg on fill, and an untriggered one bar order creates no signal at all. Fill and exit logic is one shared function used by both `simulate()` and the live engine: the backtest passes its slippage points, and live passes 0 (a real price needs no modelled slippage). Stop and target are computed from the actual entry with the rule's R multiple.
- **AC-5**: A guru signal is a normal signal row and card. `snapshot_json` carries `setupFamily: 'GURU'`, `direction` (`LONG` or `SHORT`), and `guru = { ruleId, symbol, runId, oosProfitFactor, oosYearsPositive, definitionsVersion }`. `runId` is the latest done run for **that rule and symbol**, pinned when the signal fires. The signal mapper and the web `Signal` type gain a `GURU` branch, and the SSE `signal:new` payload shape is unchanged. The card shows a `GURU · <ruleId>` tag and an evidence chip linking to `/dashboard/backtest?run=<runId>`. Risk gates: the stock only checks (eligibility, liquidity, price band) are skipped for guru index signals. The R:R validity check and the one open plan rule still apply.
- **AC-6**: Guru plans use the existing plan book (already direction aware), keyed `symbol | setup` with `plan.setup = ruleId`, so rules never collide. A filled guru signal stays open until its stop, its target, or the time exit at the close of the 15:10 bar (15:15 IST), using the scanner's existing time exit path. P&L sign is correct for shorts. Existing LONG strategy plans behave exactly as before.
- **AC-7**: The engine checks each enabled rule's gate (`passed_gate` on its latest done run) at most every 5 minutes (cached). When it no longer passes, the rule is `blocked`: no new signals, open signals expire normally, and the toggle stays on. It resumes by itself when a later run passes.
- **AC-8**: The lab shows each toggle's state as `off`, `no run` (no done run for that rule and symbol; can't be switched on), `live`, `warming up` or `blocked` (with the reason). `GET /toggles` lists every guru rule and symbol pair, including pairs with no row yet. Settings shows a read only "Live guru rules" list. Only admins can see or change toggles (`AdminGuard`, spec 0021).
- **AC-9**: Nothing places an order. Guru signals use the same manual journal flow as other signals.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Decision

**Chosen option**: a separate `GuruLiveService` in the scanner module that subscribes to the two index feeds on demand, runs the pure `guru/` rules on closed 5 minute index bars, and emits through the existing signal pipeline with a `GURU` family and a direction. Toggles live in the admin only backtest API.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Feature design

**Data model**:
| Table | Columns | Constraints |
|---|---|---|
| `strategy_live_toggles` (new) | `rule_id text`, `symbol text`, `enabled boolean NOT NULL DEFAULT false`, `updated_by uuid`, `updated_at timestamptz DEFAULT now()` | PK `(rule_id, symbol)`, RLS on, service role only |
| `signals` (existing) | no new columns. Guru data goes in `snapshot_json` (`setupFamily`, `direction`, `guru`) | none |

`SetupFamily` gains `'GURU'`.

**State per (rule, symbol)** (in memory, derived): `off` (toggle off) · `no run` (no done run for the pair) · `warming up` (insufficient bars) · `live` · `blocked` (gate no longer passes). The derivation is checked on every closed bar, using the 5 minute gate cache.

**API surface** (all `AdminGuard`):
| Endpoint | Method | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `/api/v1/backtest/toggles` | GET | none | `[{ ruleId, symbol, enabled, state, reason, updatedAt }]` | 401, 403 |
| `/api/v1/backtest/toggles/:ruleId/:symbol` | PATCH | `{ enabled: boolean }` | the toggle with state | 404 unknown rule or symbol, 409 not passing, 422 baseline rule |

**Value sourcing**:
| Value | Source |
|---|---|
| index tokens and exchanges | `downloadIndexInstruments()` (instrument file; NIFTY `NSE`, SENSEX `BSE`) |
| feed exchange type | instrument file `exch_seg`: `NSE` → 1, `BSE` → 3 (checked by a live tick in verify) |
| plan identity | plan book key `symbol | ruleId` (`plan.setup = ruleId`) |
| live slippage | 0 (actual tick price); backtest keeps `costModel.slippagePoints` |
| live bars | existing `CandleAggregator` on index ticks, persisted to `candles` like other symbols |
| warm up bars, daily context | `candles` (`5m` last 400, `1d` last 30, missing days derived from `5m`) |
| entry, stop, target | the guru rule's `Order`, with the fill rule above and the same R multiple |
| gate status | latest done `backtest_runs` row for the rule (`passed_gate`), cached 5 min |
| evidence run | latest done run for the same rule **and symbol**, pinned at fire time |
| evidence values | that run's `out_of_sample.profitFactor`, years positive from `out_of_sample.perYear`, `definitions_version` |
| `updated_by` | `CurrentUser().id` |

**Key invariants**: only `GURU_RULES` can be toggled; a toggle can only turn on while the rule passes; one open guru plan per rule and symbol; no evaluation on an unclosed bar; LONG strategy behavior unchanged.

**Security model**: toggles are admin only (API and UI). Signals reach users through the existing signed in pipeline (spec 0021).

**Configuration required**: none new.

**Critical test scenarios**:
- A toggle on a failing or baseline rule is refused (409 / 422), verifies **AC-1**
- A fixture of index bars through the live service produces the same entries as `simulate()` for the same day, verifies **AC-2**, **AC-4**
- A stop order that never triggers emits nothing, and an OCO fill cancels the other leg, verifies **AC-4**
- A short plan exits at stop or target and at 15:15 with the right P&L sign, two guru rules on NIFTY never collide in the plan book, and a long stock plan is unchanged, verifies **AC-6**
- `simulate()` results are identical before and after moving fills into the shared function, verifies **AC-4**
- A pair with no done run shows `no run` and can't be enabled, verifies **AC-8**
- A newer failing run blocks new signals within the cache window, and a later pass resumes them, verifies **AC-7**
- With too few stored bars, the rule shows `warming up` and emits nothing, verifies **AC-3**

## Build plan

Tracer Bullet: one rule, one index, end to end first.

1. Migration for `strategy_live_toggles`, and the toggles API with gate checks, satisfies **AC-1**
2. `GuruLiveService`: index subscription on demand (NSE 1, BSE 3), 5 minute bars, warm up loading, `UP_ORB` on NIFTY end to end to a LONG/SHORT signal with the `GURU` family and evidence, satisfies **AC-2**, **AC-3**, **AC-5**
3. Stop entry watching on the next bar's ticks, OCO, and the other four rules, satisfies **AC-4**
4. Shared fill and exit function used by `simulate()` and live (slippage passed in). Guru plans on the existing direction aware plan book (`setup = ruleId`), with the 15:15 time exit and the risk gate skips, satisfies **AC-4**, **AC-5**, **AC-6**
5. Gate cache, blocked and resume behavior, and state derivation, satisfies **AC-7**
6. Lab Live switches with states, the Settings read only list, and the signal card tag and evidence chip, satisfies **AC-1**, **AC-5**, **AC-8**
7. Tests for the scenarios above, satisfies **AC-1** to **AC-9**

## Consequences

**Positive**: rules that earned it can go live with exactly the tested logic. Untested ideas can't, and stale passes stop on their own.
**Negative**: two more WebSocket subscriptions and index bars to store. Moving fills into a shared function touches the tested backtest engine (its tests must stay green). Nothing can go live until history loads and a rule actually passes, and spec 0020 predicts that may be none.
**Neutral**: index signals are traded by you through futures or options. The app doesn't map them to a contract.

## Follow-up

- [ ] Depends on spec 0022 (history must load) and on at least one rule passing the gate before anything can go live.
- [ ] Later, maybe: backtest rules on F&O stocks before allowing stock promotion (a 0020 extension).
