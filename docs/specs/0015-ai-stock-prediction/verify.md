# Verify: AI Stock Prediction · spec 0015
_Steps derived from spec 0015 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit stock details page → AI Insights panel loads → AC-4
- [ ] Check gauge color and percentage → matches prediction direction → AC-4

## Commands
- [ ] `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/insights/RELIANCE` → Returns JSON with `direction`, `confidence_score`, `summary_text`, `expires_at` → AC-1, AC-2, AC-3
- [ ] Execute `curl` again immediately → Returns cached data (no new Alpha Vantage/Gemini logs in backend) → AC-3

## Acceptance-criteria coverage
- AC-1 (Alpha Vantage fetch) covered by command step
- AC-2 (Gemini prediction) covered by command step
- AC-3 (Supabase cache) covered by immediate retry command step
- AC-4 (UI panel) covered by UI manual step
