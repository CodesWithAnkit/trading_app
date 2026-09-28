# Verify: Strategy Engine Implementation (Phase 2) · spec 0001 · updated 2026-09-28
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
## Commands
- [x] `node -e "require('./lib/strategy/config/configValidation.ts').validateStrategyConfig({...validConfig})"` -> passes without throwing -> AC-1
- [x] `node -e "require('./lib/strategy/config/configValidation.ts').validateStrategyConfig({candles: {}})"` -> throws Zod error -> AC-1
- [x] `node -e "require('./lib/strategy/market/candleAggregation.ts').aggregateTo5m([...five1mCandles])"` -> returns single 5m candle matching maxHigh/minLow -> AC-2
- [x] `node -e "require('./lib/strategy/market/candleValidation.ts').validateCandle({high: 1, open: 2, close: 2})"` -> throws Zod error about high < maxBody -> AC-2
- [x] `node -e "require('./lib/strategy/market/candleValidation.ts').validateCandle({low: 3, open: 2, close: 2})"` -> throws Zod error about low > minBody -> AC-2
- [x] `node -e "require('./lib/strategy/eligibility/eligibilityEngine.ts').evaluateEligibility({...})"` -> confirms `CONFIG_INCOMPLETE` if limits are null -> AC-3
- [x] `node -e "require('./lib/strategy/eligibility/eligibilityEngine.ts').evaluateEligibility({...})"` -> confirms `DATA_INVALID` if price/volume is missing -> AC-3
- [x] `node -e "require('./lib/strategy/features/rvolCalculator.ts').calculateRvol({...})"` -> confirms time-of-day matching filters correctly -> AC-3
- [x] `node -e "require('./lib/strategy/features/trendCalculator.ts').calculateTrend({...})"` -> confirms `CONTRADICTORY` state when 1m and 5m SMA disagree -> AC-3
- [x] `node -e "require('./lib/strategy/setup/candidateDetection.ts').detectCandidate({...})"` -> returns `valid: false` with `INCOMPATIBLE_TREND_LONG` for breakout with BEARISH trend -> AC-3
- [x] `node -e "require('./lib/strategy/plan/tradePlanBuilder.ts').buildTradePlan({...})"` -> confirms entry/stop/target generation -> AC-4
- [x] `node -e "require('./lib/strategy/plan/riskRewardValidator.ts').validateRiskReward({...})"` -> confirms `INVALID_ORDERING_LONG` if stop > entry -> AC-4
- [x] `node -e "require('./lib/strategy/plan/riskRewardValidator.ts').validateRiskReward({...})"` -> confirms `INSUFFICIENT_RR_RATIO` if riskRewardRatio < minimum_ratio -> AC-4
- [x] `node -e "require('./lib/strategy/plan/confidenceScorer.ts').calculateConfidence({...})"` -> confirms `INVALID_CONFIG` if weights do not sum to 1.0 -> AC-4
- [x] `node -e "require('./lib/strategy/plan/confidenceScorer.ts').calculateConfidence({...})"` -> confirms correct score computation -> AC-4
- [x] `node -e "require('./lib/strategy/signal/signalSnapshot.ts').buildSignalSnapshot({...})"` -> confirms snapshot includes all inputs and hashes -> AC-4
- [x] `node -e "require('./lib/strategy/signal/lifecycle.ts').transitionSignal({...})"` -> confirms state transitions from CANDIDATE -> ACTIVE -> INVALIDATED/EXPIRED -> AC-5
- [x] `node -e "require('./lib/strategy/signal/deduplication.ts').isDuplicate({...})"` -> confirms duplicate suppression within cooldown window -> AC-5
- [x] `node -e "require('./lib/strategy/simulation/outcomeEvaluation.ts').evaluateOutcome({...})"` -> confirms `AMBIGUOUS` outcome when Target and Stop hit in same candle -> AC-6
- [x] `node -e "require('./lib/strategy/simulation/simulationRunner.ts').runSimulation({...})"` -> confirms pipeline orchestrates components correctly without look-ahead -> AC-6
- [x] `node -e "require('./lib/strategy/simulation/fixtures.ts').generateBreakoutFixture(100, 5)"` -> confirms deterministic candle generation -> AC-8
- [x] `node -e "require('./lib/strategy/simulation/calibration.ts').generateCalibrationReport('1.0', ...)"` -> confirms report metrics generation -> AC-7
- [x] `cat docs/calibration/sample_report.md` -> confirms calibration layout matches requirements -> AC-7
## Acceptance-criteria coverage
- AC-1 is covered by config loading and validation steps.
- AC-2 is covered by 1m->5m aggregation tests and invalid OHLC rejection tests.
- AC-3 is covered by eligibility validations (incomplete/invalid) and feature/candidate calculators (RVOL time-of-day, trend contradictions).
- AC-4 is covered by risk/reward bounding, confidence score accumulation, and signal snapshot generation checks.
- AC-5 is covered by lifecycle transition validation and deduplication logic tests.
- AC-6 is covered by outcome evaluation logic and the simulation runner's look-ahead prevention.
- AC-7 is covered by the generation of the parameter calibration report.
- AC-8 is covered by deterministic fixture generation for unit tests.
