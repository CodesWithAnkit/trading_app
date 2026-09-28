# Intraday Stock Tracker --- Strategy Specification

**Version:** 1.0\
**Status:** Draft --- Strategy Definition Foundation\
**Product:** Intraday Stock Tracker\
**Market:** NSE cash-equity stocks only\
**Execution:** Manual execution outside the application\
**Primary broker:** Angel One --- market data only\
**Source of truth:** `PRD.md`, `Architecture.md`, `DESIGN_SYSTEM.md`

------------------------------------------------------------------------

# 1. Purpose

This document defines the strategy-engine contract for the Intraday
Stock Tracker.

It specifies:

-   what market data the scanner consumes;
-   how eligible instruments are determined;
-   how candles and features are produced;
-   how long and short setups are represented;
-   how signal plans are constructed;
-   how confidence is represented;
-   how signal expiry works;
-   how historical outcomes are measured;
-   how strategy versions are recorded;
-   what must be validated before live use.

This document does **not** authorize broker order execution.

The application remains a decision-support and manual-journaling
product.

------------------------------------------------------------------------

# 2. Product Boundary

The strategy engine follows:

``` text
Market Data
    ↓
Instrument Eligibility
    ↓
Candle Aggregation
    ↓
Feature Calculation
    ↓
Strategy Evaluation
    ↓
Signal Candidate
    ↓
Signal Plan
    ↓
Confidence / Metrics
    ↓
Persistence
    ↓
Dashboard
```

It must never perform:

``` text
Signal
    ↓
Broker Order
```

The user independently executes any trade through Angel One and records
the result in the journal.

The scanner is market-data-only.

------------------------------------------------------------------------

# 3. Strategy Scope

## 3.1 Supported Instruments

The first release supports:

-   NSE cash-equity stocks
-   Eligible and liquid instruments only

The first release does not support:

-   Options
-   Indices
-   Nifty instruments as tradable instruments
-   Automated broker execution
-   Broker positions
-   Broker holdings
-   Portfolio operations

The currently configured universe may contain a fixed number of
instruments, but the strategy specification does not make that number a
permanent product constraint.

------------------------------------------------------------------------

# 4. Supported Setup Families

The first release supports two directional setup families.

## 4.1 Bullish Setups

-   Breakout
-   Momentum

## 4.2 Bearish Setups

-   Breakdown
-   Momentum

The PRD identifies these setup families but does not define the exact
mathematical thresholds.

Therefore this specification deliberately does not invent those
thresholds.

The exact rules must be finalized before live strategy deployment.

------------------------------------------------------------------------

# 5. Required Strategy Inputs

The scanner evaluates the following categories:

1.  Price action
2.  Relative volume
3.  Trend
4.  Volatility
5.  Liquidity
6.  Risk/reward

These inputs are required because they are explicitly identified by the
product requirements.

The exact formulas and thresholds for each input remain strategy
decisions.

------------------------------------------------------------------------

# 6. Instrument Eligibility

An instrument is eligible only if it satisfies the configured NSE
cash-equity universe and the required liquidity/tradability checks.

The scanner must exclude:

-   Illiquid instruments
-   Suspended instruments
-   Cautionary instruments
-   Otherwise unsuitable instruments

## 6.1 Eligibility Parameters

The following must be configurable or versioned:

  Parameter                   Status
  --------------------------- ----------
  Minimum price               TBD
  Minimum average volume      TBD
  Minimum liquidity           TBD
  Maximum spread              TBD
  Suspension/caution filter   Required
  Tradability filter          Required
  Universe membership         Required

Do not hardcode values until the strategy owner approves them.

------------------------------------------------------------------------

# 7. Market Data

The live scanner receives market-data updates from Angel One SmartAPI.

The worker is responsible for:

-   maintaining the market-data session;
-   receiving ticks;
-   aggregating ticks;
-   generating one-minute candles;
-   generating five-minute candles;
-   calculating strategy inputs;
-   generating signals;
-   persisting signals and feed health.

The browser must never receive Angel One credentials.

------------------------------------------------------------------------

# 8. Candle Construction

The strategy requires at least:

-   1-minute candles
-   5-minute candles

The scanner aggregates live ticks into candles.

Each candle should preserve, where available:

``` text
timestamp
open
high
low
close
volume
```

The strategy engine must use a consistent timezone convention.

The product uses IST for user-facing time-sensitive values.

The exact handling of incomplete candles must be defined before live
deployment.

### TBD

-   Whether setup evaluation may use the currently forming candle.
-   Whether signals can be generated only after candle close.
-   Tick-gap handling.
-   Missing-candle handling.
-   Reconnection/backfill behavior.

------------------------------------------------------------------------

# 9. Feature Calculation

Each signal evaluation should produce versioned feature values.

## 9.1 Price Action

The feature layer should represent price behavior relevant to:

-   breakout conditions;
-   breakdown conditions;
-   momentum conditions;
-   entry-zone construction.

Exact calculations are TBD.

## 9.2 Relative Volume

Relative volume is a required signal input.

The feature should allow comparison between current volume behavior and
an appropriate historical baseline.

Exact lookback and threshold are TBD.

## 9.3 Trend

Trend alignment is a required signal input.

The strategy must record the trend assessment used when a signal is
generated.

The exact trend methodology is TBD.

## 9.4 Volatility

Volatility is a required signal input and contributes to:

-   target construction;
-   expected movement;
-   confidence;
-   risk/reward evaluation.

The exact volatility measure and lookback are TBD.

## 9.5 Liquidity

Liquidity is a required signal input.

It must contribute to instrument eligibility and/or signal quality.

The exact liquidity metric is TBD.

Do not equate liquidity with broker order-book functionality.

## 9.6 Risk/Reward

The signal engine must evaluate the planned entry, invalidation/stop,
and targets before publishing a signal.

The minimum acceptable risk/reward threshold is TBD.

------------------------------------------------------------------------

# 10. Signal Candidate

A strategy evaluation may produce a candidate when the configured setup
conditions are satisfied.

A candidate must not automatically become an active signal.

Before publication, the engine should validate:

``` text
Instrument eligible
AND
Required market data available
AND
Setup conditions satisfied
AND
Required metrics available
AND
Entry can be constructed
AND
Invalidation/stop can be constructed
AND
Target can be constructed
AND
Risk/reward passes configured rule
```

If a required condition fails, no active signal should be published.

------------------------------------------------------------------------

# 11. Long Setup Contract

A long signal represents a potential bullish setup.

A long signal must contain:

``` text
direction = LONG
symbol
exchange
setup
current price
entry zone
stop/invalidation
target 1
additional targets if available
trailing-exit guidance
confidence
metrics
created_at
expires_at
strategy_version
```

The exact breakout/momentum conditions remain TBD.

------------------------------------------------------------------------

# 12. Short Setup Contract

A short signal represents a potential bearish setup.

A short signal must contain:

``` text
direction = SHORT
symbol
exchange
setup
current price
entry zone
stop/invalidation
target 1
additional targets if available
trailing-exit guidance
confidence
metrics
created_at
expires_at
strategy_version
```

The exact breakdown/momentum conditions remain TBD.

------------------------------------------------------------------------

# 13. Entry Zone

Every active signal must provide an entry zone.

The entry zone must be:

-   stock-specific;
-   derived from the strategy;
-   recorded in the immutable signal plan.

The exact entry-zone construction method is TBD.

The engine must not allow the UI to silently recalculate historical
entry zones.

------------------------------------------------------------------------

# 14. Stop / Invalidation

Every signal must contain a stock-specific invalidation/stop level.

The stop must be visible alongside targets in the UI.

The exact stop methodology is TBD.

The stop must be stored as part of the immutable signal plan.

A later market movement must not rewrite the original stop in the
historical signal record.

------------------------------------------------------------------------

# 15. Target 1

Target 1 uses a default 1% movement from entry.

For a long setup:

``` text
T1 = Entry × 1.01
```

For a short setup:

``` text
T1 = Entry × 0.99
```

The exact handling of an entry zone rather than a single entry price
must be defined during strategy implementation.

------------------------------------------------------------------------

# 16. Additional Targets

Target 2 and later targets are based on momentum and volatility.

The PRD does not define an exact formula.

Therefore:

-   do not invent fixed percentages;
-   do not hardcode arbitrary target multiples;
-   store the target-generation version;
-   preserve the original target values in the signal snapshot.

The exact methodology is TBD.

------------------------------------------------------------------------

# 17. Trailing Exit

Signals may include trailing-exit guidance.

The product does not currently define the exact trailing methodology.

Before production use, define:

-   activation condition;
-   trailing distance;
-   update frequency;
-   interaction with Target 1;
-   interaction with Target 2+;
-   invalidation behavior.

Until defined, the UI should present trailing guidance as a strategy
output rather than implying automatic execution.

------------------------------------------------------------------------

# 18. Signal Confidence

Every active signal requires a transparent confidence score.

The score is an estimate of setup quality.

It must not be represented as:

-   probability of profit;
-   guaranteed outcome;
-   investment advice.

## 18.1 Confidence Inputs

The confidence layer may use the documented strategy inputs:

-   Relative volume
-   Trend alignment
-   Volatility
-   Liquidity
-   Risk/reward
-   Price-action/setup quality

If additional inputs are introduced, they must be documented in a new
strategy version.

## 18.2 Confidence Output

The signal should store:

``` text
confidence_score
confidence_version
confidence_components
```

Example:

``` text
Confidence: 88

Relative volume       Strong
Trend alignment       Strong
Volatility            Acceptable
Liquidity             Strong
Risk/reward           Acceptable
```

The exact scoring formula, weights, normalization, and thresholds are
TBD.

------------------------------------------------------------------------

# 19. Strategy Versioning

Every generated signal must identify the strategy version used to create
it.

Example:

``` text
strategy_version = momentum-v1.0
confidence_version = confidence-v1.0
```

A version must change whenever a material strategy rule changes.

Examples:

-   eligibility threshold changed;
-   breakout definition changed;
-   stop methodology changed;
-   target methodology changed;
-   confidence weighting changed;
-   feature calculation changed.

Historical signals must retain their original version.

Never reinterpret an old signal using the latest strategy version.

------------------------------------------------------------------------

# 20. Signal Lifecycle

The signal lifecycle is:

``` text
Candidate
   ↓
Validated
   ↓
Active
   ├── Entered
   ├── Skipped
   ├── Watched
   ├── Invalidated
   └── Expired
```

The exact state-transition rules must be implemented consistently
between scanner and application.

------------------------------------------------------------------------

# 21. Signal Expiry

Every signal must have:

``` text
created_at
expires_at
```

A signal must expire no later than 30 minutes after creation.

The dashboard must show a countdown.

At expiry:

-   the signal becomes non-actionable;
-   `I entered` must no longer be available;
-   the original plan remains visible for historical analysis;
-   the signal state becomes `Expired`.

Expiry must be deterministic.

------------------------------------------------------------------------

# 22. Signal Invalidation

A signal may become invalid before its normal expiry when the configured
invalidation condition occurs.

The exact invalidation rule is TBD.

If invalidation is implemented, the system must record:

``` text
invalidated_at
invalidation_reason
```

The original signal plan must remain unchanged.

------------------------------------------------------------------------

# 23. Signal Outcome Evaluation

Signal outcomes must be evaluated independently from actual user trades.

Example:

``` text
Signal:
Entry ₹1,450–₹1,454
Stop ₹1,438
T1 ₹1,468
```

The market may later:

``` text
reach T1
reach T2
hit stop
expire without reaching any level
```

The signal outcome belongs to the signal record.

It must not depend on whether the user entered the trade.

------------------------------------------------------------------------

# 24. Signal Outcome Priority

The exact collision rule must be defined for cases where multiple levels
are crossed within the same candle.

Example:

``` text
High >= Target
Low <= Stop
```

If the exact tick sequence is unavailable, the strategy must not falsely
claim which level was reached first.

Required decision:

-   use tick-level ordering where available; or
-   mark the outcome ambiguous; or
-   define a deterministic candle-resolution rule.

This must be resolved before historical performance is treated as
authoritative.

------------------------------------------------------------------------

# 25. Historical Comparable Setups

The product may show historical information about comparable setups.

Comparable setups require a defined methodology.

The methodology must specify:

-   feature set;
-   similarity criteria;
-   lookback period;
-   minimum sample size;
-   market-regime treatment;
-   handling of insufficient samples.

These are TBD.

Do not display statistical estimates from an inadequately sized sample
as authoritative.

------------------------------------------------------------------------

# 26. Outcome-Confidence Layer

Where sufficient historical evidence exists, the system may display:

-   estimated likelihood of Target 1 being reached first;
-   estimated likelihood of Target 2 being reached first;
-   estimated likelihood of stop being reached first;
-   expected movement range over 1--30 minutes;
-   comparable setup count;
-   historical comparable results;
-   setup-quality classification.

These values must be clearly labeled as estimates.

They must not be described as guarantees.

The methodology and minimum sample requirements must be defined before
production use.

------------------------------------------------------------------------

# 27. Position Sizing Calculator

The product may provide a:

**Position Sizing Calculator --- Decision Support**

The calculator must use:

``` text
Configured Risk Budget
+
Entry Price
+
Stop/Invalidation
+
User-defined constraints
```

The risk budget is user-configured.

The strategy specification must not invent a default daily risk limit.

The calculator does not place an order.

It provides decision-support information only.

Exact sizing methodology and constraints are TBD.

------------------------------------------------------------------------

# 28. Trade Journal Boundary

The strategy engine must not depend on the user having executed a trade.

A signal can exist without a trade.

A trade can optionally be linked to a signal.

The relationship is:

``` text
Signal
  │
  └── optional
       ↓
     Trade
```

The application must distinguish:

``` text
Signal Performance
```

from:

``` text
User Trade Performance
```

------------------------------------------------------------------------

# 29. Feed Health Requirements

The scanner must report feed health.

Supported user-facing states:

``` text
SIMULATED
LIVE
DELAYED
STALE
DISCONNECTED
```

The exact timing thresholds for delayed/stale/disconnected states are
TBD.

Feed health must include sufficient timestamps to determine freshness.

Market-data failures must become visible product states.

------------------------------------------------------------------------

# 30. Data Quality Rules

The strategy engine should not publish a signal when required data is
unavailable or invalid.

Examples:

-   missing required candle;
-   invalid price;
-   missing volume;
-   stale feed;
-   incomplete required feature;
-   instrument no longer eligible.

The exact fallback behavior for each condition must be documented before
live deployment.

------------------------------------------------------------------------

# 31. Duplicate Signal Handling

The strategy specification must define whether repeated evaluations of
the same setup create:

-   a new signal;
-   an update to the existing signal;
-   no new signal.

This is currently TBD.

The final implementation must prevent uncontrolled duplicate alerts.

------------------------------------------------------------------------

# 32. Signal Cooldown

A cooldown may be required to prevent repeated signals for the same
instrument/setup.

The following are TBD:

-   cooldown duration;
-   whether cooldown is per symbol;
-   whether cooldown is per setup;
-   whether a new qualifying setup can override cooldown.

Do not invent a cooldown value during implementation.

------------------------------------------------------------------------

# 33. Market-Hours Behavior

The scanner operates during market hours.

The strategy must define:

-   market-open initialization;
-   pre-open behavior;
-   market-close behavior;
-   signal expiry near market close;
-   incomplete candle handling at close;
-   next-session reset behavior.

These operational rules are TBD unless explicitly defined elsewhere.

------------------------------------------------------------------------

# 34. Paper Tracking

Before relying on live signals, the strategy must be validated through
paper tracking.

Paper tracking must measure:

### Signal-level metrics

-   Signals generated
-   Signals expired
-   Signals skipped
-   Signals entered
-   Target 1 reached
-   Target 2 reached
-   Stop reached
-   Ambiguous outcomes
-   Average movement
-   Signal hit rate

### Trade-level metrics

-   Number of journaled trades
-   Gross P&L
-   Estimated charges
-   Net P&L
-   Holding duration
-   Partial exits
-   Actual-vs-plan deviation

Do not combine signal hit rate with user trade P&L.

------------------------------------------------------------------------

# 35. Historical Testing

Historical testing should evaluate the strategy against historical
market data before live reliance.

At minimum, evaluate:

-   signal frequency;
-   signal outcomes;
-   target/stop behavior;
-   confidence distribution;
-   setup distribution;
-   false/ambiguous outcomes;
-   behavior across different market conditions.

The exact dataset, period, and acceptance thresholds are TBD.

------------------------------------------------------------------------

# 36. Strategy Validation Gates

The strategy should not move directly from implementation to live usage.

Required sequence:

``` text
Strategy Definition
      ↓
Historical Testing
      ↓
Simulation
      ↓
Paper Tracking
      ↓
Rule Refinement
      ↓
Feed Validation
      ↓
Live Market Data
```

The PRD explicitly requires paper tracking and historical validation
before relying on live decisions.

------------------------------------------------------------------------

# 37. Required Strategy Metrics

Every signal should preserve enough information to reconstruct why it
was generated.

At minimum:

``` text
symbol
direction
setup
created_at
expires_at
current_price
entry_zone
stop
target_1
target_2+
confidence
strategy_version
confidence_version
feature_values
```

Additional fields may be added when defined by the strategy version.

------------------------------------------------------------------------

# 38. Immutable Signal Snapshot

Once an active signal is published, the following plan values must
remain immutable:

-   Entry zone
-   Stop/invalidation
-   Target 1
-   Target 2+
-   Confidence at creation
-   Strategy version
-   Feature values
-   Creation timestamp
-   Expiry timestamp

Lifecycle fields may change:

``` text
status
entered_at
skipped_at
invalidated_at
expired_at
```

Historical analysis must always use the original signal snapshot.

------------------------------------------------------------------------

# 39. Edge Cases

The implementation must explicitly handle:

### Feed disconnect

Do not generate signals from stale/invalid market data.

### Reconnection

Re-establish data flow and restore valid scanner state without
duplicating signals.

### Missing candles

Do not silently fabricate missing market data.

### Rapid price movement

Preserve the original signal plan.

### Multiple level crossings

Apply the defined outcome-resolution rule.

### Expiry during movement

Respect the signal expiry timestamp.

### Market close

Do not leave a signal incorrectly marked active after its valid window.

### Duplicate candidates

Apply the final deduplication/cooldown rule.

### Insufficient historical sample

Do not display misleading statistical estimates.

------------------------------------------------------------------------

# 40. Observability

The scanner should log:

-   strategy version;
-   instrument;
-   evaluation timestamp;
-   signal creation;
-   signal state transition;
-   feature calculation errors;
-   feed-health changes;
-   data-quality failures;
-   strategy evaluation failures.

Logs must never contain:

-   API secrets;
-   MPIN;
-   TOTP secrets;
-   session tokens.

------------------------------------------------------------------------

# 41. Testing Requirements

## Unit Tests

Test:

-   feature calculations;
-   eligibility rules;
-   breakout/breakdown rules;
-   momentum rules;
-   confidence calculation;
-   entry-zone calculation;
-   stop calculation;
-   target calculation;
-   expiry calculation;
-   outcome calculation.

## Integration Tests

Test:

-   market data → candle aggregation;
-   candle aggregation → strategy evaluation;
-   strategy evaluation → signal persistence;
-   signal persistence → dashboard data.

## Historical Tests

Test:

-   historical signal generation;
-   outcome calculation;
-   duplicate prevention;
-   strategy-version reproducibility.

## State Tests

Test:

``` text
Active
→ Expiring
→ Expired
```

and:

``` text
Active
→ Invalidated
```

and:

``` text
Active
→ Entered
```

without treating `Entered` as broker execution.

------------------------------------------------------------------------

# 42. Strategy Configuration

Strategy parameters should be versioned and centrally configured.

Avoid scattering strategy constants throughout application code.

At minimum, configuration should eventually cover:

``` text
universe eligibility
volume thresholds
trend thresholds
volatility thresholds
liquidity thresholds
risk/reward threshold
target rules
stop rules
expiry
confidence weights
cooldown
```

Parameters marked TBD must remain explicitly configurable until
finalized.

------------------------------------------------------------------------

# 43. Strategy Version Reproducibility

Given:

``` text
market data
+
strategy version
+
configuration version
```

the system should be able to explain how a signal was generated.

A historical signal must never silently change because the current
strategy configuration changed.

------------------------------------------------------------------------

# 44. Live Deployment Constraints

Before live scanner activation:

-   Strategy rules must be finalized.
-   Confidence methodology must be finalized.
-   Eligibility rules must be finalized.
-   Target/stop methodology must be finalized.
-   Historical testing must be completed.
-   Paper tracking must be completed.
-   Feed-health handling must be validated.
-   Signal expiry must be validated.
-   Duplicate handling must be validated.
-   No broker order functionality may be introduced.

------------------------------------------------------------------------

# 45. Open Strategy Decisions

The following decisions remain intentionally unresolved.

## Instrument Eligibility

-   Minimum price
-   Minimum volume
-   Minimum liquidity
-   Maximum spread
-   Tradability thresholds

## Candle Evaluation

-   Closed candle vs forming candle
-   Missing tick handling
-   Reconnection behavior

## Strategy Rules

-   Breakout definition
-   Breakdown definition
-   Momentum definition
-   Confirmation conditions
-   Entry-zone methodology

## Risk

-   Stop methodology
-   Minimum risk/reward
-   Risk-budget methodology
-   Position sizing methodology

## Targets

-   Target 2
-   Further targets
-   Trailing-exit methodology

## Confidence

-   Formula
-   Component weights
-   Normalization
-   Thresholds
-   Confidence categories

## Historical Analysis

-   Comparable-setup definition
-   Lookback
-   Minimum sample
-   Probability methodology
-   Market-regime handling

## Signal Lifecycle

-   Duplicate handling
-   Cooldown
-   Early invalidation
-   Market-close behavior

## Feed Health

-   Delayed threshold
-   Stale threshold
-   Disconnected threshold

------------------------------------------------------------------------

# 46. Definition of Done --- Strategy Foundation

The strategy foundation is complete when:

-   Instrument eligibility is explicitly defined.
-   Required market-data inputs are defined.
-   Candle behavior is defined.
-   Long setup rules are defined.
-   Short setup rules are defined.
-   Entry methodology is defined.
-   Stop methodology is defined.
-   Target methodology is defined.
-   Confidence methodology is defined.
-   Signal expiry is defined.
-   Duplicate handling is defined.
-   Historical outcome rules are defined.
-   Strategy versioning is implemented.
-   Signal snapshots are immutable.
-   Unit tests exist for deterministic strategy functions.
-   Historical tests can reproduce signal generation.

------------------------------------------------------------------------

# 47. Definition of Done --- Live Strategy

The strategy is ready for live market-data use only when:

1.  All required TBD strategy decisions are resolved.
2.  Historical testing has been completed.
3.  Paper tracking has been completed.
4.  Signal outcomes are reproducible.
5.  Feed-health behavior is validated.
6.  Signal expiry is reliable.
7.  Duplicate signals are controlled.
8.  Historical signal snapshots are immutable.
9.  Confidence is explainable.
10. No broker order functionality exists.
11. The system remains market-data-only.
12. The user continues to execute trades manually outside the
    application.

------------------------------------------------------------------------

# 48. Final Strategy Contract

The strategy engine is responsible for:

``` text
Observe
  ↓
Measure
  ↓
Evaluate
  ↓
Generate Potential Setup
  ↓
Construct Signal Plan
  ↓
Score / Explain
  ↓
Persist
  ↓
Expire / Invalidate
  ↓
Measure Outcome
```

It is not responsible for:

``` text
Place Order
Modify Order
Cancel Order
Manage Broker Position
Manage Portfolio
Guarantee Profit
```

The final product relationship is:

``` text
Strategy Engine
      ↓
Potential Signal
      ↓
User Decision
      ↓
Manual Execution Outside App
      ↓
User Journal
      ↓
Historical Analysis
```

This boundary is mandatory.
