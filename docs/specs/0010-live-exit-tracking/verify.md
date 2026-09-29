# Verify: Live exit tracking · spec 0010 · updated 2026-09-29
_Steps derived from spec 0010 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Needs a live NSE session (weekday, 09:15 to 15:30 IST) with `MARKET_DATA_PROVIDER=angelone`, and at least one signal firing (spec 0009, top 20 gainers only)._

## UI / manual
- [ ] When a plan's price reaches its target, a toast "Exit <SYMBOL>: target hit at ₹X, +Y%" appears on any dashboard page and auto dismisses after about 12 seconds; the signal leaves Active Signals and appears under "Closed today" → AC-2, AC-6
- [ ] The same for a stop hit ("stop hit", negative P&L) → AC-2, AC-6
- [ ] At 15:15 IST, every plan still open closes with a "time exit (15:15)" toast; no new signal appears after 15:15 → AC-3, AC-6
- [ ] Reload the dashboard after an exit → the plan shows under "Closed today" with its reason, exit price and time, and no second toast appears → AC-6, AC-8
- [ ] After 15:32 IST, "Calls vs Reality" shows the live exit (Target hit, Stop hit, Time exit) as the main badge and "Candle check: WON/LOST/NEUTRAL" beside it → AC-9

## Commands
- [ ] SQL `select status, exit_reason, exit_price, exit_at from signals where created_at::date = current_date and status <> 'ACTIVE'` → every closed plan has all three exit fields, and the reason matches the status (TARGET ↔ TARGET_HIT, STOP ↔ STOP_HIT, TIME ↔ TIME_EXIT) → AC-5
- [ ] SQL `select signal_id, count(*) from signal_status_history group by 1 having count(*) > 1` → no rows (each exit recorded once) → AC-5
- [ ] After 15:15 IST, SQL `select count(*) from signals where status = 'ACTIVE' and created_at::date = current_date` → 0 → AC-3
- [ ] SQL: no two `ACTIVE` signals share the same `snapshot_json->>'symbol'` and `setup_family` at any moment (check open plan windows per stock and strategy) → AC-4
- [ ] Every exit's `exit_at` is after the signal's `created_at`, and no exit happens before 09:15 or after 15:15 IST (except the TIME_EXIT at 15:15) → AC-2, AC-3
- [ ] Restart the backend around 11:00 IST with an open plan → log "Reloaded N open plan(s) for tracking"; the plan still exits on its next target or stop tick → AC-7
- [ ] Stop the backend before 15:15 and start it after → log "Closed today's open plan … as TIME_EXIT"; no plan stays `ACTIVE` → AC-7
- [ ] `GET /api/v1/scanner/top-setups` after an exit → the closed plan carries `status`, `exitPrice`, `exitAt`, `exitReason`, and is listed after the open plans → AC-8
- [x] `npx vitest run src/scanner/plans src/scanner/scanner.service.spec.ts` (apps/backend) → all pass → AC-2 to AC-7

## Value sourcing checks
- [ ] Exit price equals the tick's LTP at the moment of the hit (compare with Angel's app tick history for that minute) → Exit price row
- [ ] Time exit price equals the stock's last price at 15:15 → Exit price row
- [ ] P&L % = (exit − entry) / entry × 100, with entry = the signal's reference entry → P&L row
- [ ] A signal reloaded after a restart keeps its original entry, stop and target from `snapshot_json` → Open plan index row

## Acceptance-criteria coverage
- AC-1 … closed plans still tracked after leaving the top 20 (exits recorded regardless of rank)
- AC-2 … target and stop toasts, exit timing checks
- AC-3 … 15:15 time exit, no new signals after 15:15, no ACTIVE left
- AC-4 … one open plan per stock and strategy
- AC-5 … exit fields and single history row
- AC-6 … toasts and Closed today list
- AC-7 … restart reload and after 15:15 catch up
- AC-8 … API exit fields and ordering
- AC-9 … live exit plus candle check display
