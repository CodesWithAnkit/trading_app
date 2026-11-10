# 0025. News Aware Trade Analysis

**Date**: 2026-11-10
**Status**: Proposed

## Summary

This spec puts the real, classified news from spec 0024 to work in two places. Live, one shared "news gate" checks every signal (scanner stocks, guru index signals, and the analysis page's Gate 06) against news published in the 60 minutes before it, and marks it pass, warn, or BLOCKED, without ever hiding it. In the backtest lab, each run gets a with/without comparison that shows whether that same gate would have improved results, on the days we actually collected news. Both use the same rule, so what the backtest proves is exactly what runs live.

## Structure

- [0025-live-news-gate.md](0025-live-news-gate.md): the shared gate rule, stored on every signal, re-checked when late news lands, and used by Gate 06. Supports the "block and warn live" decision.
- [0025-backtest-news-comparison.md](0025-backtest-news-comparison.md): the backtest lab's with/without news comparison, computed on request over covered days only. Supports the "prove the filter before trusting it" decision.

Related: [0024 Real News Ingestion](../0024-real-news-ingestion/index.md) is updated alongside this spec (admin only fetch, cancel and pause controls, HIGH news kept for good).

## Requirements

**User stories**:
- As a trader, I want a signal flagged when fresh news contradicts it, so that I don't trade into a news reaction.
- As a trader, I want to see blocked signals instead of losing them, so that I can judge later whether the block helped.
- As an admin, I want the backtest to show results with and without the news gate, so that I trust the gate only once the data supports it.

**Acceptance criteria** (umbrella level; each child refines its own):
- **AC-1**: One pure function decides the gate for a (symbol, side, time) from stored news, and both the live path and the backtest call it. Same inputs give the same answer in both.
- **AC-2**: The gate looks only at news published in the 60 minutes before the decision time (never after it), so the backtest has no look ahead.
- **AC-3**: News changes are visible, never silent: a blocked signal is still shown and its outcome still tracked.
- **AC-4**: Silence is never read as safe. If no fetch run finished `done` or `partial` in the 15 minutes before `at` during market hours (09:15 to 15:30 IST), for example because the schedule is paused or fetches failed, the result is at least `warn` with reason "News stale".

## Cross child contract: the news gate rule (v1, `news-gate-v1`)

Inputs: `symbol`, `side` (`LONG` | `SHORT` | `null` when unknown), `at` (an instant), and the candidate news items.

**Relevant items**: published in `[at − 60 min, at]`. For an index (`NIFTY`, `SENSEX`) only `symbol = 'MARKET'` items. For a stock, items for that symbol plus `MARKET` items.

**Decision**, first match wins:
| Result | When |
|---|---|
| `block` | a relevant `HIGH` item, `classified_by` in (`rules`, `gemini`), whose direction opposes `side` (`BEARISH` vs `LONG`, `BULLISH` vs `SHORT`) |
| `warn` | a relevant `HIGH` item that is `NEUTRAL`, `MIXED`, or `classified_by = 'default'`; or a relevant `HIGH` item with any direction when `side` is null |
| `warn` | a relevant `MEDIUM` item, classified by `rules` or `gemini`, opposing `side` |
| `warn` | a stock's own `EARNINGS` item, or a filing matching the rules v1 board meeting pattern, published the same IST day before `at` (any time that day, not only the 60 minutes) |
| `warn` | news is stale (AC-4): no `done` or `partial` fetch run finished in the 15 minutes before `at`, when `at` is in market hours |
| `pass` | otherwise |

Inputs also include `lastGoodFetchAt` (the latest `finished_at` of a `done` or `partial` run at or before `at`, from `news_fetch_runs`). The same day earnings and board meeting check uses its own candidate list (that symbol's items the same IST day, any impact), because the main list is window limited. The board meeting pattern is exported from `news.rules.ts` and reused, not copied.

Output: `{ result, reason, itemIds, items: [{ id, headline, sourceUrl, publishedAt }], ruleVersion: 'news-gate-v1' }`. `reason` names each deciding item briefly (for example "HIGH Bearish (Rule): SEBI order on X, 14:05"). `MIXED` never blocks.

Versioning: a rule change is `news-gate-v2`, never an edit in place (same convention as the backtest's definitions and gate).

## Decision

**Chosen option**: Option 2: one shared, pure news gate used by live signals and the backtest, with live decisions stored on the signal and the backtest comparison computed on request.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase-postgres-best-practices` (migration)

## Build plan

Build order (end to end slices, Tracer Bullet by default since no approach is recorded): the gate function first, then the live path through to the page, then the backtest comparison, which only becomes useful as news history grows.

1. Gate function `news-gate-v1` with fixtures, satisfies **AC-1**, **AC-2** (detail in the live child, task 1)
2. Live news gate, child [0025-live-news-gate.md](0025-live-news-gate.md) build plan, satisfies **AC-3**
3. Backtest comparison, child [0025-backtest-news-comparison.md](0025-backtest-news-comparison.md) build plan, satisfies **AC-1**, **AC-2**

Prerequisite: spec 0024's update (HIGH news kept for good) must land before the comparison has more than 30 days of history.

## Consequences

**Positive**:
- Gate 06 stops passing on a meaningless rule, and every signal carries an explainable news verdict.
- The backtest measures the exact live rule honestly, with no look ahead.

**Negative / tradeoffs**:
- The comparison is thin for months: news collection started 2026-11-10, so early results will show a small sample, flagged as such.
- A wrong classification can block a good signal. Mitigated by never blocking on unclassified items and by showing, not hiding, blocked signals.
- An RBI or budget day will warn or block many stock signals at once, because `MARKET` items apply to every stock.

**Neutral**:
- One migration adds four nullable columns to `signals`; no new tables.

## Follow-up

- [ ] Once 3 months of covered days exist, review the comparison and decide whether `news-gate-v2` should change the window or the blocking rule.
- [ ] The analysis page computes its trade plan with a hardcoded `LONG` direction; a separate fix should take the direction from the real setup (outside this spec, which only reads the latest active signal).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
