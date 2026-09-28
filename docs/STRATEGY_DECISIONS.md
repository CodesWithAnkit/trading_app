# Intraday Stock Tracker --- Strategy Decisions

**Status:** Baseline strategy decisions for implementation\
**Applies to:** Scanner prototype, paper tracking, and initial live
market-data release\
**Related documents:** `PRD.md`, `Architecture.md`, `DESIGN_SYSTEM.md`,
`STRATEGY_SPEC.md`

------------------------------------------------------------------------

## 1. Purpose

This document converts the open strategy questions from
`STRATEGY_SPEC.md` into explicit implementation decisions.

It is the operational decision layer between the product requirements
and the scanner implementation.

The strategy remains a **decision-support and journaling system**. It
does not place, modify, cancel, or automate broker orders.

Where the product requirements already define behavior, this document
preserves that behavior. Where the requirements do not provide a numeric
threshold or exact formula, this document either:

1.  defines a conservative implementation default that can be
    paper-tested and versioned; or
2.  explicitly keeps the value configurable rather than pretending the
    requirement specifies it.

No strategy parameter in this document should be treated as a guarantee
of profitability.

------------------------------------------------------------------------

# 2. Non-Negotiable Product Boundaries

These decisions are fixed unless the PRD and architecture are
intentionally changed.

### 2.1 Instrument scope

The first release supports:

-   NSE cash-equity stocks.
-   Eligible and liquid instruments only.
-   Long and short directional setups.
-   Intraday observation windows of approximately 1--30 minutes.

The first release does **not** support:

-   Options.
-   Futures.
-   Index instruments.
-   NIFTY/BANKNIFTY as tradable instruments.
-   Broker order placement.
-   Broker order modification/cancellation.
-   Broker order-status management.
-   Funds, holdings, portfolio, or broker-position APIs.
-   Automatic trade execution.

### 2.2 Operational flow

The intended flow is:

``` text
Observe
  ↓
Evaluate
  ↓
Plan
  ↓
Decide
  ↓
Manually execute outside the application
  ↓
Journal
  ↓
Analyze
```

The application is never the execution venue.

### 2.3 Signal lifetime

Every signal must have:

-   `created_at`
-   `expires_at`
-   immutable planned levels
-   rule/strategy version
-   input snapshot
-   lifecycle state

A signal must become non-actionable no later than **30 minutes after
creation**.

------------------------------------------------------------------------

# 3. Strategy Versioning

Every generated signal must reference a versioned strategy
configuration.

Recommended identifier:

``` text
intraday-momentum-v1
```

A strategy version must capture:

-   setup family
-   timeframe configuration
-   eligibility rules
-   feature definitions
-   confidence weights
-   entry logic
-   stop logic
-   target logic
-   trailing logic
-   duplicate/cooldown rules
-   market-session rules
-   parameter values
-   effective timestamp

Example:

``` json
{
  "strategy_version": "intraday-momentum-v1",
  "configuration_version": 1,
  "effective_from": "2026-09-28T00:00:00+05:30"
}
```

A later change must create a new strategy version. Existing signals must
not be silently recalculated under the new rules.

------------------------------------------------------------------------

# 4. Market Data Decisions

## 4.1 Primary timeframes

The scanner will use:

-   **1-minute candles** for short-term execution context and signal
    timing.
-   **5-minute candles** for setup structure, breakout/breakdown
    context, and trend alignment.

The scanner may consume live ticks to construct these candles, but the
strategy should not depend on an undocumented tick-level condition.

## 4.2 Candle completeness

A completed candle is preferred for rule confirmation.

The scanner may use the current forming candle for live monitoring, but
a signal must record whether each relevant feature was calculated from:

-   completed candle data, or
-   current/incomplete candle data.

This distinction must be preserved in the signal snapshot.

## 4.3 Feed quality gate

The strategy must not create a normal live signal when required market
data is:

-   disconnected;
-   stale beyond the configured freshness threshold;
-   missing required candles;
-   internally inconsistent;
-   or explicitly simulated.

The UI must distinguish:

-   `Live`
-   `Delayed`
-   `Disconnected`
-   `Simulated`

A simulated signal must never be presented as live broker-market data.

------------------------------------------------------------------------

# 5. Instrument Eligibility Decisions

The PRD requires eligible, liquid NSE cash-equity stocks and exclusion
of illiquid, suspended, cautionary, or unsuitable instruments.

It does **not** prescribe exact numeric thresholds.

Therefore the implementation will use a configurable eligibility profile
rather than hardcoding undocumented values into strategy logic.

## 5.1 Eligibility gates

An instrument must pass all applicable gates before strategy evaluation:

1.  NSE cash-equity instrument.
2.  Active/tradable status according to the maintained universe
    metadata.
3.  Not suspended.
4.  Not explicitly excluded by the maintained cautionary/unsuitable
    list.
5.  Minimum price threshold.
6.  Minimum recent traded-volume threshold.
7.  Minimum recent traded-value threshold.
8.  Acceptable intraday liquidity.
9.  Sufficient 1-minute and 5-minute historical data.
10. No active data-quality failure.

## 5.2 Numeric thresholds

The following values remain **configuration**, not universal strategy
constants:

``` text
MIN_PRICE
MIN_AVG_1M_VOLUME
MIN_AVG_5M_VOLUME
MIN_AVG_TRADED_VALUE
MAX_ALLOWED_SPREAD
MIN_REQUIRED_CANDLE_COUNT
```

The initial values must be selected from the actual Angel One/NSE data
characteristics during scanner calibration.

They must be stored in the strategy configuration and included in the
signal snapshot.

Do not invent a fixed threshold merely to make the implementation look
complete.

------------------------------------------------------------------------

# 6. Supported Setup Families

Version 1 supports two primary setup families.

## 6.1 Bullish breakout / momentum

A candidate long setup should require evidence of:

-   upward price structure;
-   a meaningful recent range or resistance area;
-   breakout/acceptance above that area;
-   relative volume support;
-   compatible trend alignment;
-   acceptable volatility;
-   acceptable liquidity;
-   viable risk/reward.

The signal should not be created solely because price moved upward.

## 6.2 Bearish breakdown / momentum

A candidate short setup should require the mirrored evidence:

-   downward price structure;
-   a meaningful recent range or support area;
-   breakdown/acceptance below that area;
-   relative volume support;
-   compatible trend alignment;
-   acceptable volatility;
-   acceptable liquidity;
-   viable risk/reward.

The signal should not be created solely because price moved downward.

------------------------------------------------------------------------

# 7. Breakout / Breakdown Confirmation

The exact numerical breakout threshold is not defined by the PRD, so the
baseline decision is to use **range-level confirmation plus momentum
confirmation**, not a single arbitrary percentage.

## 7.1 Long confirmation

A long candidate requires:

``` text
price moves above identified resistance/range high
AND
the move is supported by current/recent volume behavior
AND
trend alignment is not contradictory
AND
the resulting stop/target structure passes risk/reward validation
```

## 7.2 Short confirmation

A short candidate requires:

``` text
price moves below identified support/range low
AND
the move is supported by current/recent volume behavior
AND
trend alignment is not contradictory
AND
the resulting stop/target structure passes risk/reward validation
```

## 7.3 False-breakout protection

A candidate should be rejected or downgraded when the price only briefly
crosses the level and immediately returns inside the prior range.

The implementation should therefore distinguish:

-   `breakout_confirmed`
-   `breakout_failed`
-   `breakdown_confirmed`
-   `breakdown_failed`

The exact confirmation window is configurable and must be included in
the strategy version.

------------------------------------------------------------------------

# 8. Relative Volume Decision

Relative volume is a required strategy component.

Baseline definition:

``` text
RVOL = current comparable-period volume
       / historical average volume for the same comparable period
```

The comparison must be time-of-day aware where sufficient historical
data exists.

Example:

``` text
current 5-minute volume
/
historical median 5-minute volume for the corresponding market-time bucket
```

The implementation should prefer a robust historical baseline such as a
median rather than allowing one unusually large historical observation
to dominate the denominator.

The exact lookback period and minimum RVOL threshold remain
configuration values.

Required stored fields:

``` text
rvol_value
rvol_baseline
rvol_lookback
rvol_time_bucket
```

------------------------------------------------------------------------

# 9. Trend Alignment Decision

Trend alignment is a confirmation component, not an independent signal
generator.

Baseline trend assessment should use the relationship and direction of
the 1-minute and 5-minute price structures.

The strategy must distinguish:

-   aligned bullish;
-   aligned bearish;
-   mixed/neutral;
-   contradictory.

A long signal should not receive a positive trend contribution when the
higher-timeframe context is clearly contradictory.

A short signal follows the mirrored rule.

The implementation should store the actual inputs used to determine
alignment rather than only storing `trend_score`.

------------------------------------------------------------------------

# 10. Volatility Decision

Volatility is used for:

-   determining whether a setup has enough movement potential;
-   selecting sensible target distances;
-   avoiding excessively unstable conditions;
-   evaluating risk/reward.

The first implementation should use a documented volatility measure
derived from the available candle data.

The exact lookback and formula are configuration decisions.

Required snapshot fields:

``` text
volatility_measure
volatility_lookback
volatility_regime
```

Suggested regimes:

``` text
low
normal
high
extreme
```

`extreme` conditions may block new signals if the configured risk/reward
and stop structure become unreliable.

------------------------------------------------------------------------

# 11. Liquidity Decision

Liquidity is a required component of the PRD.

Liquidity should be evaluated using observable market-data properties
available to the scanner, such as:

-   recent traded volume;
-   recent traded value;
-   continuity of prints/candles;
-   spread where reliable spread data is available.

Do not use the term `Depth` as a confidence component unless a
separately documented market-depth data source and strategy rule are
added.

The baseline component name is:

``` text
Liquidity
```

not:

``` text
Depth
```

------------------------------------------------------------------------

# 12. Risk/Reward Decision

A candidate signal must produce a valid relationship between:

-   entry zone;
-   invalidation/stop;
-   Target 1;
-   further targets where applicable.

The scanner must reject a candidate when the planned structure is
internally invalid.

Examples:

### Long

``` text
stop < entry < target
```

### Short

``` text
target < entry < stop
```

The strategy must calculate risk from the proposed entry to the
invalidation level.

The confidence score may include risk/reward quality, but risk/reward
must also be a hard validation gate where the plan is not usable.

------------------------------------------------------------------------

# 13. Entry Zone Decision

Signals use an **entry zone**, not a single execution price.

The zone should be derived from the confirmed setup level and current
market context.

The signal must record:

``` text
entry_low
entry_high
reference_entry
```

`reference_entry` is used for deterministic target calculation.

The UI should make clear that the displayed plan is not an execution
instruction and that actual manual execution may differ.

If the market has already moved materially beyond the valid entry zone
before signal publication, the candidate should be rejected as late
rather than generating a stale-looking opportunity.

------------------------------------------------------------------------

# 14. Stop / Invalidation Decision

The stop is a **stock-specific invalidation level**, not a fixed
percentage applied to every stock.

For a long setup, invalidation should be tied to the structure that
makes the bullish thesis no longer valid.

For a short setup, invalidation should be tied to the structure that
makes the bearish thesis no longer valid.

The stop may therefore reflect:

-   broken range structure;
-   recent swing structure;
-   setup invalidation level;
-   volatility-adjusted distance where appropriate.

The exact implementation formula must be versioned.

A candidate must be rejected if the resulting stop is so close that
normal market noise makes the plan structurally invalid, or so far away
that the resulting risk/reward no longer passes the configured minimum.

------------------------------------------------------------------------

# 15. Target 1 Decision

The PRD explicitly defines Target 1 as:

> a 1% move from entry by default.

Therefore Target 1 is fixed by default as:

### Long

``` text
T1 = reference_entry × 1.01
```

### Short

``` text
T1 = reference_entry × 0.99
```

The word **default** matters.

The system should allow a future strategy version to change the T1
methodology, but `intraday-momentum-v1` uses the PRD-defined 1% default.

Example:

``` text
Reference entry = ₹20.00

Long T1 = ₹20.20
Short T1 = ₹19.80
```

The displayed price should use the instrument's valid price
precision/tick rules.

------------------------------------------------------------------------

# 16. Target 2 and Later Targets

Target 2 and later targets are **not** fixed at another arbitrary
percentage.

They should be derived from the setup's:

-   momentum;
-   volatility;
-   structure;
-   available movement range;
-   risk/reward.

The implementation must avoid creating targets that are mechanically
farther away without evidence that the market structure supports them.

Each target must pass:

``` text
directional ordering
+
valid price precision
+
plan consistency
+
available movement/range validation
```

If the strategy cannot produce a meaningful Target 2, it may produce
only Target 1 plus trailing guidance.

------------------------------------------------------------------------

# 17. Trailing Exit Decision

Trailing logic is part of the signal plan but is not broker automation.

The scanner only records guidance.

Baseline behavior:

1.  Initial invalidation remains the original stop.
2.  Once meaningful progress is made, the plan may define a tighter
    trailing level.
3.  Trailing levels must move only in the direction that reduces risk or
    protects progress.
4.  A trailing level must never loosen the original invalidation.
5.  The journal records what the user actually did separately from the
    plan.

Example conceptual lifecycle:

``` text
Initial stop
    ↓
T1 reached / meaningful progress
    ↓
protective trailing level
    ↓
further momentum
    ↓
higher/lower trailing level
```

The exact trailing trigger and distance remain strategy configuration
and must be versioned.

------------------------------------------------------------------------

# 18. Confidence Score Decision

Confidence is an **explainable setup-quality score**, not a probability
of profit.

The score must never be presented as:

-   guaranteed success;
-   expected profit;
-   broker recommendation;
-   certainty.

The UI may show a numeric score and a quality label.

Recommended interpretation:

``` text
0–49   = Low
50–69  = Medium
70–100 = High
```

These labels describe internal setup quality, not investment outcomes.

## 18.1 Confidence components

The initial score should be composed from the PRD-supported factors:

  -----------------------------------------------------------------------
  Component                           Purpose
  ----------------------------------- -----------------------------------
  Price action / setup quality        Measures structural quality of the
                                      breakout/breakdown

  Relative volume                     Measures participation relative to
                                      historical baseline

  Trend alignment                     Measures directional agreement
                                      across timeframes

  Volatility                          Measures movement regime and target
                                      feasibility

  Liquidity                           Measures intraday tradability

  Risk/reward                         Measures quality of the proposed
                                      plan
  -----------------------------------------------------------------------

No undocumented `Depth` component should be used.

## 18.2 Score architecture

The initial implementation should use a weighted component model:

``` text
confidence_score =
    setup_quality_component
  + relative_volume_component
  + trend_component
  + volatility_component
  + liquidity_component
  + risk_reward_component
```

Each component is normalized to a common scale before weighting.

The exact weights are **strategy configuration**, not product
requirements.

Recommended implementation rule:

-   keep all six components visible;
-   keep weights versioned;
-   store raw values and normalized component scores;
-   store the final score;
-   store the quality band.

Do not hide the score behind an opaque ML model in version 1.

------------------------------------------------------------------------

# 19. Confidence vs Historical Outcome Estimates

These are separate concepts.

### Confidence

Answers:

> How strong is the current setup according to the current rule system?

### Historical outcome estimate

Answers:

> What happened to comparable historical setups?

The application must never collapse these into a single "probability"
number.

Historical estimates require sufficient comparable samples and must show
the sample count.

If the sample is insufficient, show:

``` text
Insufficient historical sample
```

rather than inventing a percentage.

------------------------------------------------------------------------

# 20. Comparable Setup Definition

Historical comparisons should match the important strategy dimensions.

At minimum, comparable setups should consider:

-   strategy version;
-   setup family;
-   direction;
-   volatility regime;
-   relative-volume regime;
-   trend-alignment state;
-   liquidity regime;
-   similar entry/risk structure.

The comparison logic itself must be versioned.

Historical results from a materially different strategy version must not
silently appear as if they were produced by the current strategy.

------------------------------------------------------------------------

# 21. Historical Outcome Measurement

For each signal, historical evaluation should measure:

-   Target 1 reached first;
-   Target 2 reached first;
-   stop/invalidation reached first;
-   neither reached within the evaluation horizon;
-   ambiguous outcome.

The evaluation horizon must remain bounded by the product's intraday
objective.

The system must preserve the difference between:

``` text
signal outcome
```

and:

``` text
actual journaled trade outcome
```

A successful signal does not imply a successful user trade.

A user trade can also differ from the signal because of:

-   different entry price;
-   delayed manual execution;
-   partial exits;
-   early discretionary exit;
-   missed signal;
-   execution outside the entry zone.

------------------------------------------------------------------------

# 22. Ambiguous Historical Outcomes

A single candle can cross both a stop and target depending on the
unknown intrabar sequence.

The system must not pretend to know which happened first when the source
data cannot establish it.

Baseline policy:

``` text
If ordering cannot be determined reliably:
    classify as AMBIGUOUS
```

Do not randomly select stop or target.

Ambiguous observations may be excluded from first-touch probability
calculations, but the excluded count must be visible in analysis.

------------------------------------------------------------------------

# 23. Signal Lifecycle Decisions

Use the following lifecycle:

``` text
CANDIDATE
   ↓
ACTIVE
   ├──→ INVALIDATED
   ├──→ EXPIRED
   ├──→ SKIPPED
   └──→ ENTERED
              ↓
          JOURNALED TRADE
```

A signal becomes `ACTIVE` only after all required gates pass.

## 23.1 Expiry

Expiry is deterministic:

``` text
expires_at = created_at + configured_signal_lifetime
```

The configured lifetime must be:

``` text
<= 30 minutes
```

The initial configuration should use the full permitted window only if
paper validation supports it; otherwise a shorter lifetime may be
introduced in a new configuration version.

## 23.2 Invalidation

A signal should be invalidated before expiry when the setup thesis is no
longer valid.

Examples:

-   breakout fails and returns into the invalidation structure;
-   breakdown fails and returns above the invalidation structure;
-   market data becomes unusable;
-   required plan inputs become invalid;
-   instrument becomes ineligible.

Invalidation must be recorded as a state transition, not as silent
deletion.

------------------------------------------------------------------------

# 24. Duplicate Signal Decision

The scanner must not create repeated identical alerts every time the
same condition is evaluated.

Baseline deduplication key:

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

A new signal should be suppressed while an equivalent active signal
exists.

After an equivalent signal expires or is invalidated, a configurable
cooldown applies before another alert for the same setup can be emitted.

The cooldown value remains configuration and must be versioned.

A materially new setup can create a new signal when its setup reference
has changed sufficiently according to the strategy configuration.

------------------------------------------------------------------------

# 25. Ranking Decision

Active alerts may be ranked by setup quality, as required by FR-01.

Ranking order:

1.  confidence score;
2.  risk/reward quality;
3.  freshness/time remaining;
4.  deterministic symbol ordering as the final tie-breaker.

The ranking is only a display ordering.

It must not change the underlying signal data or imply a guarantee.

Long and short signals should remain separately filterable.

------------------------------------------------------------------------

# 26. Market Session Decision

The scanner evaluates signals only during the configured NSE cash-equity
market session.

The session schedule must be configuration rather than hardcoded
throughout the codebase.

Outside the configured market session:

-   no normal live signals are generated;
-   existing active signals are closed/expired according to the
    lifecycle policy;
-   feed-health state remains visible;
-   historical/simulated evaluation can continue in a separate
    environment.

The exact exchange-calendar implementation should support market
holidays rather than assuming every weekday is a trading day.

------------------------------------------------------------------------

# 27. Risk Budget and Position Sizing Decision

The position-sizing calculator is **decision support only**.

It must not place an order or transmit an order quantity to Angel One.

The calculator should support:

``` text
Configured risk budget
÷
risk per share
=
suggested quantity
```

For long and short plans:

``` text
risk per share = absolute(reference_entry - stop)
```

The result must be constrained by configurable limits such as:

-   maximum quantity;
-   maximum notional exposure;
-   maximum daily risk budget;
-   maximum concurrent journaled trades, if configured.

These values are user configuration and are not hardcoded to a value
such as ₹12,000.

The calculator must clearly display:

``` text
Decision support only
```

------------------------------------------------------------------------

# 28. Daily Risk Limits

The PRD identifies daily risk limits as an open product decision.

For the initial implementation:

-   make risk limits configurable;
-   do not silently enforce a universal rupee amount;
-   allow the user to disable a limit only if the UI clearly
    communicates the state;
-   record the configuration used when a sizing calculation is
    performed.

A future risk-limit policy may include:

``` text
daily risk budget
maximum simultaneous journaled trades
maximum alerts per symbol
maximum new entries after daily loss threshold
```

These are product controls, not claims that a particular limit is
optimal.

------------------------------------------------------------------------

# 29. Partial Exit Decision

The product supports partial exits.

The initial journal should allow the user to choose the actual
quantities exited rather than forcing a fixed allocation.

For strategy guidance, a future configuration may define suggested
allocations across:

``` text
Target 1
Target 2
Trailing exit
```

Until that allocation is validated through paper tracking, the system
should not present one allocation as the required behavior.

------------------------------------------------------------------------

# 30. Charge Estimation Decision

Journal P&L must distinguish:

``` text
Gross P&L
Estimated charges
Net P&L
```

Charge estimates are configurable user settings.

The scanner strategy does not use charge estimates to generate a signal.

The journal calculation service, not the client, is responsible for
authoritative P&L calculations.

------------------------------------------------------------------------

# 31. Paper Tracking Decision

Before enabling live strategy use, every strategy version must pass a
paper-tracking period.

Paper tracking records:

-   every generated signal;
-   signals skipped due to eligibility;
-   active/expired/invalidated signals;
-   planned entry;
-   stop;
-   T1;
-   later targets;
-   trailing guidance;
-   confidence components;
-   market/feed state;
-   theoretical outcome;
-   ambiguous outcomes;
-   timestamped strategy version.

Paper tracking must not require the user to execute a real trade.

------------------------------------------------------------------------

# 32. Historical Testing Decision

Historical testing is required before relying on the strategy for live
decisions.

Tests should cover:

-   bullish breakout;
-   bearish breakdown;
-   strong-volume cases;
-   weak-volume cases;
-   aligned and conflicting trend states;
-   different volatility regimes;
-   different liquidity conditions;
-   late entries;
-   failed breakouts/breakdowns;
-   stop-first outcomes;
-   target-first outcomes;
-   ambiguous candle outcomes;
-   signal expiry;
-   duplicate suppression.

The test harness must use the same strategy functions used by the
scanner where practical.

Avoid maintaining one "backtest implementation" and a different "live
implementation" of the strategy logic.

------------------------------------------------------------------------

# 33. Validation Gates

A strategy version must pass all of the following before live
activation:

### Gate 1 --- Data correctness

-   Candle construction is correct.
-   Timestamps are correct and consistently represented in IST where
    displayed.
-   Missing/stale data is detected.
-   Historical and live inputs use the same definitions.

### Gate 2 --- Rule correctness

-   Long and short rules are mirrored correctly.
-   Entry/stop/target ordering is valid.
-   Signal expiry is deterministic.
-   Invalidation is deterministic.
-   Duplicate suppression works.

### Gate 3 --- Reproducibility

Given the same:

``` text
strategy version
+
input snapshot
+
timestamp
```

the same signal decision should be reproducible.

### Gate 4 --- Paper tracking

The strategy is observed over a meaningful sample before live use.

No single-day result should be treated as sufficient evidence.

### Gate 5 --- Operational safety

-   No broker order endpoints exist.
-   No broker secrets reach the browser.
-   Feed-health failures are visible.
-   Signal state transitions are audited.
-   Strategy versions are immutable.

------------------------------------------------------------------------

# 34. Signal Snapshot Contract

Every signal must persist enough information to reproduce why it
existed.

Minimum snapshot:

``` json
{
  "strategy_version": "intraday-momentum-v1",
  "instrument": {},
  "direction": "LONG",
  "setup_family": "BREAKOUT_MOMENTUM",
  "created_at": "",
  "expires_at": "",
  "market_state": "LIVE",
  "reference_entry": 0,
  "entry_zone": {
    "low": 0,
    "high": 0
  },
  "stop": 0,
  "targets": {
    "t1": 0,
    "t2": null
  },
  "trailing": {},
  "features": {
    "price_action": {},
    "relative_volume": {},
    "trend": {},
    "volatility": {},
    "liquidity": {},
    "risk_reward": {}
  },
  "confidence": {
    "score": 0,
    "components": {},
    "quality": "MEDIUM"
  },
  "eligibility_snapshot": {},
  "configuration": {},
  "rule_inputs": {}
}
```

The actual schema can be normalized across `signals`, `signal_metrics`,
and `planned_levels`, but the information must remain recoverable.

------------------------------------------------------------------------

# 35. UI Interpretation Rules

The UI must preserve these distinctions:

  -----------------------------------------------------------------------
  Concept                             UI meaning
  ----------------------------------- -----------------------------------
  Confidence                          Current rule-based setup quality

  Historical outcome estimate         Historical evidence for comparable
                                      setups

  Entry zone                          Planned observation/execution area

  Actual entry                        User-journaled manual trade

  Stop                                Planned invalidation

  Actual exit                         User-journaled result

  Signal expiry                       The plan is no longer actionable

  Paper result                        Theoretical signal outcome

  Trade result                        Actual journaled outcome
  -----------------------------------------------------------------------

Never label confidence as:

``` text
Win probability
```

unless a separate, validated statistical model is explicitly introduced.

------------------------------------------------------------------------

# 36. Observability Decisions

The scanner must log structured events for:

-   universe refresh;
-   instrument eligibility rejection;
-   candidate creation;
-   candidate rejection reason;
-   signal creation;
-   signal invalidation;
-   signal expiry;
-   duplicate suppression;
-   feed disconnect;
-   feed recovery;
-   strategy configuration load;
-   strategy version changes;
-   data-quality failures.

Each event should include:

``` text
timestamp
instrument
strategy_version
event_type
reason
correlation_id
```

Do not log broker secrets, authentication tokens, or sensitive
credentials.

------------------------------------------------------------------------

# 37. Failure Handling

The scanner should fail closed for signal generation when critical
inputs are unavailable.

Examples:

``` text
No 5-minute history
→ no normal signal

Stale feed
→ no normal signal

Invalid price
→ no signal

Missing volume
→ no confidence calculation / no signal

Invalid stop-target relationship
→ reject candidate

Unknown instrument status
→ reject candidate
```

The goal is to avoid presenting an apparently precise signal from
incomplete data.

------------------------------------------------------------------------

# 38. What Is Explicitly NOT Decided Yet

The following values should remain configurable until they are
calibrated with actual data:

-   minimum stock price;
-   minimum volume;
-   minimum traded value;
-   maximum spread;
-   exact breakout confirmation window;
-   RVOL lookback;
-   minimum RVOL;
-   trend indicator parameters;
-   volatility formula/lookback;
-   extreme-volatility threshold;
-   minimum risk/reward;
-   stop-distance formula parameters;
-   Target 2 formula parameters;
-   trailing trigger;
-   trailing distance;
-   confidence component weights;
-   signal cooldown;
-   maximum concurrent alerts;
-   daily risk-budget amount;
-   maximum notional exposure;
-   partial-exit suggested allocation.

These are intentionally not invented as "facts" because the source
documents do not specify them.

They should be selected through:

``` text
data inspection
→ simulated testing
→ historical testing
→ paper tracking
→ review
→ strategy version
```

------------------------------------------------------------------------

# 39. Implementation Order

Implement the strategy in this order:

### Phase A --- Pure calculations

1.  Candle aggregation.
2.  Feature calculation.
3.  Instrument eligibility.
4.  Breakout/breakdown detection.
5.  Entry-zone calculation.
6.  Stop/invalidation calculation.
7.  Target calculation.
8.  Confidence components.
9.  Confidence aggregation.

### Phase B --- Signal engine

10. Candidate validation.
11. Signal creation.
12. Duplicate suppression.
13. Expiry.
14. Invalidation.
15. State transitions.
16. Immutable snapshots.

### Phase C --- Evaluation

17. Historical outcome evaluator.
18. Comparable-setup evaluator.
19. Paper-tracking recorder.
20. Strategy performance views.

### Phase D --- Live data

21. Angel One market-data connection.
22. Feed-health monitoring.
23. Live scanner worker.
24. Supabase persistence.
25. Dashboard real-time updates.

Do not start with live Angel One scanning before the pure strategy
functions and simulated/historical evaluation are working.

------------------------------------------------------------------------

# 40. Definition of Done

`intraday-momentum-v1` is ready for paper tracking when:

-   [ ] eligible universe filtering works;
-   [ ] long breakout detection works;
-   [ ] short breakdown detection works;
-   [ ] relative volume is calculated and stored;
-   [ ] trend alignment is calculated and stored;
-   [ ] volatility is calculated and stored;
-   [ ] liquidity is calculated and stored;
-   [ ] risk/reward is validated;
-   [ ] entry zone is deterministic;
-   [ ] stock-specific invalidation is deterministic;
-   [ ] T1 follows the 1% PRD default;
-   [ ] T2 is structure/volatility based;
-   [ ] trailing guidance is versioned;
-   [ ] confidence score is explainable;
-   [ ] all confidence components are persisted;
-   [ ] signal expiry is deterministic and \<=30 minutes;
-   [ ] invalidation is deterministic;
-   [ ] duplicate suppression works;
-   [ ] strategy version is persisted;
-   [ ] signal input snapshot is immutable;
-   [ ] historical outcomes can be evaluated;
-   [ ] ambiguous outcomes are handled explicitly;
-   [ ] paper tracking can run without broker order access.

------------------------------------------------------------------------

# 41. Final Strategy Contract

The initial strategy contract is:

``` text
Eligible NSE cash-equity stock
        ↓
Liquidity / data-quality gates
        ↓
5-minute structure + 1-minute context
        ↓
Bullish breakout OR bearish breakdown
        ↓
Relative-volume confirmation
        ↓
Trend alignment
        ↓
Volatility validation
        ↓
Risk/reward validation
        ↓
Entry zone
        ↓
Stock-specific invalidation / stop
        ↓
T1 = 1% from reference entry by default
        ↓
T2+ from momentum / volatility / structure
        ↓
Trailing guidance
        ↓
Explainable confidence score
        ↓
Immutable signal snapshot
        ↓
Active for <= 30 minutes
        ↓
Expired / invalidated / skipped / entered
        ↓
Historical or journaled outcome
```

The strategy is considered **implemented** only when the scanner can
produce this contract reproducibly from a versioned configuration and
persist the inputs required to explain the result.

The strategy is considered **validated** only after historical testing
and paper tracking have been completed.

The strategy is considered **live-ready** only after validation gates
pass and the live worker remains strictly market-data-only.
