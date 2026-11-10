# 0025 · Live News Gate

## Summary

Every live signal (scanner F&O stocks and guru NIFTY/SENSEX signals) gets a news verdict when it fires: pass, warn, or BLOCKED, using the shared `news-gate-v1` rule from the umbrella spec. That entry verdict is stored on the signal and never changes afterwards (it is what the backtest measures). Separately, if blocking or warning news lands while the signal is still active, a second "after entry" verdict records it, so you see both, clearly apart. The analysis page's Gate 06 uses the same rule instead of today's weak check.

## Requirements

**Acceptance criteria**:
- **AC-1**: When a scanner or guru signal is inserted, `news-gate-v1` runs with `signals.symbol`, `signals.direction` as side, and `signals.created_at` as `at` (both inserts set `created_at` explicitly to the fire time; guru uses its candle time), and the entry verdict is stored (`news_gate`, `news_gate_reason`, `news_gate_items`, `news_gate_checked_at`). The entry verdict is never changed afterwards, except that a "News unavailable" verdict (AC-7) is replaced by the first real result.
- **AC-2**: A `block` signal is still stored, still shown, and still reconciled for its outcome like any other. It is never suppressed.
- **AC-3**: When spec 0024 stores and classifies a new `HIGH` or `MEDIUM` item, every signal with status `ACTIVE` created that IST day whose `symbol` matches (every `ACTIVE` signal for a `MARKET` item) gets an after entry check: `news-gate-v1` with `at` = now, counting only items published after `created_at`. The result goes to the after entry fields (`news_after_gate`, `news_after_reason`, `news_after_items`, `news_after_checked_at`), which only escalate (none, warn, block), written with one atomic SQL update (`... where rank(news_after_gate) < rank($new)`), never read then write.
- **AC-4**: Each entry verdict and each after entry escalation is pushed over SSE as `signal:news-gate` with `{ signalId, kind: 'entry' | 'after', gate, reason, items, checkedAt }`. Ingestion publishes it on `ScannerService.events$` (the existing bridge it already uses for `intelligence:news`), so the stream needs no new wiring. The signal APIs return `newsGate`, `newsGateReason`, `newsGateItems`, `newsGateCheckedAt`, and the matching `newsAfter*` fields.
- **AC-5**: Signal cards show a "Blocked by news" (danger) or "News warning" (caution) badge for the entry verdict, and a separate "News after entry" badge when an after entry verdict exists. Each deciding item shows its headline and links to its source, from the embedded `items`. A verdict caused only by `MARKET` items reads "Market wide news", so an RBI day isn't mistaken for stock specific news. `pass` and `null` (signals from before this feature) show nothing.
- **AC-6**: Gate 06 in `GET /api/v1/intelligence/analysis/:symbol` computes `news-gate-v1` fresh at the current time (it does not read the stored verdict), with `side` from the `direction` of the symbol's latest `ACTIVE` signal created today, or `null` if none. `block` maps to `FAIL`, `warn` to `WARNING`, `pass` to `PASS`, and the gate's description shows the reason.
- **AC-7**: If reading news fails, the gate stores `warn` with reason "News unavailable", never `pass`, and the signal is still inserted.

## Feature design

**Data model** (one migration):
| Table | Change |
|---|---|
| `signals` (existing) | add `symbol text null` (indexed with `created_at`; filled on every new insert by scanner and guru; existing rows backfilled from `snapshot_json->>'symbol'`), entry verdict `news_gate text null` (check: `pass`, `warn`, `block`), `news_gate_reason text null`, `news_gate_items jsonb NOT NULL DEFAULT '[]'` (`[{ id, headline, sourceUrl, publishedAt }]`), `news_gate_checked_at timestamptz null`; after entry verdict `news_after_gate text null` (check: `warn`, `block`), `news_after_reason text null`, `news_after_items jsonb NOT NULL DEFAULT '[]'`, `news_after_checked_at timestamptz null`. The existing `idx_signals_status_created_at` serves the re-check; no extra status index. |

Items are embedded snapshots (id, headline, link), not foreign keys, so pruning news never breaks a signal and the badge needs no extra call. Existing rows keep `null` verdicts (no backfill of verdicts). `signals.symbol` holds the plain NSE symbol (`TCS`, `NIFTY`), the same form as `news_and_events.symbol`; scanner symbols with a suffix (`-EQ`) are stripped on insert.

**Components** (backend):
- `intelligence/news/news-gate.ts`: the pure `evaluateNewsGate(input, items)` (rule in the umbrella spec). No I/O.
- `NewsGateService` (intelligence module): loads candidate items for a window (`news_and_events`, `is_seed = false`, `published_at` in range, symbol in the relevant set), calls the pure function, and writes results. Exposes `checkNewSignal(signal)` and `recheckForItem(item)`.
- Hook points: the scanner signal insert (`scanner.service.ts`) and the guru insert (`guruLive.service.ts`) set `symbol` and `created_at`, then call `checkNewSignal` right after insert (an update on the new row, so a news read failure never blocks the insert). `NewsIngestionService.storeItem` calls `recheckForItem` after classifying a new `HIGH` or `MEDIUM` item.
- Race: a signal inserted just after an item was stored is safe, because `checkNewSignal` reads items itself; the after entry write is one atomic conditional update.

**API surface**:
| Endpoint | Method | Change | Auth |
|---|---|---|---|
| existing signal list and detail endpoints (`api/scanner.controller.ts`, `api/signals.controller.ts`) | GET | add `newsGate`, `newsGateReason`, `newsGateItemIds`, `newsGateCheckedAt` | signed in (unchanged) |
| `/api/v1/intelligence/analysis/:symbol` | GET | Gate 06 uses `news-gate-v1` (AC-6) | signed in (unchanged) |
| `/api/v1/scanner/stream` | SSE | new event `signal:news-gate` | stream ticket (unchanged) |

**Value sourcing**:
| Action | Value | Source |
|---|---|---|
| check new signal | symbol, side, `at` | the inserted signal row: `signals.symbol`, `direction`, `created_at` |
| check new signal | is index | symbol in (`NIFTY`, `SENSEX`) |
| any check | candidate items | `news_and_events` rows, `is_seed = false`, in the window, symbol set per the umbrella rule |
| any check | impact, direction, classified by, event type | `news_and_events.impact_level`, `direction`, `classified_by`, `event_type` (spec 0024) |
| any check | board meeting filing | the rules v1 board meeting pattern (`news.rules.ts`) applied to the headline |
| any check | "same IST day" | `istDate()` of `published_at` and of `at` |
| after entry check | which signals | `signals.status = 'ACTIVE'`, `created_at` within today's IST day (bounds computed as IST midnight in code), `signals.symbol` matching (all for `MARKET`) |
| after entry check | window | items published after `signal.created_at`, up to now |
| any check | news staleness | latest `news_fetch_runs.finished_at` with status `done` or `partial` at or before `at` |
| Gate 06 | side | the latest `ACTIVE` signal for the symbol created today, its `direction`; else `null` |
| badge | item headline and link | embedded `news_gate_items` / `news_after_items` |

**Key invariants**:
- The entry verdict never changes after insert (except replacing "News unavailable"); the after entry verdict never moves down.
- A signal insert never fails or waits on the news gate.
- Live and backtest call the same `evaluateNewsGate`; it contains no I/O and no clock reads (`at` is always passed in).

**Security model**: no new access. Verdicts are written by the backend service role; reads follow the existing signal endpoints (signed in, spec 0021).

**Critical test scenarios**:
- Fixtures: a LONG stock signal with a HIGH Bearish rules item 20 minutes before gets `block`; the same item 70 minutes before gets `pass`; an item 5 minutes after `at` is ignored, verifies **AC-1**, umbrella **AC-2**
- A HIGH default classified item gives `warn`, never `block`; MIXED never blocks, verifies **AC-1**
- An index signal ignores a stock's HIGH item but blocks on a HIGH Bearish `MARKET` item, verifies **AC-1**
- A blocked signal still appears in the signal list and is reconciled, verifies **AC-2**
- A late HIGH Bearish item sets an active LONG signal's after entry verdict to block and emits `signal:news-gate` (kind `after`), while the entry verdict stays `pass`; a later `warn` changes nothing; two concurrent rechecks leave `block`, verifies **AC-3**, **AC-4**
- No good fetch in the 15 minutes before a 11:00 IST signal gives `warn` "News stale"; a 07:00 signal is not judged stale, verifies umbrella **AC-4**
- A "News unavailable" entry verdict is replaced by `pass` on the next successful check, verifies **AC-7**
- Gate 06 with no active signal and a HIGH Bearish item shows `WARNING`, not `FAIL`, verifies **AC-6**
- News read failure stores `warn` "News unavailable" and the signal is inserted, verifies **AC-7**

## Build plan

1. `news-gate.ts` pure function `news-gate-v1` with fixture tests, satisfies umbrella **AC-1**, **AC-2**
2. Migration: `signals.symbol` (with backfill) and the entry and after entry columns, applied and confirmed live, satisfies **AC-1**, **AC-3**
3. `NewsGateService` plus the scanner and guru insert hooks, satisfies **AC-1**, **AC-2**, **AC-7**
4. Re-check from `NewsIngestionService.storeItem`, plus the `signal:news-gate` SSE event and the API fields, satisfies **AC-3**, **AC-4**
5. Gate 06 rewrite in `explainable-analysis.service.ts`, satisfies **AC-6**
6. Web: badge and reason on signal cards (dashboard and guru views), live update from `signal:news-gate`, satisfies **AC-5**

## Rationale (short)

Storing the verdict keeps it auditable; escalation only avoids a block flickering away as news ages. Showing blocked signals keeps the trader in control and gives outcome data on skipped trades. Full reasoning in [rationale.md](rationale.md).
