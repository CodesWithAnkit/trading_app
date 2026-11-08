# 0022. Backtest History Provider

**Date**: 2026-11-08
**Status**: In Progress

## Summary

The backtest lab ([0020](../0020-guru-strategy-backtest-lab/index.md)) cannot load history: Angel One logs in fine but rejects every historical candle call with `AG8004 Invalid API Key`. This spec makes the history source pluggable (a setting picks which provider fetches candles) and targets Zerodha Kite Connect for one month to backfill about ten years of 5 minute NIFTY data. Angel One stays as the free option if they fix the key. If Kite has no SENSEX index history, the gate judges on NIFTY alone and says so.

## Requirements

**User stories**:
- As the admin, I want to backfill from whichever provider actually serves history, without rewriting the backfill.
- As the admin, I want an honest result if SENSEX history is unavailable, instead of a lab that can never pass.

**Acceptance criteria**:
- **AC-1**: The backfill takes a provider from `HISTORY_PROVIDER` (`angelone` default, or `kite`), or from `--provider` on the CLI. The provider returns the same candle rows into `candles`. Resume, lock, retry and gap handling from 0020 are unchanged.
- **AC-2**: The Angel One provider also accepts an optional `ANGEL_ONE_HISTORICAL_API_KEY`. When set, it's used for `getCandleData` only, and the trading key stays for everything else. An `AG8004` response fails the chunk with the message "Angel One rejected historical data for this API key (AG8004). See docs/specs/0022." and is not retried.
- **AC-3**: The Kite provider fetches `5minute` and `day` candles for NIFTY 50 (NSE) and SENSEX (BSE) from the Kite instruments list, in date windows within Kite's per request limit, respecting its rate limit. *Blocked on the open item below (token flow).*
- **AC-4**: If the chosen provider has no history for a symbol (instrument missing or zero rows over the whole window), the backfill records it as `unavailable` and the run is skipped for that symbol with that reason. It is not counted as a failure.
- **AC-5**: When a symbol is `unavailable`, the gate judges on the symbols that have data. The leaderboard and CLI show "Gate judged on NIFTY only: SENSEX history unavailable from <provider>". The 0020 rule "must pass on both" applies whenever both have data.
- **AC-6**: Each candle row keeps no provider column. The source used for a backfill is recorded in the backfill log, and each run stores `history_provider` in `cost_model.notes`, so a result can be traced to its data.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Decision

**Chosen option**: a pluggable `CandleFetcher` provider (`angelone`, `kite`), with Kite Connect as the planned source for one month of ten year backfill. Angel One is kept and improved with a separate historical key setting and a clear AG8004 message. If SENSEX is unavailable, the gate falls back to NIFTY only, labelled clearly.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`)

## Feature design

**Data model**: no new tables. `backtest_runs.out_of_sample.gate` gains `judgedOn: string[]` and `unavailable: { symbol, provider }[]`. `BackfillState` (in memory) gains `provider` and per series `unavailable: boolean`.

**API surface**: unchanged routes. `POST /api/v1/backtest/backfill` accepts optional `provider` (default `HISTORY_PROVIDER`). It returns 422 for an unknown provider, and 409 when `kite` is requested with no token flow configured.

**Value sourcing**:
| Value | Source |
|---|---|
| provider | `--provider` flag, else request body `provider`, else env `HISTORY_PROVIDER`, else `angelone` |
| Angel historical key | env `ANGEL_ONE_HISTORICAL_API_KEY`, else `ANGEL_ONE_API_KEY` |
| Kite API key and secret | env `KITE_API_KEY`, `KITE_API_SECRET` |
| Kite access token | **open item**, not decided (see Follow-up) |
| Kite instrument tokens | Kite instruments dump, `tradingsymbol` `NIFTY 50` (NSE) and `SENSEX` (BSE), segment `INDICES` |
| Kite window size and rate | Kite historical API documentation, checked at build time (Step 2.6 doc check) |
| symbol unavailable | zero rows from the provider for the full window, or instrument not found |

**Security**: Kite and Angel secrets live only in the backend env. Access tokens are never logged.

**Configuration required**: `HISTORY_PROVIDER`, `ANGEL_ONE_HISTORICAL_API_KEY` (optional), `KITE_API_KEY`, `KITE_API_SECRET`, plus the token mechanism once decided.

**Critical test scenarios**: provider selection precedence (AC-1); AG8004 is not retried and gives the clear message (AC-2); a symbol with zero rows becomes `unavailable` and is skipped, not failed (AC-4); the gate judges on NIFTY only and says so (AC-5).

## Build plan

1. Extract a `HistoryProvider` interface (`instruments()`, `fetch(window)`) from `backfill.ts`, wrap the current Angel One code as `angelone`, and add provider selection, satisfies **AC-1**
2. Angel One: the optional historical key, and the AG8004 no-retry message, satisfies **AC-2**
3. Unavailable symbol handling in backfill and runner, the NIFTY only gate path, and the leaderboard and CLI labels, satisfies **AC-4**, **AC-5**, **AC-6**
4. Kite provider (instruments, windowed `5minute` and `day` fetch, rate limit), **blocked until the token flow is decided**, satisfies **AC-3**
5. Tests for each scenario, satisfies **AC-1** to **AC-6**

Steps 1 to 3 can be built now. Step 4 waits for your Zerodha account and the token decision.

## Consequences

**Positive**: the lab is no longer tied to one vendor. A clear AG8004 message replaces silent retries. The lab gives an honest result with partial data.
**Negative**: ₹500 for one month, plus a Zerodha account to open. Kite needs a manual login each backfill day. A NIFTY only gate is weaker evidence than both symbols.
**Neutral**: spec 0020's backfill section is extended, not replaced.

## Follow-up

- [ ] **Open decision (blocks step 4):** how the Kite daily access token reaches the backfill: a CLI login prompt, an env var updated daily, or an in app redirect callback. Decide with `/architect Backtest History Provider: Kite token flow` once the Zerodha account exists.
- [ ] Open a Zerodha account and subscribe to one Kite Connect app (₹500, one month).
- [ ] Raise the AG8004 ticket on the SmartAPI forum and ask for a historical enabled key. If they issue one, set `ANGEL_ONE_HISTORICAL_API_KEY`.
- [ ] Confirm SENSEX index history exists on Kite before relying on both symbols.
