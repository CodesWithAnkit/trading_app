# 0026. Market Intelligence page real data

**Date**: 2026-11-10
**Status**: Proposed

## Summary

The Market Intelligence page (`/dashboard/intelligence`) still shows made up numbers when live data is missing: NIFTY 24,845.60, VIX 13.42, 142 advances, sample sectors, sample FII and DII flows, and a provenance block that always says "Live Stream (12ms)". This spec swaps every one of those for a real source. NIFTY 50 and India VIX come from the Angel One feed we already run. Institutional flows show an honest empty state until a real source is chosen. When the feed is quiet, the page shows the last real reading with its time, or a dash, and never a sample number.

Related: [0017 Market intelligence](../0017-market-intelligence-and-explainable-analysis/index.md) (done, unchanged), [0024 Real news ingestion](../0024-real-news-ingestion/index.md) (news panel is already live), [0025 News aware trade analysis](../0025-news-aware-trade-analysis/index.md) (owns Gate 06; this spec does not touch it).

## Requirements

**User stories**:
- As a trader, I want every number on the intelligence page to come from a real feed so that I never act on a sample value.
- As a trader, I want to see when a number was last real ("as of 15:29") so that I know how fresh it is.

**Acceptance criteria**:
- **AC-1**: The backend subscribes the NIFTY 50 index token (99926000, NSE, AMXIDX) and the India VIX index token (looked up by name in the Angel One instrument file) on the existing feed, and `GET` market context returns `niftyLtp`, `niftyChangePct`, `vixLtp`, `vixChangePct`, `vixDayLow`, `vixDayHigh` computed from those ticks. No literal 24845.60, 0.85, 13.42 or -3.8 remains in backend or web code.
- **AC-2**: Index ticks never enter breadth, VWAP participation, sector or median calculations; those count only universe stocks.
- **AC-3**: When there are no live ticks, the backend returns the last real reading from today's IST session for every market value (breadth, VWAP participation, regime, NIFTY, VIX, sectors) with an `asOf` time, and the page shows it labelled "as of HH:MM". The baseline 142 / 56 / 32 / 158 and the sample sector prices (500, 1000) are gone.
- **AC-4**: Before any real reading exists for today, each value is `null`, the page shows a dash and the words "No live data", and no sample value appears anywhere (including the web sector sample list and the web fallbacks in `page.tsx`).
- **AC-5**: The last real reading survives a backend restart within the same session (it is read back from `market_context_snapshots`); a reading from a previous IST date is never shown as today's.
- **AC-6**: The VIX card shows the real day range and change; the "Threshold < 18.00 PASS" text is replaced by the status bands the code actually uses (LOW_NORMAL under 16, ELEVATED 16 to 22, EXTREME_VOLATILE over 22).
- **AC-7**: FII/DII flow and bulk deals: `SEED_INSTITUTIONAL_FLOW`, `SEED_BULK_DEALS` and the default sample props in `InstitutionalFlowCard.tsx` are removed; with no rows in `institutional_flows` / `bulk_block_deals` the card shows "No institutional flow source connected". If rows exist, they render as before.
- **AC-8**: The Data Provenance Registry shows real state: market feed status, last tick time and latency from the feed provider health; news last run status and time from `news_fetch_runs`; institutional "Not connected". No hardcoded "12ms", "Zero Error" or "T-1" text remains.
- **AC-9**: Analysis page Gate 03 computes distance from the 20 EMA in ATR units (Wilder ATR 14) on the symbol's 5m candles; with fewer than 20 candles it reads "Insufficient candles" with status WARNING, never a fixed PASS.
- **AC-10**: Analysis evidence lines use real values where a source exists (RVOL from `calculateRvol`, EMA alignment from 5m 20 and 50 EMA, sector alpha from the matched sector); lines with no real source (CVD divergence, opening range 2.4x, VWAP wick rejections, higher lows, R2 pivot friction) are removed. The 1.45 sector alpha fallback is removed; with no sector match the line is omitted.
- **AC-11**: Gate 06 and its text are unchanged by this spec.

## Decision

**Chosen option**: Fix in place, using the existing feed and the existing `market_context_snapshots` table.

Subscribe the two index tokens on the current Angel One feed, persist the computed context to `market_context_snapshots` once a minute during market hours, serve the last real reading of today with its time when ticks stop, and strip every sample constant from backend and web.

Decided by the engineer: new spec 0026; NIFTY and VIX from the existing feed; institutional data shows an honest empty state (real source is a later decision); missing data shows last real value with time, else a dash, never samples.

Decided here (recommended, please confirm):
- Last real value storage: persist to `market_context_snapshots` (add nullable columns), runner up in memory only. Why: the table already exists with breadth and sector columns, and a restart mid session would otherwise blank the page.
- Provenance Registry: keep it, fed from feed provider health, `news_fetch_runs`, and a fixed "Not connected" for institutional; runner up remove the block. Why: all three sources exist today, and the block is useful for trust.
- Analysis constants: compute Gate 03 and RVOL and EMA alignment from 5m candles, remove lines with no source; runner up keep lines with an "unverified" tag. Why: a tagged fake is still a fake on a trading screen.
- Sector fallback: last real value rule via the snapshot `sector_metrics`; runner up hide the matrix. Why: same rule as every other value, one code path.
- VIX threshold: drop "18.00" and show the existing 16 / 22 bands; runner up add an 18 gate. Why: nothing in code gates on 18.

## Feature design

**Data model sketch** (one migration, additive, all nullable):
- `market_context_snapshots` add: `nifty_ltp numeric null`, `nifty_change_pct numeric null`, `vix_ltp numeric null`, `vix_change_pct numeric null`, `vix_day_low numeric null`, `vix_day_high numeric null`, `regime_confidence integer null`, `session_date date null` (IST date of `snapshot_time`). Index on `(session_date, snapshot_time desc)`.
- No new tables. `feed_health`, `news_fetch_runs`, `institutional_flows`, `bulk_block_deals` are read only here.

**Contract changes** (`apps/backend/src/intelligence/contracts/intelligence.contract.ts`, mirrored in web):
- `MarketContextContract`: market values become `number | null`; add `vixDayLow`, `vixDayHigh`, `source: 'LIVE' | 'LAST_KNOWN' | 'NONE'`, `asOf: string | null`.
- New `provenance` object: `{ feed: { status, lastTickAt, latencyMs }, news: { status, finishedAt } | null, institutional: { connected: false } }`.

**API surface**: no new endpoints. Existing market context and analysis endpoints change shape as above; same Supabase JWT guard.

**Value sourcing**:
| Action | Value displayed | Source |
|---|---|---|
| Market context | NIFTY LTP | latest tick for token 99926000 (`ScannerService` index tick store) |
| Market context | NIFTY change % | the tick's `change1dPct` (from previous close in the Quote mode packet) |
| Market context | VIX LTP, change % | latest tick for the India VIX token, resolved by name "India VIX" from the instrument file |
| Market context | VIX day range | the tick's day low and day high fields |
| Market context | VIX status | derived: bands 16 and 22 in `market-breadth.service.ts` |
| Market context | advances, declines, unchanged, % above VWAP, median change | live universe ticks (index tokens excluded) |
| Market context | regime, label, description, confidence | derived from breadth rules already in `market-breadth.service.ts` |
| Market context | sectors (LTP, change, alpha, leader, advances, declines, bias) | live universe ticks; alpha relative to real NIFTY change |
| Any of the above, ticks absent | value plus "as of HH:MM" | latest `market_context_snapshots` row where `session_date` = today IST |
| Any of the above, no row today | "No live data" | none, value `null` |
| Institutional card | FII/DII, bulk deals | `institutional_flows`, `bulk_block_deals` rows; empty means "No institutional flow source connected" |
| Provenance | feed status, latency, last tick | `AngelOneMarketDataProvider` health and `scannerMetrics.lastTickAt` |
| Provenance | news last run | latest `news_fetch_runs` row (status, finished time) |
| Provenance | institutional | fixed "Not connected" until a source spec exists |
| Analysis | Gate 03 measured value | `(close - EMA20) / ATR14` on today's 5m candles via `ema` and `wilderAtr` in `scanner/strategy/guru/indicators.ts`, limit 1.50 ATR (existing) |
| Analysis | RVOL line | `calculateRvol` in `scanner/strategy/features/rvolCalculator.ts`; omitted if `rvol` is null |
| Analysis | EMA alignment line | 5m EMA20 vs EMA50; omitted with fewer than 50 candles |
| Analysis | sector alpha | matched sector `alphaVsNifty`; omitted when no match |
| Analysis | 5m candles | scanner in memory candles, else `candles` table rows for today (`timeframe = '5m'`) |
| Time label | "as of HH:MM" | `asOf` formatted in Asia/Kolkata |

**Key invariants**:
- No literal sample market numbers exist in backend or web code paths that render.
- A snapshot from another IST date is never served.
- Index ticks are kept in a separate store and never counted in breadth.
- Snapshot writes happen only when live ticks exist (no writing of null or stale state as new).

**Security model**: unchanged; all routes behind the Supabase JWT guard. Snapshot table written by the service role only.

**Critical test scenarios**:
- Happy path: index ticks arrive, context returns real NIFTY and VIX with `source = LIVE`, verifies **AC-1**, **AC-6**.
- Index tick does not change advance count, verifies **AC-2**.
- Ticks stop after a write, context returns snapshot values with `asOf`, verifies **AC-3**.
- Restart with today's row present returns it; yesterday's row only returns nulls, verifies **AC-4**, **AC-5**.
- Empty institutional tables render the empty state; grep finds no SEED constants, verifies **AC-7**.
- Provenance reflects a failed news run, verifies **AC-8**.
- Gate 03 with 10 candles is WARNING "Insufficient candles"; with real candles shows the computed ATR distance, verifies **AC-9**.
- Analysis with no RVOL omits the line; no CVD line ever appears, verifies **AC-10**.
- Gate 06 output identical before and after, verifies **AC-11**.

## Build plan

Tracer Bullet slices, each end to end through backend and web.

1. NIFTY slice: subscribe token 99926000 at scanner start, keep index ticks in a separate store, compute NIFTY LTP and change, null contract fields, render on the page with "No live data" when null, remove the NIFTY literals, satisfies **AC-1**, **AC-2**, **AC-4**.
2. VIX slice: resolve India VIX token by name, subscribe, compute LTP, change, day range, status bands; replace the 18.00 text, satisfies **AC-1**, **AC-6**.
3. Last real value slice: migration for the new snapshot columns; scheduled flush every 60s while live ticks exist; read today's latest row when ticks are absent; `source` and `asOf` in the contract; "as of HH:MM" label on the page; remove breadth baseline and web fallbacks and sector sample list, satisfies **AC-3**, **AC-4**, **AC-5**.
4. Institutional slice: delete seed constants and default props, render "No institutional flow source connected", satisfies **AC-7**.
5. Provenance slice: add the `provenance` object and render it in the registry block, satisfies **AC-8**.
6. Analysis slice: load 5m candles, compute Gate 03, RVOL and EMA lines, remove sourceless lines and the 1.45 fallback, leave Gate 06 untouched, update `explainable-analysis.service.spec.ts`, satisfies **AC-9**, **AC-10**, **AC-11**.

## Consequences

**Positive**:
- Every number on the page is real or clearly marked as old or missing.
- Breadth snapshots finally get written (the existing `flushSnapshotToDb` has no caller today).

**Negative / tradeoffs**:
- Two more feed subscriptions; the page is emptier outside market hours on a fresh day.
- The analysis page loses several evidence lines until real calculators exist for them.

**Neutral**:
- One additive migration with nullable columns; rollback is reverting the commit.

## Follow-up

- [ ] Choose a real FII/DII and bulk deal source (separate spec; NSE site scraping is out, same reasons as news).
- [ ] Real calculators for CVD, opening range and swing structure evidence, if wanted.
- [ ] Analysis trade plan still uses fixed 0.8% stop and fallback prices (158.45, 2940); consider a follow up spec.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
