# 0025 · Backtest News Comparison

## Summary

Each backtest run gets a "with and without news" comparison: its trades on days we collected news are scored twice, once as they are and once skipping the trades the live news gate would have blocked at entry. It is computed when you open a run, so it improves by itself as news history grows, and it shows the sample size so a thin result is obvious. It uses only news we collected, no historical backfill.

## Requirements

**Acceptance criteria**:
- **AC-1**: `GET /api/v1/backtest/runs/:id/news-comparison` (admin only) returns the comparison for a `done` run, computed on request from `backtest_trades` and stored news. Nothing is written.
- **AC-2**: Only covered trades count. A trade is covered when a `news_fetch_runs` row with status `done` or `partial` finished in the 15 minutes before its `entry_time` (the same staleness rule live uses; `cancelled` and `failed` runs never cover). The response reports `coveredDays` (IST days with at least one covered trade), `coveredTrades`, and `totalTrades`.
- **AC-3**: Each covered trade is judged by `news-gate-v1` with the run's symbol, the trade's `side`, and `at = entry_time` (so only news published in the 60 minutes before entry counts, `MARKET` items only, since runs are NIFTY or SENSEX).
- **AC-4**: The response shows metrics for "without filter" (all covered trades) and "with filter" (covered trades minus `block` trades): trades, win rate, net R, profit factor, max drawdown R, computed by the lab's existing metrics. It also lists each blocked trade (date, side, net R, deciding item ids and reason) and counts `warn` trades (warn never removes a trade).
- **AC-5**: When `coveredTrades` is under 30, the response sets `sampleTooSmall: true` and the page says so next to the numbers. With zero covered days the page shows "No news coverage in this run's window yet".
- **AC-6**: The backtest run page shows this comparison as a panel, with the gate version (`news-gate-v1`) and the coverage counts.

## Feature design

**Data model**: none. Reads `backtest_runs`, `backtest_trades`, `news_and_events`, `news_fetch_runs`.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/backtest/runs/:id/news-comparison` | GET | `id` | `{ runId, symbol, gateVersion, coveredDays, coveredTrades, totalTrades, sampleTooSmall, without: Metrics, with: Metrics, blocked: [{ tradeDate, side, rNet, itemIds, reason }], warnedTrades }` | admin (AdminGuard, like the rest of the lab) | 404 unknown run, 409 run not `done` |

**Computation**:
1. Load the run's trades (`entry_time`, `exit_time`, `side`, `entry`, `stop`, `target`, `r_gross`, `cost_r`, `r_net`, `trade_date`, `is_oos`).
2. Coverage: load `done`/`partial` run `finished_at` times within the run's window once, and mark each trade covered per AC-2.
3. Load `MARKET` news with `published_at` from (first covered entry − 60 min) to last covered entry, in one query.
4. For each covered trade, `evaluateNewsGate({ symbol, side, at: entry_time }, items)`.
5. Metrics via `engine/metrics.ts`: map each `backtest_trades` row to `SimTrade` field by field (a mechanical rename, no recomputation), call `computeMetrics(subset, new Set())` (empty `fullYears`, since per year results are not shown), and return only trades, win rate, net R, profit factor, max drawdown R (`perYear` is dropped).
6. Trades whose news check would fail on `at` outside market hours are judged without the staleness rule (backtest entries are always in market hours under precision rules v1).

**Value sourcing**:
| Action | Value | Source |
|---|---|---|
| comparison | trades, side, entry time, net R | `backtest_trades` for the run |
| comparison | symbol, window | `backtest_runs.symbol`, `window_start`, `window_end` |
| comparison | covered trade | a `news_fetch_runs` row, status `done` or `partial`, `finished_at` in `[entry_time − 15 min, entry_time]` |
| comparison | gate verdict per trade | `evaluateNewsGate` (live child), items from `news_and_events` with `symbol = 'MARKET'`, `is_seed = false` |
| comparison | metrics | `engine/metrics.ts` `computeMetrics` |
| comparison | sample flag | `coveredTrades < 30` |

**Key invariants**:
- No look ahead: only items with `published_at <= entry_time` are considered.
- The endpoint never writes; repeating it with unchanged data gives the same answer.

**Security model**: admin only, same as every backtest endpoint (spec 0020, AdminGuard from spec 0021).

**Critical test scenarios**:
- A trade with a HIGH Bearish `MARKET` item 30 minutes before a LONG entry is blocked; the same item 10 minutes after entry is ignored, verifies **AC-3**
- A trade with no good fetch in the 15 minutes before entry is excluded from both sides and from `coveredTrades`, even on a day with earlier good fetches, verifies **AC-2**
- With filter metrics exclude exactly the blocked trades; warned trades stay, verifies **AC-4**
- 12 covered trades returns `sampleTooSmall: true`; a run with no covered days returns zeros and the page shows the coverage message, verifies **AC-5**
- A non admin gets 403; a `running` run gets 409, verifies **AC-1**

## Build plan

1. Comparison service in `backtest/` using `evaluateNewsGate` and `computeMetrics`, with fixture tests, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
2. Admin endpoint on `backtest.controller.ts`, satisfies **AC-1**
3. Web: comparison panel on the backtest run view, satisfies **AC-5**, **AC-6**

## Rationale (short)

Computed on request because its value grows every day of collection; covered days only so uncovered history doesn't dilute the result; past only window so the result reflects what live can actually do. Full reasoning in [rationale.md](rationale.md).
