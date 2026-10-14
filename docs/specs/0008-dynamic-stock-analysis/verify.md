# Verify: Dynamic Stock Analysis & Strategy Engine · spec 0008 · updated 2026-09-29
_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open the Dashboard and observe the "Top Bullish Stocks" matrix (Active Signals). Verify dynamic stocks are listed with matched strategy names instead of fixed static mocks. → AC-6
- [x] Click on "View plan" for any active signal to navigate to the detailed Stock Analysis Page (`/dashboard/analysis/[symbol]`). → AC-7
- [x] On the Stock Analysis Page, verify that the quantitative trigger rules (Strategy Card) and the generated Trade Plan (Entry, Stop Loss, Target) match the values from the backend exactly. → AC-8
- [x] Click "Save to Journal" on the Trade Plan and verify it triggers a success alert and redirects to the Journal Page. → AC-9
- [x] On the Journal Page (`/dashboard/journal`), verify that the newly saved setup appears in the table with "OPEN" (or "PENDING") status and includes the notes/rationale. → AC-10

## Commands
- [x] `curl -s http://localhost:3001/api/v1/scanner/top-setups | grep "data"` → Verify the backend returns a ranked array of active or approaching setups (TradeSetups). → AC-4, AC-5
- [x] `curl -s http://localhost:3001/api/v1/journal | grep "data"` → Verify the backend returns a list of persisted JournalEntry records. → AC-10

## Acceptance-criteria coverage
- AC-1 to AC-3 covered by backend API testing and logs in Phase 5 part 1.
- AC-4 and AC-5 covered by `top-setups` API response verification.
- AC-6 covered by Dashboard active signals check.
- AC-7 to AC-9 covered by Stock Analysis Page navigation and behavior checks.
- AC-10 covered by Journal Page data display check.
