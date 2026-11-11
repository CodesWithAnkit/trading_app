# Verify: Signal Scorecard · spec 0027 · updated 2026-11-11
_Steps derived from spec 0027 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/dashboard/performance` signed in → page titled "Scorecard", no mock equity chart or "Walk-Forward Verified" badge; sidebar and top bar say "Scorecard" → AC-1
- [ ] Pick "All time" → Trades tile shows 516 (as of 2026-11-11) with won/lost/neutral 144/253/119, and "Not yet reconciled: 0", "Invalid risk: 0" → AC-2, AC-13
- [ ] Win rate tile shows 28% (144 ÷ 516, neutrals in the total) → AC-4
- [ ] Each row shows trades, W/L/N, win rate, avg win, avg loss, avg R gross, expectancy net, est. cost → AC-5
- [ ] Est. cost shows 100% everywhere (no evidence rows yet) and the note says costs assume a ₹1,000 risk budget (risk_budget is empty) → AC-6
- [ ] Click each tab (Strategy, Setup, Time of day, Market regime, News verdict) → every tab's trade counts add up to the overall total; Market regime shows only "Unknown" and News verdict only "Not checked" today → AC-7, AC-13
- [ ] Time of day tab lists buckets in session order (Opening, Morning, Midday, Afternoon, Late, then Other if any) → AC-7
- [ ] Settings → set Scorecard minimum sample to 120 → Save → reload the Scorecard: rows under 120 trades (e.g. ma_crossover, mean_reversion, oscillator_threshold) are muted with "Too few trades" → AC-8, AC-12
- [ ] Settings → enter 3 → Save stays disabled; force a PATCH with 3 → 400 → AC-12
- [ ] Filters: Last 30 days, Last 90 days, All time, Custom (from after to cannot be picked), Direction Long/Short, Strategy, Version → every tab and the curve change together → AC-9
- [ ] Curve shows one stepped line per strategy (6 today), legend matches line colours, zero line dashed → AC-10
- [ ] Pick a custom range with no signals → "No reconciled trades in this range" with the excluded counts → AC-14
- [ ] Stop the backend and reload → error message with Retry, no numbers shown; start the backend and press Retry → data returns → AC-14
- [ ] At phone width (390 px) → filters wrap, the table scrolls sideways inside its box, no page sideways scroll → AC-1

## Commands
- [ ] `npx vitest run apps/backend/src/scorecard --root apps/backend` → 17 tests pass (R math, short sign, costs, buckets, cuts, determinism, query validation) → AC-3 to AC-10, AC-13
- [ ] `curl -H "Authorization: Bearer <jwt>" "/api/v1/scorecard?from=2026-11-10&to=2026-11-01"` → 400 → AC-9
- [ ] `curl /api/v1/scorecard` with no bearer → 401 → AC-12
- [ ] `psql "$DATABASE_URL" -c "select strategy_id, count(*) from signals where outcome_status is not null group by 1"` → counts equal the Strategy tab rows → AC-13
- [ ] After the next market session: a new scanner signal and a new guru signal have `strategy_id`, `strategy_version` set (`1.0` scanner, `v1` guru) and `market_regime` set if a market snapshot existed that morning, else null → AC-11

## Value sourcing checks
- [ ] Entry and stop: a signal with no `snapshot_json.stop.level` is counted under "Invalid risk", not in any row (`stopOf` fallback not used) → AC-3
- [ ] Gross R: pick one signal, compute `outcome_pnl_pct/100 × entry / |entry − stop|` by hand → matches its contribution (check a SHORT too) → AC-3
- [ ] Charges: insert an evidence row with `estimated_charges = 40` for one reconciled signal → its strategy's Est. cost share drops below 100% and its net R uses ₹40 → AC-6
- [ ] Risk budget: set `user_settings.risk_budget = 2000` for your user → the ₹1,000 note disappears and net expectancy moves closer to gross → AC-6
- [ ] Time bucket uses IST: a signal at 04:30 UTC lands in Morning (10:00 IST), not by server clock → AC-7
- [ ] Regime: once `market_context_snapshots` has rows, new signals take the latest same day snapshot at or before fire time → AC-11
- [ ] Paging: with more than 1000 reconciled signals, All time still equals `select count(*)` (no 1000 row cap) → AC-9, AC-13

## Acceptance-criteria coverage
- AC-1 page and nav, phone width · AC-2 excluded counts · AC-3 R math and invalid risk · AC-4 win rate · AC-5 row fields · AC-6 costs and risk budget · AC-7 five cuts and buckets · AC-8 too few flag · AC-9 filters, 400s, paging · AC-10 curve · AC-11 stamping · AC-12 settings and auth · AC-13 SQL match, determinism · AC-14 empty and error states
