# Phase 2 --- Strategy Engine Implementation & Calibration

**Project:** Intraday Stock Tracker\
**Phase:** Scanner Prototype / Strategy Engine\
**Strategy:** `intraday-momentum-v1`\
**Status:** Ready for implementation\
**Execution mode:** Simulation / historical data only\
**Broker execution:** Prohibited

------------------------------------------------------------------------

## 1. Purpose

This phase converts the approved product, architecture, strategy
specification, strategy decisions, and strategy configuration into a
deterministic, testable strategy engine.

The objective is **not** to connect Angel One yet.

The objective is to build a pure strategy pipeline that can take
historical or simulated NSE cash-equity candle data and produce:

-   eligibility decisions;
-   breakout/breakdown candidates;
-   feature metrics;
-   entry zones;
-   stock-specific invalidation/stop;
-   Target 1;
-   optional Target 2+;
-   trailing guidance;
-   explainable confidence;
-   signal lifecycle;
-   immutable signal snapshots;
-   signal outcome evaluation;
-   ranking;
-   calibration metrics.

The same calculation layer must later be reusable by the always-on
scanner worker.

------------------------------------------------------------------------

# 2. Source of Truth

Implementation order:

1.  `PRD.md`
2.  `Architecture.md`
3.  `DESIGN_SYSTEM.md`
4.  `STRATEGY_SPEC.md`
5.  `STRATEGY_DECISIONS.md`
6.  `STRATEGY_CONFIG.md`
7.  This implementation plan

If two documents conflict:

-   product/security boundaries from PRD win;
-   system boundaries from Architecture win;
-   strategy behavior from STRATEGY_DECISIONS wins;
-   concrete parameter names/defaults from STRATEGY_CONFIG wins;
-   unresolved `TBD`, `CALIBRATE`, or `null` values must remain
    unresolved rather than being silently invented.

Do not introduce undocumented trading rules merely to make the engine
generate more signals.

------------------------------------------------------------------------

# 3. Non-Negotiable Boundaries

## 3.1 Product boundary

Support only:

-   NSE cash-equity instruments;
-   Long;
-   Short;
-   intraday setups;
-   1-minute candles;
-   5-minute candles;
-   breakout/momentum;
-   breakdown/momentum.

Do not implement:

-   options;
-   futures;
-   indices;
-   NIFTY/BANKNIFTY as tradable instruments;
-   portfolio logic;
-   holdings;
-   funds;
-   broker positions;
-   order placement;
-   order modification;
-   order cancellation;
-   broker order status;
-   automatic execution.

## 3.2 Security boundary

No Angel One:

-   API key;
-   client ID;
-   MPIN;
-   TOTP;
-   session token

may enter:

-   browser code;
-   test fixtures;
-   sample JSON committed to source control;
-   notification payloads;
-   strategy modules.

This phase must run without broker credentials.

## 3.3 Strategy boundary

The engine is decision support.

It must never describe a signal as:

-   guaranteed;
-   certain;
-   profitable;
-   a broker instruction.

Confidence means **setup quality**, not probability of profit.

Historical outcome statistics must remain separate from confidence.

------------------------------------------------------------------------

# 4. Phase Deliverables

Implement these layers in order:

``` text
Market Data Types
      ↓
Candle Validation / Normalization
      ↓
Eligibility Engine
      ↓
Feature Calculations
      ↓
Setup Detection
      ↓
Trade Plan Builder
      ↓
Confidence Engine
      ↓
Signal Validator
      ↓
Signal Lifecycle
      ↓
Outcome Evaluator
      ↓
Ranking
      ↓
Simulation Runner
      ↓
Calibration / Reporting
```

Do not begin with the live scanner.

------------------------------------------------------------------------

# 5. Recommended Module Structure

Use the existing repository conventions if source code already exists.

If no strategy package exists, use a structure equivalent to:

``` text
strategy/
  config/
    strategyConfig.ts
    configValidation.ts
    configHash.ts

  market/
    candleTypes.ts
    candleValidation.ts
    candleAggregation.ts
    session.ts

  eligibility/
    eligibilityEngine.ts
    eligibilityTypes.ts

  features/
    priceAction.ts
    relativeVolume.ts
    trend.ts
    volatility.ts
    liquidity.ts
    riskReward.ts

  setup/
    rangeDetection.ts
    breakoutDetection.ts
    breakdownDetection.ts
    setupValidation.ts

  plan/
    entryZone.ts
    stop.ts
    targets.ts
    trailing.ts
    tradePlan.ts

  confidence/
    componentScores.ts
    confidenceScore.ts

  signal/
    signalTypes.ts
    signalEngine.ts
    signalValidation.ts
    signalLifecycle.ts
    signalDedup.ts
    signalRanking.ts

  outcome/
    outcomeEvaluator.ts
    comparableSetups.ts
    historicalOutcomeStats.ts

  simulation/
    simulationRunner.ts
    simulationClock.ts
    simulationReport.ts

  tests/
    ...
```

Names may be adapted to the existing codebase.

Do not duplicate business rules across modules.

------------------------------------------------------------------------

# 6. Canonical Data Contracts

## 6.1 Candle

Every candle must contain:

``` ts
type Candle = {
  symbol: string
  exchange: "NSE"
  timeframe: "1m" | "5m"
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  isComplete: boolean
}
```

Validation must reject:

-   non-positive prices;
-   negative volume;
-   `high < max(open, close)`;
-   `low > min(open, close)`;
-   invalid timestamps;
-   duplicate timestamps for the same symbol/timeframe;
-   impossible timeframe alignment.

------------------------------------------------------------------------

# 7. Candle Construction

The architecture requires:

-   1-minute candles;
-   5-minute candles.

Use:

-   5-minute candles for setup structure;
-   1-minute candles for timing/execution context;
-   completed candles for confirmation;
-   forming candles only for monitoring.

Do not treat a forming candle as a confirmed breakout/breakdown.

The aggregation logic must be deterministic.

For a 5-minute bucket:

``` text
open   = first 1m open
high   = max 1m high
low    = min 1m low
close  = final 1m close
volume = sum 1m volume
```

A bucket is complete only when all required constituent data is
available according to the configured data policy.

------------------------------------------------------------------------

# 8. Feed/Data Quality Gate

Before generating a normal signal, validate:

-   required candles exist;
-   timestamps are ordered;
-   no unexpected gaps violate the configured continuity policy;
-   OHLCV values are valid;
-   data is not marked simulated when running a live-data environment;
-   feed freshness is within configuration;
-   market state is compatible with signal generation.

If the feed is:

-   disconnected;
-   stale;
-   incomplete;
-   inconsistent;
-   simulated in a live environment;

the engine must fail closed.

It may report the reason, but it must not create a normal live signal.

------------------------------------------------------------------------

# 9. Eligibility Engine

Eligibility must be explicit and independently testable.

Required categories:

-   NSE cash equity;
-   active/tradable status;
-   not suspended;
-   not cautionary/unsuitable;
-   minimum price;
-   minimum average volume;
-   minimum traded value;
-   liquidity;
-   sufficient candle history;
-   valid data quality.

All numerical thresholds come from `STRATEGY_CONFIG.md`.

Where configuration currently contains `null`, `TBD`, or `CALIBRATE`:

-   represent the state explicitly;
-   do not silently substitute a magic number;
-   allow the engine to report `CONFIG_INCOMPLETE`.

Example:

``` ts
type EligibilityResult = {
  eligible: boolean
  status:
    | "ELIGIBLE"
    | "INELIGIBLE"
    | "CONFIG_INCOMPLETE"
    | "DATA_INVALID"
  reasons: string[]
  metrics: Record<string, number | null>
}
```

------------------------------------------------------------------------

# 10. Feature Layer

Each feature must return both:

1.  the raw metric;
2.  an interpretation/state where applicable.

The feature layer must not create signals.

## 10.1 Price Action / Structure

Calculate the configured 5-minute range/structure representation.

The output should expose:

``` ts
{
  referenceHigh,
  referenceLow,
  rangeWidth,
  rangeWidthBps,
  structureQuality,
  directionContext
}
```

Exact range lookback/reference method remains configuration-driven.

Do not hardcode a lookback that conflicts with `STRATEGY_CONFIG`.

------------------------------------------------------------------------

# 11. Relative Volume

Use the configured 5-minute timeframe.

Conceptually:

``` text
RVOL =
current comparable-period volume
/
historical baseline volume for the same comparable period
```

Prefer the configured median baseline where specified.

The implementation must support time-of-day-aware comparison.

Return:

``` ts
{
  currentVolume,
  baselineVolume,
  rvol,
  baselineMethod,
  comparablePeriod
}
```

If there is insufficient history:

``` text
RVOL = unavailable
```

Do not substitute `1.0`.

------------------------------------------------------------------------

# 12. Trend

Trend is evaluated primarily on 5-minute structure and secondarily on
1-minute context.

The implementation must expose a state such as:

``` text
BULLISH
BEARISH
MIXED
CONTRADICTORY
UNAVAILABLE
```

Rules:

-   aligned trend may contribute positively;
-   mixed trend should not receive the same positive contribution as
    aligned trend;
-   contradictory higher-timeframe context must not contribute
    positively;
-   insufficient data must be explicit.

The exact trend calculation method remains configuration-driven until
calibrated.

------------------------------------------------------------------------

# 13. Volatility

Volatility must support:

-   movement potential;
-   target construction;
-   unstable/extreme conditions;
-   risk/reward validation.

The implementation must return raw volatility plus normalized
interpretation.

Example contract:

``` ts
{
  rawValue,
  normalizedValue,
  regime: "LOW" | "NORMAL" | "HIGH" | "EXTREME" | "UNAVAILABLE"
}
```

Do not invent a volatility formula if the strategy configuration does
not specify one.

Implement the calculation behind an interface so the calibrated method
can be inserted without changing the signal engine.

------------------------------------------------------------------------

# 14. Liquidity

Liquidity must use documented inputs only:

-   volume;
-   traded value;
-   candle continuity;
-   spread where reliable.

Do **not** introduce market-depth/"Depth" scoring unless a separate
strategy decision explicitly adds it.

Return both raw values and a normalized liquidity score when configured.

------------------------------------------------------------------------

# 15. Setup Detection

Two supported setup families:

``` text
BREAKOUT_MOMENTUM
BREAKDOWN_MOMENTUM
```

## 15.1 Long

Candidate structure:

``` text
valid range/structure
+
price acceptance above reference level
+
supporting momentum/volume
+
compatible trend
+
acceptable volatility
+
acceptable liquidity
+
valid risk/reward
```

## 15.2 Short

Mirror the long logic:

``` text
valid range/structure
+
price acceptance below reference level
+
supporting momentum/volume
+
compatible trend
+
acceptable volatility
+
acceptable liquidity
+
valid risk/reward
```

Do not use a single arbitrary percentage breakout rule unless that
percentage is explicitly present in configuration.

------------------------------------------------------------------------

# 16. False Breakout Protection

A candidate should be rejected when configured confirmation conditions
are not satisfied.

Examples of configurable protections already established by the strategy
configuration include:

-   confirmation window;
-   minimum acceptance distance;
-   volume requirement;
-   immediate return into range;
-   late-entry buffer.

Implement these as named rules.

Each rejected candidate must expose its reason.

Example:

``` ts
{
  valid: false,
  rejectionReasons: [
    "RANGE_RETURN",
    "INSUFFICIENT_RVOL"
  ]
}
```

------------------------------------------------------------------------

# 17. Entry Zone

The entry plan must contain:

``` ts
{
  entryLow,
  entryHigh,
  referenceEntry
}
```

Requirements:

-   entry zone must be derived from the setup;
-   width must respect configured maximum;
-   late entries must be rejected;
-   reference entry must be deterministic;
-   entry cannot be placed on the wrong side of the setup structure.

Do not use a fixed percentage entry zone without configuration support.

------------------------------------------------------------------------

# 18. Stop / Invalidation

The stop must be stock/setup-specific.

Allowed conceptual sources include:

-   structure;
-   swing level;
-   setup boundary;
-   volatility adjustment.

The final method must be configuration-driven.

Required output:

``` ts
{
  stop,
  method,
  structuralReference,
  distanceFromEntry,
  distanceBps
}
```

Validation:

### Long

``` text
stop < referenceEntry
```

### Short

``` text
stop > referenceEntry
```

Never loosen the original stop through trailing logic.

------------------------------------------------------------------------

# 19. Target 1

Target 1 is fixed by product specification.

For long:

``` text
T1 = referenceEntry × 1.01
```

For short:

``` text
T1 = referenceEntry × 0.99
```

Use the configured price precision/tick handling appropriate to the
instrument.

Do not round before performing calculations unless the configured
market-price normalization requires it.

------------------------------------------------------------------------

# 20. Target 2+

Target 2 and later targets must be derived from:

-   momentum;
-   volatility;
-   structure.

They must not be arbitrary fixed percentages.

If the available information does not support a valid T2:

``` text
T2 = null
```

It is better to produce one valid target than a fabricated target.

------------------------------------------------------------------------

# 21. Risk/Reward Validation

Before a candidate becomes a signal:

### Long

``` text
stop < entry < target
```

### Short

``` text
target < entry < stop
```

Then calculate:

``` text
riskPerShare = abs(referenceEntry - stop)

rewardToTarget =
abs(target - referenceEntry)

riskReward =
rewardToTarget / riskPerShare
```

Reject the signal if configured minimum risk/reward is not met.

Do not alter the stop or target merely to force the ratio to pass.

------------------------------------------------------------------------

# 22. Trailing Guidance

Trailing is advisory only.

It must:

-   be deterministic;
-   never loosen the original invalidation;
-   never place a broker order;
-   expose activation logic;
-   expose trailing distance/method when configured.

Example:

``` ts
{
  enabled: true,
  activationCondition,
  trailingMethod,
  trailingDistance,
  initialStop
}
```

------------------------------------------------------------------------

# 23. Confidence Engine

Confidence is a **0--100 setup-quality score**.

Do not call it probability.

Components:

1.  price action / setup quality;
2.  relative volume;
3.  trend alignment;
4.  volatility;
5.  liquidity;
6.  risk/reward.

Each component should produce:

``` text
0–100
```

The final score is:

``` text
confidence =
Σ(componentScore × configuredWeight)
```

Weights must come from configuration.

Weights must sum to:

``` text
1.0
```

Bands:

``` text
0–49   Low
50–69  Medium
70–100 High
```

The result must preserve the component breakdown.

Example:

``` ts
{
  score: 74,
  band: "HIGH",
  components: {
    priceAction: 82,
    relativeVolume: 78,
    trend: 76,
    volatility: 68,
    liquidity: 72,
    riskReward: 70
  },
  weights: { ... }
}
```

Do not use an opaque ML model in v1.

------------------------------------------------------------------------

# 24. Historical Outcome Layer

Keep this separate from confidence.

Historical outcome analysis may report:

-   T1 reached first;
-   T2 reached first;
-   stop reached first;
-   neither reached within horizon;
-   ambiguous.

Never infer intrabar ordering when the available candle data cannot
establish it.

If both a target and stop are touched within the same candle and
ordering cannot be established:

``` text
AMBIGUOUS
```

Exclude ambiguous outcomes from probability-like historical estimates.

If sample size is below the configured minimum:

``` text
Insufficient historical sample
```

Do not display a misleading percentage.

------------------------------------------------------------------------

# 25. Comparable Setup Definition

Comparable setups should include the documented dimensions:

-   strategy version;
-   setup family;
-   direction;
-   volatility regime;
-   RVOL regime/value;
-   trend state;
-   liquidity state;
-   risk structure.

The comparable-set logic must be deterministic and versioned.

------------------------------------------------------------------------

# 26. Signal Contract

Every generated signal must contain enough information to reproduce the
decision later.

Minimum snapshot:

``` ts
{
  strategyVersion,
  configurationVersion,
  configurationHash,

  symbol,
  exchange,
  direction,
  setupFamily,

  createdAt,
  expiresAt,

  marketState,
  feedState,

  currentPrice,

  entryZone,
  referenceEntry,
  stop,
  targets,
  trailing,

  rawFeatures,
  normalizedFeatures,

  confidence,
  confidenceComponents,

  eligibilityResult,

  ruleInputs,
  ruleDecisions
}
```

The snapshot must be immutable after creation.

------------------------------------------------------------------------

# 27. Signal Lifecycle

Implement:

``` text
CANDIDATE
    ↓
ACTIVE
    ├── INVALIDATED
    ├── EXPIRED
    ├── SKIPPED
    └── ENTERED
              ↓
        JOURNALED TRADE
```

Rules:

-   signal lifetime must never exceed 30 minutes;
-   expiry is deterministic;
-   invalidation must be recorded with reason;
-   a forming-candle observation must not silently become a confirmed
    signal;
-   lifecycle transitions must be auditable.

------------------------------------------------------------------------

# 28. Deduplication

Use the configured deduplication identity:

``` text
instrument
+
direction
+
setup_family
+
strategy_version
+
setup_reference_level
```

Suppress duplicate active signals according to configured cooldown
behavior.

If cooldown is unresolved, keep the implementation configurable and
report configuration incompleteness rather than inventing a duration.

------------------------------------------------------------------------

# 29. Ranking

Active signals are display-ranked by:

1.  confidence;
2.  risk/reward;
3.  freshness/time remaining;
4.  deterministic symbol tie-breaker.

This ranking is presentation ordering only.

It must not mutate signal quality.

------------------------------------------------------------------------

# 30. Simulation Runner

Build a deterministic historical/simulated runner.

Input:

``` text
symbol
candles
strategy config
session calendar
```

Output:

``` text
signals
signal state transitions
outcomes
feature snapshots
rejection reasons
summary metrics
```

The runner must be replayable.

Given identical:

-   input candles;
-   strategy version;
-   configuration;
-   configuration hash;

it must produce identical output.

------------------------------------------------------------------------

# 31. No Look-Ahead Bias

This is mandatory.

At simulated timestamp `T`, the engine may use only information
available at or before `T`.

Do not:

-   calculate future volume into current RVOL;
-   use future candles to establish current trend;
-   use future highs/lows to build current structure;
-   select parameters using the test period;
-   evaluate a signal using information unavailable when it was created.

Clearly separate:

``` text
feature window
signal timestamp
outcome window
```

------------------------------------------------------------------------

# 32. Simulation Outcome Evaluation

For every signal:

1.  start evaluation from signal creation time;
2.  process subsequent candles only;
3.  stop at configured outcome horizon or signal expiry policy;
4.  detect target/stop touches;
5.  classify the first determinable event;
6.  classify ambiguous candles as `AMBIGUOUS`;
7.  record maximum favorable/adverse movement when supported.

Store:

``` ts
{
  signalId,
  outcome,
  outcomeTimestamp,
  outcomePrice,
  mfe,
  mae,
  evaluationHorizon,
  ambiguous: boolean
}
```

------------------------------------------------------------------------

# 33. Calibration Workflow

Do not tune parameters directly on the final test period.

Use:

``` text
Historical data
      ↓
Data quality validation
      ↓
Exploratory distributions
      ↓
Candidate parameter ranges
      ↓
Training/calibration period
      ↓
Sensitivity analysis
      ↓
Out-of-sample period
      ↓
Paper tracking
      ↓
Freeze configuration
      ↓
Create new configuration version
```

Never overwrite a previously tested configuration.

------------------------------------------------------------------------

# 34. Calibration Metrics

At minimum report:

## Signal volume

-   candidates;
-   rejected candidates;
-   active signals;
-   invalidated;
-   expired;
-   duplicates suppressed.

## Setup quality

-   confidence distribution;
-   component distributions;
-   score by setup family;
-   score by direction.

## Outcomes

-   T1 first;
-   T2 first;
-   stop first;
-   neither;
-   ambiguous;
-   average/max favorable excursion;
-   average/max adverse excursion.

## Stability

-   results by day;
-   results by symbol;
-   results by direction;
-   results by setup family;
-   results by volatility regime;
-   results by RVOL regime;
-   results by confidence band.

Avoid relying on a single aggregate metric.

------------------------------------------------------------------------

# 35. Required Tests

## Unit tests

At minimum:

### Candle

-   valid candle;
-   invalid OHLC;
-   duplicate timestamp;
-   incomplete candle;
-   5-minute aggregation.

### Eligibility

-   eligible stock;
-   suspended stock;
-   insufficient history;
-   insufficient liquidity;
-   invalid data;
-   incomplete configuration.

### RVOL

-   normal calculation;
-   insufficient baseline;
-   time-of-day mismatch;
-   zero/invalid baseline.

### Trend

-   bullish;
-   bearish;
-   mixed;
-   contradictory;
-   insufficient data.

### Structure

-   valid range;
-   breakout;
-   breakdown;
-   range return;
-   insufficient structure.

### Plan

-   long entry;
-   short entry;
-   long stop;
-   short stop;
-   T1;
-   T2;
-   invalid risk/reward.

### Confidence

-   component normalization;
-   weighted score;
-   weight validation;
-   band boundaries.

### Lifecycle

-   creation;
-   activation;
-   expiry;
-   invalidation;
-   duplicate suppression;
-   illegal transition rejection.

### Outcome

-   T1 first;
-   T2 first;
-   stop first;
-   neither;
-   ambiguous same-candle event.

------------------------------------------------------------------------

# 36. Property / Invariant Tests

Add invariants for:

``` text
signal.expiresAt - signal.createdAt <= 30 minutes
```

Long:

``` text
stop < entry
entry < T1
```

Short:

``` text
T1 < entry
entry < stop
```

Risk:

``` text
riskPerShare > 0
```

Confidence:

``` text
0 <= score <= 100
```

Configuration:

``` text
sum(confidenceWeights) == 1
```

Reproducibility:

``` text
same input + same config => same signal output
```

Safety:

``` text
strategy package imports no broker-order client
```

------------------------------------------------------------------------

# 37. Test Fixtures

Create small deterministic fixtures rather than relying only on large
market datasets.

Fixtures should include:

1.  clean bullish breakout;
2.  clean bearish breakdown;
3.  false breakout;
4.  false breakdown;
5.  low-volume breakout;
6.  contradictory trend;
7.  excessive volatility;
8.  insufficient liquidity;
9.  invalid risk/reward;
10. late entry;
11. stale feed;
12. missing candle;
13. duplicate candle;
14. target first;
15. stop first;
16. ambiguous same-candle target/stop.

Each fixture should explain why the expected result occurs.

------------------------------------------------------------------------

# 38. Logging / Observability

Use structured logs.

Every candidate should be traceable through:

``` text
candidate ID
symbol
timestamp
strategy version
configuration version
configuration hash
setup family
eligibility result
rejection reasons
feature summary
signal result
```

Avoid verbose raw tick logging in normal operation.

Do not log secrets.

------------------------------------------------------------------------

# 39. Configuration Completeness

The engine must explicitly understand these states:

``` text
INCOMPLETE
SIMULATION_READY
PAPER_READY
LIVE_READY
RETIRED
```

Do not allow:

``` text
LIVE_READY
```

while required strategy parameters are still:

-   `TBD`;
-   `CALIBRATE`;
-   `null`.

At the end of this phase, the expected state is:

``` text
SIMULATION_READY
```

not `LIVE_READY`.

------------------------------------------------------------------------

# 40. What Must NOT Be Implemented Yet

Do not implement:

-   Angel One login;
-   Angel One WebSocket;
-   fixed-IP deployment;
-   production worker;
-   broker order APIs;
-   live notifications;
-   automatic trade execution;
-   automatic position management;
-   portfolio synchronization.

Those belong after the deterministic engine has passed simulation and
calibration.

------------------------------------------------------------------------

# 41. Definition of Done

Phase 2 is complete only when:

-   [ ] strategy config loads and validates;
-   [ ] config hash is deterministic;
-   [ ] candle normalization works;
-   [ ] eligibility engine works;
-   [ ] 1m/5m feature pipeline works;
-   [ ] breakout detection works;
-   [ ] breakdown detection works;
-   [ ] entry/stop/T1/T2/trailing plan generation works;
-   [ ] risk/reward validation works;
-   [ ] confidence calculation works;
-   [ ] signal snapshots are reproducible;
-   [ ] signal expiry is enforced at \<=30 minutes;
-   [ ] lifecycle transitions are tested;
-   [ ] deduplication is tested;
-   [ ] historical outcome evaluation works;
-   [ ] ambiguous outcomes are handled conservatively;
-   [ ] no look-ahead bias is covered by tests;
-   [ ] simulation runner can replay fixtures;
-   [ ] calibration report can be generated;
-   [ ] unresolved parameters are visible;
-   [ ] no broker execution code exists in the strategy package;
-   [ ] no credentials are required;
-   [ ] test suite passes.

------------------------------------------------------------------------

# 42. Implementation Order

Execute in exactly this order:

### Step 1

Create/load strategy configuration and validation.

### Step 2

Create canonical candle types and validation.

### Step 3

Implement deterministic 1m → 5m aggregation.

### Step 4

Implement eligibility engine.

### Step 5

Implement individual feature calculators.

### Step 6

Implement structure/range detection.

### Step 7

Implement breakout/breakdown candidate detection.

### Step 8

Implement entry/stop/target/trailing plan builder.

### Step 9

Implement risk/reward validation.

### Step 10

Implement confidence scoring.

### Step 11

Implement signal contract and immutable snapshot.

### Step 12

Implement lifecycle and deduplication.

### Step 13

Implement historical outcome evaluation.

### Step 14

Implement deterministic simulation runner.

### Step 15

Create deterministic fixtures and unit/property tests.

### Step 16

Run calibration analysis.

### Step 17

Produce a calibration report listing every unresolved parameter and
observed candidate ranges.

### Step 18

Only after the above passes, prepare the next phase for historical
dataset integration.

------------------------------------------------------------------------

# 43. Required Developer Output

After implementation, report:

``` text
PHASE 2 STATUS

Implemented:
- ...

Tests:
- ...
- ...

Simulation:
- ...

Calibration:
- ...

Unresolved parameters:
- ...

Known limitations:
- ...

Files changed:
- ...

Broker integration:
NOT IMPLEMENTED

Current strategy state:
SIMULATION_READY / INCOMPLETE
```

Do not claim `PAPER_READY` until paper-tracking prerequisites have
actually been implemented and validated.

------------------------------------------------------------------------

# 44. Critical Engineering Principle

The scanner should not be made "smart" by adding more undocumented
rules.

The objective of this phase is:

> **Make the documented strategy deterministic, inspectable,
> reproducible, testable, and calibratable.**

If a decision is missing from the approved strategy documents, surface
it as a configuration/calibration decision.

Do not hide it inside code.
