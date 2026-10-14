# Verify: Add bulk actions to manage multiple trades · spec 0014 · updated 2026-09-30
_Steps derived from spec 0014 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
## UI / manual
- [ ] Visit `/dashboard/trades` → observe a checkbox column on the left with a "Select All" header → AC-1
- [ ] Select one or more rows → observe floating action bar appearing with "Close X Selected" button → AC-2
- [ ] Click "Close Selected" → verify existing exit logic is called for each selected trade (e.g. trades change status to Closed) → AC-3
- [ ] After closure completes → observe toast notification indicating success/failure count and any failed trades remain selected → AC-4
## Acceptance-criteria coverage
- AC-1 … covered by step 1 · AC-2 … covered by step 2 · AC-3 … covered by step 3 · AC-4 … covered by step 4
