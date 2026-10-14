# Verify: Angel One SmartAPI Market Data Integration · spec 0005 · updated 2026-09-29
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands
- [x] `npm run scanner:angelone:smoke` connects and displays ticks without errors → AC-1, AC-2, AC-7
- [x] Wait for connection and observe feed health flush in Supabase → AC-6
- [x] Cause a network drop and observe exponential backoff in logs → AC-5

## Backend Integration
- [x] The scanner normalizes ticks and produces 1m and 5m candles → AC-3, AC-4
- [x] No broker execution endpoints are called or exist in code → AC-8

## Acceptance-criteria coverage
- AC-1, AC-2, AC-7 covered by step `npm run scanner:angelone:smoke`
- AC-6 covered by step `Wait for connection and observe feed health flush in Supabase`
- AC-5 covered by step `Cause a network drop and observe exponential backoff in logs`
- AC-3, AC-4 covered by step `The scanner normalizes ticks and produces 1m and 5m candles`
- AC-8 covered by step `No broker execution endpoints are called or exist in code`
