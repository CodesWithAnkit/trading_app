# Verify: Remaining Intraday Dashboard Pages · spec 0003 · updated 2026-09-28
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] visit `/settings` → change Risk Budget and theme → expect values to persist in context → AC-4
- [ ] visit `/dashboard/trades` → filter trades by ALL/OPEN/CLOSED → expect correct trades to show → AC-1
- [ ] visit `/dashboard/signals` → toggle between All, Long, Short → expect signals to filter properly → AC-2
- [ ] visit `/dashboard/performance` → inspect Equity Curve chart → expect Recharts SVG to render with no errors → AC-3
- [ ] visit `/dashboard/journal` → click "Export CSV" → expect alert; use date/status filters → expect accurate ledger → AC-5

## Commands
- [ ] `npm run build` → passes without recharts-related type errors

## Acceptance-criteria coverage
- AC-1 covered by step `/dashboard/trades`
- AC-2 covered by step `/dashboard/signals`
- AC-3 covered by step `/dashboard/performance`
- AC-4 covered by step `/settings`
- AC-5 covered by step `/dashboard/journal`
