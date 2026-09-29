# Verify: Intraday Stock Tracker Dashboard UI · spec 0002 · updated 2026-09-28
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/dashboard` → Ensure `AppShell` with `Sidebar` and `Topbar` render correctly without visual defects → AC-1, AC-8
- [ ] Observe `Topbar` market state → Ensure it reflects the mock state properly (e.g. SIMULATED) → AC-6
- [ ] Resize window to mobile width → Ensure `Sidebar` hides and responsive layout kicks in → AC-1

## Commands
- [ ] `npm run build` → Expect clean build with no type errors → AC-1

## Acceptance-criteria coverage
- AC-1 covered by step `Visit /dashboard` and `npm run build`
- AC-6 covered by step `Observe Topbar market state`
- AC-8 covered by step `Visit /dashboard`

## UI / manual (Dashboard & Signals)
- [ ] Toggle `Market State` switcher on Dashboard → Ensure Delayed/Disconnected banners appear and metrics style adjust → AC-2
- [ ] Observe Dashboard with empty active signals mock data (if possible) → Ensure Empty State renders → AC-2
- [ ] Click a `SignalCard` "View plan" → Ensure it routes to `/dashboard/signals/[id]` → AC-6
- [ ] On Signal Detail page → Ensure chart, diagnostics, trade plan, and expiry timer render properly → AC-1
- [ ] On Expired Signal Detail page → Ensure "Signal Expired" banner appears and actions are disabled → AC-3

## UI / manual (Trade Execution & Management)
- [ ] On Signal Detail page, click "I entered" → Ensure Trade Entry Modal (Screen 4) opens → AC-4
- [ ] In Trade Entry Modal, enter a very high quantity that exceeds ₹3000 risk → Ensure Risk Limit Exceeded Modal (Screen 5) appears instead of closing → AC-4
- [ ] In Risk Limit Modal, click "Adjust to Safe Quantity" → Ensure quantity adjusts and original entry modal reappears → AC-4
- [ ] Visit an Open Trade Detail page (`/dashboard/trades/trd_001`) → Ensure execution log, chart placeholder, and trade details render → AC-5
- [ ] Click "Record Exit (Partial / Full)" → Ensure Trade Exit Modal opens → AC-5
- [ ] In Trade Exit Modal, test 25%, 50%, 75%, 100% buttons → Ensure quantity updates proportionally and "Partial/Full" label adjusts → AC-5

## UI / manual (Trade Journal)
- [ ] Visit `/dashboard/journal` → Ensure summary metrics and trade list render correctly → AC-7
- [ ] Click "Audit" on a trade in the journal → Ensure Audit Drawer (Screen 7) opens showing timeline and details → AC-7

## UI / manual (Responsive Layout)
- [ ] Resize window to mobile width → Ensure `Sidebar` hides and `BottomNav` appears at the bottom of the screen → AC-9
- [ ] On desktop width (lg+) → Ensure `Sidebar` is visible and `BottomNav` is hidden → AC-9
