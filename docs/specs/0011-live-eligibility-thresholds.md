# 0011 · Live eligibility thresholds

**Status**: Assumed
**Date**: 2026-09-29
**Authorized by**: ankitsharma-kiwi, during /develop

## Owed decision
Which eligibility thresholds the live scanner applies before running the strategy engine: minimum price, minimum average 1m and 5m volume, minimum traded value, maximum spread, and minimum candle history. The live strategy config leaves all of them `null`. The eligibility engine treats that as `CONFIG_INCOMPLETE`, which marks every stock ineligible, so the live scanner never reached the strategy engine.

## Assumption built on
Unset thresholds mean "no limit". In `ScannerService.evaluateStrategy`, an eligibility result with status `CONFIG_INCOMPLETE` whose only reason is the incomplete configuration counts as eligible. Any other rejection reason (instrument type, suspended, cautionary, unsuitable) still blocks. The eligibility engine and the strategy engine are unchanged. This is reasonable for the watched universe, because every stock in it has stock futures (spec 0009 AC-12), and NSE only allows liquid stocks into F&O. It also makes live behave like the replay, which calls the strategy engine directly. The engine's own 25 candle history check still applies.

## Code area
`apps/backend/src/scanner/scanner.service.ts` (`evaluateStrategy`, the eligibility gate only).

## Requirements
- A top 20 gainer with enough candle history reaches the strategy engine, and an engine trigger is saved as a signal (spec 0009 AC-1, AC-16; spec 0010 AC-1).
- A stock rejected for any reason other than the incomplete threshold configuration is still skipped.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect Live eligibility thresholds` to deliberate and ratify it (for example, real minimums for price, volume and spread). Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
