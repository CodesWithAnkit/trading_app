# 0028. Position sizing and risk limits

**Date**: 2026-11-11
**Status**: Proposed

## Summary

Every signal card now says either "take N shares" or "skip, with a reason". A backend risk service sizes each signal from a fixed rupee risk per trade and its stop distance, caps it by a capital limit, and checks it against your daily loss limit (money already lost today plus risk still open) and your max open trades (your PENDING journal entries). To measure real losses, journal entries gain direction, quantity, exit price and realized P&L. The mock risk controls on Settings become real saved settings.

## Requirements

**User stories**:
- As the trader, I want each signal to tell me how many shares to take, so every trade risks the same rupees.
- As the trader, I want signals to say "skip" once my daily loss or open trade limit is reached, so a bad day can't become a disaster.
- As the trader, I want to record my real quantity and exit price, so the limits use what actually happened.

**Acceptance criteria**:
- **AC-1**: Settings saves four limits per user: risk per trade (₹, `user_settings.risk_budget`, default ₹1,500, ≥ ₹100), daily loss limit (₹, default ₹6,000, ≥ risk per trade), max open trades (default 3, 1 to 20), max capital per trade (₹, default ₹50,000, ≥ ₹1,000). Invalid values are rejected with a field message. The mock min R:R, cooldown and auto lock controls are removed from the page.
- **AC-2**: For each signal, base qty = floor(risk per trade ÷ |entry − stop|), using `referenceEntryOf` and `snapshot_json.stop.level` read directly (never through `stopOf`, whose 0.99 fallback would hide a missing stop). This is computed only after the stop passes validation (AC-5 step 1).
- **AC-3**: Capital cap: if base qty × entry > max capital per trade, qty = floor(max capital ÷ entry), and the card shows "capped by capital".
- **AC-4**: Daily room = daily loss limit − today's realized loss − open risk. Today's realized loss = max(0, −sum of `realized_pnl` of journal entries closed today in IST). This deliberately counts the day's NET: a ₹5,000 win then a ₹4,000 loss is zero loss. Open risk = sum over PENDING entries of qty × |entry − stop|. If qty × |entry − stop| > daily room, qty shrinks to floor(daily room ÷ |entry − stop|) and the card shows "reduced to fit today's loss room".
- **AC-5**: Skip reasons, checked in this order, first match wins: (1) "stop missing or invalid" when entry ≤ 0, there is no `stop.level`, `|entry − stop|` = 0, or the stop is on the wrong side (LONG needs stop < entry, SHORT needs stop > entry); (2) "max open trades reached" when PENDING entries ≥ max open trades; (3) "daily loss limit reached" when daily room ≤ 0; (4) "stop too wide for risk per trade" when base qty < 1; (5) "capital too small" when the capped qty < 1; (6) "stop too wide for today's remaining room" when the room shrunk qty < 1.
- **AC-6**: Every signal card (Scanner and Signals pages, plus signal detail) shows either "Take N shares · risk ₹X · notional ₹Y" plus any cap or reduce note, or "Skip: <reason>". Signals are never hidden.
- **AC-7**: A verdict reflects the latest state. After a journal entry is created, closed or cancelled, or the settings change, every visible card updates within 2 seconds without a page reload: a per user SSE `risk:changed` event, then ONE refetch debounced by 500 ms. New signals arriving on the global `signal:new` event carry no `risk`; the web fetches their verdict through the signals API.
- **AC-8**: When the daily loss limit is reached, every signal shows the skip until the next IST trading day (room resets at 00:00 IST). There is no override.
- **AC-9**: The journal stores direction (LONG or SHORT), quantity (≥ 1), exit price and exit time. Marking an entry WON or LOST requires an exit price (prefilled with the target or stop). The server computes `realized_pnl` = (exit − entry) × qty for LONG, (entry − exit) × qty for SHORT. CANCELLED needs no exit and has P&L 0.
- **AC-10**: "Take this trade" from a signal card opens the journal form prefilled with symbol, strategy, direction, entry, stop, target and the suggested qty, all editable.
- **AC-11**: Existing journal rows are migrated: direction is backfilled as LONG when stop < entry, SHORT when stop > entry, and left null (flagged "check direction") when they are equal. Old WON/LOST rows keep `exit_price` and `realized_pnl` null (never guessed). Rows with no quantity or no P&L count as 0 rupees in realized loss and open risk, and are flagged "no quantity" in the journal list.
- **AC-12**: All risk numbers are scoped to the signed in user. Every journal route sets and filters by the JWT `user_id` in code (the backend's service role client bypasses RLS). One user's journal and settings never affect another user's verdicts, and a user can't read or change another user's entries.

## Decision

**Chosen option**: Option 2: A backend RiskService computing verdicts on read, with change push.

A NestJS `RiskService` builds a per user `RiskContext` (settings, today's realized loss, open risk, open count) and applies a pure `sizeSignal(signal, ctx)` function. Verdicts are attached to the signals API responses and SSE payloads, and `risk:changed` is pushed whenever the journal or settings change.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase-postgres-best-practices` (installed skill, migration and checks)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (one migration `supabase/migrations/2026111113xxxx_position_sizing_risk_limits.sql`):

| Table | Column | Type | Null | Notes |
|---|---|---|---|---|
| `user_settings` | `risk_budget` | numeric | not null, default 1500 | Now means risk per trade (₹). Order: `UPDATE … SET risk_budget = 1500 WHERE risk_budget IS NULL`, then add the new columns with defaults, then SET NOT NULL and the CHECKs. `CHECK (risk_budget >= 100)`. |
| `user_settings` | `daily_loss_limit_inr` | numeric | not null, default 6000 | `CHECK (daily_loss_limit_inr >= risk_budget)` |
| `user_settings` | `max_open_trades` | integer | not null, default 3 | `CHECK (max_open_trades BETWEEN 1 AND 20)` |
| `user_settings` | `max_capital_per_trade_inr` | numeric | not null, default 50000 | `CHECK (max_capital_per_trade_inr >= 1000)` |
| `journal_entries` | `direction` | text | nullable (legacy rows with stop = entry); required by the API for new rows | `CHECK (direction IS NULL OR direction IN ('LONG','SHORT'))` |
| `journal_entries` | `quantity` | integer | nullable (old rows) | `CHECK (quantity IS NULL OR quantity >= 1)`; required by the API for new rows |
| `journal_entries` | `exit_price` | numeric | nullable | required by the API when status moves to WON or LOST |
| `journal_entries` | `exit_at` | timestamptz | nullable | set by the server on close |
| `journal_entries` | `realized_pnl` | numeric | nullable | set by the server on close; 0 for CANCELLED; null while PENDING |
| `journal_entries` | `signal_id` | uuid | nullable, FK `signals(id) ON DELETE SET NULL` | links a taken trade to its signal (used by the scorecard and paper ledger later) |

- Index: `idx_journal_user_status_exit` on `journal_entries (user_id, status, exit_at)`.
- A trigger-free design: the API computes `realized_pnl`. `CHECK (exit_at IS NULL OR (status IN ('WON','LOST') AND exit_price IS NOT NULL AND realized_pnl IS NOT NULL) OR status = 'CANCELLED')` applies only to rows closed after this migration (they carry `exit_at`); legacy closed rows have null `exit_at` and are untouched.
- Settings PATCH upserts the caller's row (`onConflict: user_id`), validating the MERGED row (stored values plus patch) server side before writing, so a single field update still enforces `daily_loss_limit_inr >= risk_budget`.

**State transitions** (journal entry): `PENDING → WON | LOST` (exit price required, P&L computed) · `PENDING → CANCELLED` (P&L 0). Closed states are final. The close is one conditional `UPDATE … WHERE id = $1 AND user_id = $2 AND status = 'PENDING'`; zero rows updated returns 409 (already closed) or 404 (not yours or missing), so two quick closes can't both win. The open trade limit is advisory (checked on read, not enforced on POST): you place orders by hand, so a POST is never refused for being over the limit.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/settings/risk` | GET | none | `{riskPerTrade, dailyLossLimit, maxOpenTrades, maxCapitalPerTrade}` | bearer | 401 |
| `/api/v1/settings/risk` | PATCH | any of the four (numbers) | same shape | bearer | 400 field rule broken, 401 |
| `/api/v1/risk/context` | GET | none | `{dailyRoom, realizedLossToday, openRisk, openCount, limits, resetsAt}` | bearer | 401 |
| `/api/v1/signals`, `/api/v1/signals/:id`, scanner `top-setups` | GET | unchanged, plus `@CurrentUser` injected | each signal gains `risk: {verdict: 'TAKE'\|'SKIP', qty, riskInr, notionalInr, notes: ('CAPPED_BY_CAPITAL'\|'REDUCED_TO_ROOM')[], skipReason}`. The RiskContext loads once per request. `approaching` and `momentum` return no signal rows and get no `risk`. | bearer | unchanged |
| SSE stream (existing ticket) | — | — | `signal:new` unchanged (global, no `risk`). New per user event `risk:changed {}` from a `risk$` subject filtered by the ticket's `user.id` in `stream()` | SSE ticket | — |
| `/api/v1/journal` | GET | none | the caller's entries only (`user_id` filter), with `quantity`, `direction`, `exit_price`, `realized_pnl`, flags | bearer | 401 |
| `/api/v1/journal` | POST | existing snake_case fields (`symbol`, `strategy_name`, `entry_price`, `stop_price`, `target_price`, `notes`) plus `direction`, `quantity` (req), `signal_id` (opt); `user_id` set from the JWT | entry | bearer | 400 invalid, 401 |
| `/api/v1/journal/:id` | PATCH (new) | `status` (`WON`\|`LOST`\|`CANCELLED`), `exit_price` (req for WON/LOST), `quantity` (opt while PENDING) | entry with `realized_pnl` | bearer | 400 exit missing, 404 not yours, 409 already closed |

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| sizeSignal | entry, stop | `referenceEntryOf(signal)`; `snapshot_json.stop.level` read directly (not `stopOf`) |
| sizeSignal | direction (for stop side check) | `signals.direction` |
| sizeSignal | risk per trade, daily limit, max open, max capital | `user_settings` row for JWT `user_id` (column defaults when no row exists) |
| RiskContext | today's window | `istDayRange(today IST)` from `scanner/time/ist`, with "today" taken from the current instant converted to IST (never the server's local date). Unit tested with a UTC clock at 20:00 UTC (01:30 IST next day). |
| RiskContext | realized loss today | `journal_entries` with `user_id`, status WON or LOST, `exit_at` in today's window: `max(0, −sum(realized_pnl))` |
| RiskContext | open risk, open count | `journal_entries` with `user_id`, status PENDING: sum of `quantity × |entry_price − stop_price|` (null qty = 0), count |
| sizeSignal | qty, notes, skip reason | derived (AC-2 to AC-5) |
| card | notional | qty × entry |
| SSE `risk:changed` | trigger | `RiskService.notify(userId)` called by the journal POST/PATCH and the settings PATCH handlers after a successful write |
| SSE `risk:changed` | recipient | streams whose ticket `user.id` equals that `userId` (auth spec 0021) |
| web settings | risk values | `/api/v1/settings/risk`; `SettingsContext.dailyRiskBudget` is removed and its readers use `dailyLossLimit` from that API |
| journal PATCH | realized_pnl, exit_at | derived from exit price, entry, qty, direction; `exit_at` = server now |
| journal form prefill | qty, direction | the card's `risk.qty` and `signal.direction` |
| resetsAt | next reset | 00:00 IST of the next day |

**Key invariants**:
- `sizeSignal` is pure: same signal + same context = same verdict. It never writes.
- A TAKE verdict always has qty ≥ 1, risk ≤ risk per trade, risk ≤ daily room at compute time, notional ≤ max capital.
- `realized_pnl` is only ever written by the server, never accepted from the client.
- Closed journal entries never change.
- Decision support only: nothing places or blocks orders at the broker.

**Security model**: All routes use the Supabase JWT guard. The backend uses the service role client, so RLS does not protect these tables: every settings, journal and risk query filters by the JWT `user_id` in code, and POST sets `user_id` from the JWT, never from the body. Journal PATCH on another user's row returns 404. The `risk` attached to a signal is computed for the caller, so signal rows stay global but verdicts are personal. `risk:changed` is delivered only on the streams of the user it concerns and carries no data. No PII beyond the trading journal; no compliance scope.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: risk ₹1,500, entry 500, stop 495 → qty 300, notional ₹1,50,000 > ₹50,000 cap → qty 100, "capped by capital". Verifies **AC-2**, **AC-3**, **AC-6**
- Room: limit ₹6,000, realized −₹4,000, one PENDING with ₹1,500 open risk → room ₹500; a signal with a ₹5 stop gets qty 100 "reduced". With room ₹3 → skip "stop too wide for today's remaining room"; with room ₹0 → "daily loss limit reached". Verifies **AC-4**, **AC-5**, **AC-8**
- Stop validation: LONG with stop above entry, a missing `stop.level`, and entry 0 all → "stop missing or invalid", checked before room (no divide by zero). Verifies **AC-2**, **AC-5**
- IST day: with the server clock at 20:00 UTC, a loss closed at 19:00 UTC the same UTC date counts as yesterday (IST) and does not reduce today's room. Verifies **AC-4**, **AC-8**
- Concurrency: two simultaneous PATCH closes on one entry → one 200, one 409. Verifies **AC-9**
- Open count: 3 PENDING with max 3 → every card "max open trades reached"; cancel one → cards update within 2 s. Verifies **AC-5**, **AC-7**
- Journal close: WON without exit price → 400; SHORT entry 200 exit 190 qty 10 → `realized_pnl` +100; closing twice → 409. Verifies **AC-9**
- Migration: old rows get direction from stop vs entry; a null qty row adds 0 and shows "no quantity". Verifies **AC-11**
- Settings: daily limit below risk per trade → 400; saved values survive reload. Verifies **AC-1**
- Prefill: Take this trade opens the form with qty and direction from the card. Verifies **AC-10**
- Auth: user B's journal never changes user A's verdicts; PATCH on A's entry by B → 404. Verifies **AC-12**

## Build plan

Tracer Bullet: settings to verdict to card first, then real P&L, then live refresh.

1. Migration: settings columns and checks, journal columns, backfill, the index. Satisfies **AC-1**, **AC-9**, **AC-11**
2. Pure `sizeSignal(signal, ctx)` in `apps/backend/src/risk/sizing.ts` with unit tests for every rule and skip order. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
3. Thin thread: `RiskModule` (settings GET/PATCH with merged row validation and upsert, `RiskService.contextFor(userId)`, `/risk/context`); `@CurrentUser` on signals list, detail and `top-setups`, with `risk` attached; signal cards show Take or Skip. Satisfies **AC-1**, **AC-6**, **AC-12**
4. Journal: scope GET and POST by JWT `user_id`; direction, quantity, signal id on POST; new PATCH close with the conditional update, exit price and server P&L; "no quantity" and "check direction" flags in the journal list. Satisfies **AC-9**, **AC-11**, **AC-12**
5. Context from journal: realized loss today (net, IST day) and open risk feed the verdicts; daily reset by IST. Satisfies **AC-4**, **AC-5**, **AC-8**
6. Live refresh: per user `risk$` subject merged into `stream()` filtered by ticket user; `risk:changed` after journal and settings writes; web refetch debounced 500 ms. Satisfies **AC-7**
7. "Take this trade" prefill from cards; Settings page wired to `/settings/risk`, `SettingsContext.dailyRiskBudget` removed, mock gates removed. Satisfies **AC-1**, **AC-10**

## Consequences

**Positive**:
- Every signal has a concrete, consistent size, and bad days are capped.
- The journal finally records real rupees, which the paper ledger and weekly debrief can reuse.
- `risk_budget` gains one clear meaning, retiring the scorecard's ₹1,000 assumption.

**Negative / tradeoffs**:
- Journal entry gets heavier (quantity and exit price required).
- Limits are only as good as your journal: an unrecorded trade is invisible to them.
- Computing per request per user adds a small query (settings + today's journal) to signal reads; cached per request, not across requests.
- No override when the limit is hit, by design. This may feel rigid on a day you disagree.

**Neutral**:
- Old journal rows without quantity are treated as zero risk until edited.
- Correlated Exposure Guard will add a sixth skip reason into the same `sizeSignal` order.

## Follow-up

- [ ] Correlated Exposure Guard plugs into `sizeSignal` as another skip reason (its own spec).
- [ ] Update spec 0027 (Signal Scorecard): `risk_budget` is now NOT NULL, so its ₹1,000 fallback becomes dead code; drop it when building either feature second.
- [ ] Min R:R, cooldown and auto lock were removed from Settings; enroll them as features only if you want them back.
