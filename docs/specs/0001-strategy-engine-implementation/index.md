# 0001. Implement deterministic strategy engine and calibration

**Date**: 2026-09-28
**Status**: Accepted

## Summary

This decision defines the architecture and implementation plan for the Phase 2 Strategy Engine. We are building a deterministic, stateless, side-effect-free pipeline for strategy simulation and calibration using historical data. The engine explicitly decouples signal generation from live broker execution (Angel One integration) to ensure reproducibility, rigorous testing without look-ahead bias, and safe configuration tuning.

## Rationale

See [rationale.md](./rationale.md) for the context, considered options, and decision record.

## Requirements

**User stories**:
- As a quantitative trader, I want to run a strategy configuration over historical candles so that I can evaluate its performance deterministically.
- As a developer, I want a pure functional pipeline so that I can test edge cases (breakouts, fakeouts, gaps) without mocking a live broker.

**Acceptance criteria**:
- **AC-1**: Strategy configuration loads, validates, and produces a deterministic hash.
- **AC-2**: Raw candles normalize into 1-minute and 5-minute canonical OHLC structures deterministically.
- **AC-3**: Eligibility rules, trend detection, RVOL, and structural breakouts/breakdowns calculate without look-ahead bias.
- **AC-4**: Signal snapshot contains all inputs, outputs, and intermediate states (confidence, risk/reward) and is immutable once generated.
- **AC-5**: Signal lifecycle transitions correctly (Candidate → Active → Invalidated/Expired/Entered).
- **AC-6**: Identical inputs (candles + config) yield strictly identical signal outputs and outcomes.
- **AC-7**: Calibration report generates successfully, exposing all unresolved parameters for future tuning.
- **AC-8**: The strategy package contains strictly zero broker (Angel One) execution or network code.

## Decision

**Chosen option**: Option 1: Implement a pure, stateless deterministic pipeline.

We will build the Phase 2 Strategy Engine as a stateless transformation pipeline that consumes canonical candles and strategy configuration to produce immutable trading signals and historical outcome evaluations.

## Feature design

**Data model sketch**:
- `StrategyConfig`: Unresolved/calibrating/ready parameters, weights, horizons.
- `Candle`: Canonical OHLCV, timestamp, timeframe (1m, 5m), complete/forming flag.
- `SignalSnapshot`: Strategy version, config hash, symbol, setup family, entry/stop/T1/T2, raw features, confidence score, eligibility result.
- `OutcomeEvaluation`: Outcome (T1 first, stop first, ambiguous), MFE (max favorable), MAE (max adverse).

**State transitions**:
- Signal Lifecycle: `CANDIDATE` → `ACTIVE`
- `ACTIVE` → `INVALIDATED` (rule broken) | `EXPIRED` (timeout) | `SKIPPED` | `ENTERED` (price crossed).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `runSimulation` | Fn | `candles[]`, `config`, `calendar` | `signals[]`, `outcomes[]`, `metrics` | N/A | InvalidConfig, InsufficientHistory |
| `calculateConfidence`| Fn | `rawFeatures`, `weights` | `score`, `band`, `components` | N/A | InvalidWeightSum |
| `evaluateOutcome` | Fn | `signal`, `subsequentCandles[]` | `outcome`, `mfe`, `mae` | N/A | AmbiguousSameCandle |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `normalizeCandle` | 5m OHLC | Aggregated from five sequential 1m candles |
| `detectTrend` | Trend state (bullish/bearish) | Calculated from historical rolling window prior to evaluation point |
| `scoreConfidence` | Confidence score (0-100) | Computed from component scores multiplied by config weights |
| `deduplicate` | Signal Identity | Hashed from instrument, direction, setup family, and strategy version |

**Key invariants**:
- `signal.expiresAt - signal.createdAt <= 30 minutes`
- `sum(confidenceWeights) == 1.0`
- `riskPerShare > 0`
- Same input candles + same config + same version = strictly identical signal output.
- No future candle data is queried for current feature evaluation (No look-ahead bias).

**Security model**:
Local deterministic execution only. No network outbound connections to Angel One or any broker are permitted. No live credentials or secrets required.

**Configuration required**:
- `STRATEGY_CONFIG_JSON`: Local file containing parameter thresholds and weights for the pipeline.

**Critical test scenarios**:
- Happy path: A clean bullish breakout produces a valid, reproducible LONG signal snapshot, verifies **AC-4**, **AC-6**.
- Failure case: Target and stop hit within the same 5-minute candle yields AMBIGUOUS outcome, verifies **AC-3**, **AC-6**.
- Constraint: Attempting to import or execute an Angel One API client throws an error in CI, verifies **AC-8**.

## Build plan

This plan follows the 18 steps strictly mandated by the Phase 2 prompt. Execution will proceed in Tracer Bullet fashion—building the core types and basic flow first, then enriching each calculator.

1. Create/load strategy configuration and validation, satisfies **AC-1**
2. Create canonical candle types and validation, satisfies **AC-2**
3. Implement deterministic 1m → 5m aggregation, satisfies **AC-2**
4. Implement eligibility engine (liquidity, history), satisfies **AC-3**
5. Implement individual feature calculators (RVOL, Trend), satisfies **AC-3**
6. Implement structure/range detection, satisfies **AC-3**
7. Implement breakout/breakdown candidate detection, satisfies **AC-3**
8. Implement entry/stop/target/trailing plan builder, satisfies **AC-4**
9. Implement risk/reward validation, satisfies **AC-4**
10. Implement confidence scoring against configured weights, satisfies **AC-4**
11. Implement signal contract and immutable snapshot, satisfies **AC-4**
12. Implement lifecycle transitions and deduplication, satisfies **AC-5**
13. Implement historical outcome evaluation (MFE/MAE/Ambiguous), satisfies **AC-6**
14. Implement deterministic simulation runner to orchestrate the pipeline, satisfies **AC-6**
15. Create deterministic fixtures (fakeouts, gaps, late entries) and unit/property tests, satisfies **AC-6**, **AC-8**
16. Run calibration analysis against historical data, satisfies **AC-7**
17. Produce calibration report listing unresolved parameters and candidate ranges, satisfies **AC-7**
18. Prepare next phase for historical dataset integration, satisfies **AC-7**

## Consequences

**Positive**:
- Guarantees that backtests match production code identically.
- Enables safe, rapid exploration of strategy parameters.
- Isolates complex algorithmic logic from asynchronous network failures.

**Negative / tradeoffs**:
- Requires building substantial simulation scaffolding before any live trading can occur.
- Strict anti-look-ahead rules make pipeline implementation more complex than simple scripting.

**Neutral**:
- Outcomes will be classified as `AMBIGUOUS` frequently if using coarse (e.g., 5m) resolution data for tight risk/reward setups.

## Follow-up

- [ ] Execute Step 1: Strategy configuration loading and validation.
- [ ] Determine storage format for calibration reports and fixture definitions.
