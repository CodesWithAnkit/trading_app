# Intraday Stock Tracker --- Strategy Configuration

**Status:** Configuration contract for `intraday-momentum-v1`\
**Applies to:** Scanner prototype, historical testing, paper tracking,
and initial live market-data release\
**Related documents:** `PRD.md`, `Architecture.md`, `STRATEGY_SPEC.md`,
`STRATEGY_DECISIONS.md`

------------------------------------------------------------------------

## 1. Purpose

`STRATEGY_CONFIG.md` defines the concrete configuration contract
consumed by the strategy engine.

It answers:

> Which parameters does `intraday-momentum-v1` need, what do they mean,
> what is already fixed by the product requirements, and which values
> must be calibrated before activation?

This document is intentionally separate from strategy implementation
code.

The configuration must be:

-   versioned;
-   validated at startup;
-   immutable for a running strategy version;
-   persisted with each generated signal;
-   reproducible in historical testing;
-   safe to change only by creating a new strategy
    configuration/version.

This document does **not** claim that any configurable value is optimal
or profitable.

------------------------------------------------------------------------

# 2. Configuration Principles

## 2.1 No hidden strategy constants

Strategy behavior must not depend on unexplained numeric constants
scattered throughout code.

All strategy-affecting parameters belong in the configuration.

Bad:

``` ts
if (rvol > 1.5) {
  ...
}
```

Good:

``` ts
if (rvol > config.volume.minRvol) {
  ...
}
```

## 2.2 Configuration is part of the strategy version

Changing any parameter that can change a signal decision requires a new
configuration/strategy version.

Examples:

-   RVOL threshold;
-   breakout confirmation window;
-   confidence weights;
-   stop formula;
-   T2 methodology;
-   signal lifetime;
-   duplicate cooldown;
-   market-session configuration.

Do not update these values in place for an already-running version.

## 2.3 PRD-defined values vs calibration values

Each parameter below is classified as one of:

  -----------------------------------------------------------------------
  Status                              Meaning
  ----------------------------------- -----------------------------------
  `FIXED`                             Directly determined by the PRD or
                                      architecture

  `DEFAULT`                           Initial product/strategy default
                                      that may be changed by a future
                                      version

  `CALIBRATE`                         Must be selected using
                                      historical/simulated/paper testing

  `CONFIGURABLE`                      User/system configuration rather
                                      than a universal strategy constant

  `DERIVED`                           Calculated from other configured
                                      inputs

  `TBD`                               Source documents do not provide
                                      enough information yet
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Version Identity

``` yaml
strategy:
  id: intraday-momentum
  version: v1
  strategy_version: intraday-momentum-v1
  configuration_version: 1
  status: paper
  effective_from: null
```

### Rules

-   `strategy_version` is persisted on every signal.
-   `configuration_version` identifies the exact parameter set.
-   `status` should progress through:

``` text
draft
→ simulated
→ paper
→ live
→ retired
```

-   A retired strategy version remains available for historical
    reproduction.

------------------------------------------------------------------------

# 4. Market Scope

``` yaml
market:
  exchange: NSE
  segment: CASH_EQUITY
  timezone: Asia/Kolkata
  currency: INR
  supported_directions:
    - LONG
    - SHORT
```

### Fixed boundaries

The first release does not include:

``` text
OPTIONS
FUTURES
INDEX
NIFTY
BANKNIFTY
BROKER_ORDERS
FUNDS
HOLDINGS
PORTFOLIO
BROKER_POSITIONS
```

------------------------------------------------------------------------

# 5. Candle Configuration

``` yaml
candles:
  primary:
    - 1m
    - 5m

  signal_context:
    setup_timeframe: 5m
    execution_context: 1m

  use_completed_candles_for_confirmation: true
  allow_forming_candle_for_monitoring: true

  required_history:
    one_minute: null
    five_minute: null
```

## Parameter definitions

  ------------------------------------------------------------------------------------------
  Parameter                                  Status                  Description
  ------------------------------------------ ----------------------- -----------------------
  `setup_timeframe`                          `FIXED`                 5-minute setup
                                                                     structure

  `execution_context`                        `FIXED`                 1-minute short-term
                                                                     context

  `use_completed_candles_for_confirmation`   `DEFAULT`               Prevents unstable
                                                                     confirmation from
                                                                     forming candles

  `allow_forming_candle_for_monitoring`      `DEFAULT`               Allows live monitoring
                                                                     without using it as an
                                                                     undocumented trigger

  `required_history.*`                       `CALIBRATE`             Minimum historical
                                                                     candle availability
  ------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 6. Feed Health Configuration

``` yaml
feed:
  max_data_age_seconds: null
  required_tick_continuity: true
  reject_on_missing_candle: true
  reject_on_invalid_price: true
  reject_on_invalid_volume: true
  allow_signal_when_simulated: false
```

## Required behavior

A normal live signal must not be created when:

-   the feed is disconnected;
-   required data is stale;
-   required candles are missing;
-   price/volume data is invalid;
-   the environment is simulated.

`max_data_age_seconds` is intentionally `CALIBRATE`.

It must be selected from actual feed behavior rather than invented here.

------------------------------------------------------------------------

# 7. Instrument Eligibility

``` yaml
eligibility:
  instrument_type: NSE_CASH_EQUITY

  require_active_status: true
  exclude_suspended: true
  exclude_cautionary: true
  exclude_unsuitable: true

  min_price: null

  min_avg_1m_volume: null
  min_avg_5m_volume: null
  min_avg_traded_value: null

  max_allowed_spread_bps: null

  min_required_1m_candles: null
  min_required_5m_candles: null
```

## Parameter classification

  Parameter                   Status
  --------------------------- -------------
  Instrument type             `FIXED`
  Active status requirement   `FIXED`
  Suspended exclusion         `FIXED`
  Cautionary exclusion        `FIXED`
  Unsuitable exclusion        `FIXED`
  Minimum price               `CALIBRATE`
  Average volume thresholds   `CALIBRATE`
  Traded-value threshold      `CALIBRATE`
  Spread threshold            `CALIBRATE`
  Required history            `CALIBRATE`

Do not populate these with arbitrary values merely to make the
configuration appear complete.

------------------------------------------------------------------------

# 8. Setup Families

``` yaml
setups:
  enabled:
    - BREAKOUT_MOMENTUM
    - BREAKDOWN_MOMENTUM

  breakout:
    enabled: true

  breakdown:
    enabled: true
```

### Long

``` text
BREAKOUT_MOMENTUM
```

### Short

``` text
BREAKDOWN_MOMENTUM
```

The two setup families should use mirrored directional logic.

------------------------------------------------------------------------

# 9. Range / Structure Detection

The strategy requires a meaningful recent range or support/resistance
structure.

``` yaml
structure:
  lookback_1m: null
  lookback_5m: null

  reference_method: null

  minimum_structure_quality: null

  allow_extended_range: false
```

These values are `CALIBRATE` / `TBD`.

The implementation must document exactly how:

``` text
range_high
range_low
support
resistance
setup_reference_level
```

are derived before `intraday-momentum-v1` moves to paper validation.

Do not implement multiple competing definitions silently.

------------------------------------------------------------------------

# 10. Breakout / Breakdown Confirmation

``` yaml
breakout:
  confirmation_window_candles: null
  minimum_acceptance_distance_bps: null
  require_volume_confirmation: true
  reject_immediate_range_return: true
  late_entry_buffer_bps: null

breakdown:
  confirmation_window_candles: null
  minimum_acceptance_distance_bps: null
  require_volume_confirmation: true
  reject_immediate_range_return: true
  late_entry_buffer_bps: null
```

## Meaning

### `confirmation_window_candles`

How much candle data is used to determine whether the move has actually
accepted beyond the reference level.

### `minimum_acceptance_distance_bps`

Minimum configurable distance beyond the structure before considering
the move meaningful.

### `late_entry_buffer_bps`

Defines how far the market may move beyond the valid entry zone before
the setup is considered late.

All numeric values are `CALIBRATE`.

The PRD does not define these numbers.

------------------------------------------------------------------------

# 11. Relative Volume

``` yaml
volume:
  enabled: true

  rvol:
    timeframe: 5m
    lookback_periods: null
    comparison_method: MEDIAN
    time_of_day_adjusted: true

    min_rvol: null

  confirmation:
    required_for_signal: true
    minimum_component_score: null
```

## Formula

Baseline:

``` text
RVOL =
current comparable-period volume
/
historical baseline volume
```

Preferred baseline:

``` text
historical median
```

with time-of-day adjustment when sufficient historical data exists.

## Stored values

Every signal should retain:

``` text
rvol_value
rvol_baseline
rvol_lookback
rvol_time_bucket
```

`min_rvol` is `CALIBRATE`.

------------------------------------------------------------------------

# 12. Trend Alignment

``` yaml
trend:
  timeframe_primary: 5m
  timeframe_secondary: 1m

  method: null

  long:
    allowed_states:
      - ALIGNED_BULLISH
      - MIXED

  short:
    allowed_states:
      - ALIGNED_BEARISH
      - MIXED
```

The exact trend method is `TBD/CALIBRATE`.

The implementation must document the inputs used to classify:

``` text
ALIGNED_BULLISH
ALIGNED_BEARISH
MIXED
CONTRADICTORY
```

A contradictory higher-timeframe state must not receive a positive
contribution for the opposite direction.

------------------------------------------------------------------------

# 13. Volatility

``` yaml
volatility:
  method: null
  timeframe: 5m
  lookback_periods: null

  regimes:
    low: null
    normal: null
    high: null
    extreme: null

  block_signal_in_extreme: true
```

The actual volatility formula is `TBD/CALIBRATE`.

The configuration must eventually specify:

``` text
formula
lookback
normalization
regime thresholds
```

Target calculations may consume this volatility feature.

------------------------------------------------------------------------

# 14. Liquidity

``` yaml
liquidity:
  enabled: true

  inputs:
    traded_volume: true
    traded_value: true
    candle_continuity: true
    spread: true

  minimum_score: null
```

Do **not** use:

``` text
Depth
Order Book
Bid/Ask Imbalance
```

as a strategy component unless a separate product/architecture decision
introduces and documents the required market-depth data.

The baseline component is:

``` text
Liquidity
```

------------------------------------------------------------------------

# 15. Risk / Reward

``` yaml
risk_reward:
  minimum_ratio: null
  require_valid_ordering: true

  long:
    required_order:
      - STOP
      - ENTRY
      - TARGET

  short:
    required_order:
      - TARGET
      - ENTRY
      - STOP
```

## Required validation

Long:

``` text
stop < reference_entry < target
```

Short:

``` text
target < reference_entry < stop
```

`minimum_ratio` is `CALIBRATE`.

A candidate that fails the structural ordering or minimum configured
risk/reward gate must not become an active signal.

------------------------------------------------------------------------

# 16. Entry Zone

``` yaml
entry:
  mode: ZONE

  reference_method: null

  max_width_bps: null

  reject_late_entry: true
  late_entry_buffer_bps: null
```

Required output:

``` json
{
  "entry_low": 0,
  "entry_high": 0,
  "reference_entry": 0
}
```

`reference_entry` is used for deterministic Target 1 calculation.

The exact entry-zone derivation is `TBD/CALIBRATE` and must be
documented in the implementation.

------------------------------------------------------------------------

# 17. Stop / Invalidation

``` yaml
stop:
  method: null

  structural:
    enabled: true

  volatility_adjustment:
    enabled: true
    multiplier: null

  minimum_distance_bps: null
  maximum_distance_bps: null

  reject_if_risk_too_small: true
  reject_if_risk_too_large: true
```

The stop must be stock-specific.

It may be derived from:

-   setup structure;
-   recent swing;
-   invalidation level;
-   volatility adjustment.

The exact method and multipliers are `TBD/CALIBRATE`.

------------------------------------------------------------------------

# 18. Target 1

Target 1 is the clearest strategy parameter because the PRD specifies
the default.

``` yaml
targets:
  t1:
    method: PERCENT_FROM_REFERENCE_ENTRY
    default_move_percent: 1.0
```

### Formula

Long:

``` text
T1 = reference_entry × 1.01
```

Short:

``` text
T1 = reference_entry × 0.99
```

Status:

``` text
default_move_percent: FIXED_BY_PRD
```

A future strategy version may change this methodology, but changing it
requires a new strategy version.

------------------------------------------------------------------------

# 19. Target 2+

``` yaml
targets:
  t2_plus:
    enabled: true
    method: STRUCTURE_VOLATILITY_MOMENTUM

    max_targets: null

    require_structure_support: true
    require_volatility_support: true
    require_directional_ordering: true

    minimum_extension_bps: null
```

Target 2 and later targets must be derived from:

-   momentum;
-   volatility;
-   structure;
-   available movement range;
-   risk/reward.

The exact formula is `TBD/CALIBRATE`.

It is valid for a signal to have:

``` text
T1 + trailing guidance
```

without a T2 when no meaningful T2 can be justified.

------------------------------------------------------------------------

# 20. Trailing Guidance

``` yaml
trailing:
  enabled: true

  activation:
    method: null
    trigger: null

  distance:
    method: null
    value: null

  never_loosen_initial_stop: true
```

Trailing is guidance only.

It must not:

-   call a broker;
-   modify an order;
-   imply automated execution.

The journal records the actual user exit independently.

------------------------------------------------------------------------

# 21. Confidence Model

``` yaml
confidence:
  enabled: true
  range:
    min: 0
    max: 100

  components:
    setup_quality:
      weight: null

    relative_volume:
      weight: null

    trend_alignment:
      weight: null

    volatility:
      weight: null

    liquidity:
      weight: null

    risk_reward:
      weight: null

  quality_bands:
    low:
      min: 0
      max: 49

    medium:
      min: 50
      max: 69

    high:
      min: 70
      max: 100
```

## Weight rule

Weights must be normalized:

``` text
sum(weights) = 1.0
```

Example shape:

``` text
setup_quality      → configurable
relative_volume    → configurable
trend_alignment    → configurable
volatility         → configurable
liquidity          → configurable
risk_reward        → configurable
```

Do not insert arbitrary weights into production until
historical/simulated calibration has been performed.

## Required output

``` json
{
  "score": 0,
  "quality": "LOW|MEDIUM|HIGH",
  "components": {},
  "weights": {}
}
```

Confidence is setup quality, not probability of profit.

------------------------------------------------------------------------

# 22. Signal Lifetime

The PRD imposes the upper bound.

``` yaml
signal:
  lifetime_minutes: 30
```

Status:

``` text
FIXED_MAXIMUM = 30 minutes
DEFAULT = 30 minutes
```

Formula:

``` text
expires_at =
created_at
+
lifetime_minutes
```

A future version may use a shorter lifetime, but never longer than 30
minutes without changing the product requirement.

------------------------------------------------------------------------

# 23. Invalidation

``` yaml
invalidation:
  enabled: true

  breakout_failure: true
  breakdown_failure: true
  feed_failure: true
  instrument_ineligible: true
  invalid_plan: true
```

Invalidation must create an auditable state transition.

The signal must not simply disappear.

------------------------------------------------------------------------

# 24. Duplicate / Cooldown

``` yaml
deduplication:
  enabled: true

  key:
    - instrument
    - direction
    - setup_family
    - strategy_version
    - setup_reference_level

  suppress_if_active_equivalent: true

  cooldown:
    enabled: true
    minutes: null

  allow_materially_new_setup: true
  material_change_threshold: null
```

Cooldown and material-change thresholds are `CALIBRATE`.

------------------------------------------------------------------------

# 25. Signal Ranking

``` yaml
ranking:
  primary: confidence_score
  secondary: risk_reward_quality
  tertiary: freshness
  tie_breaker: symbol_ascending
```

This ranking affects display ordering only.

It does not:

-   alter the strategy score;
-   change signal validity;
-   imply a guaranteed outcome;
-   determine whether the user should trade.

------------------------------------------------------------------------

# 26. Market Session

``` yaml
session:
  timezone: Asia/Kolkata

  calendar: NSE_TRADING_CALENDAR

  market_open: null
  market_close: null

  generate_signals_only_in_session: true
  expire_active_signals_outside_session: true
```

The actual exchange session times/calendar implementation should come
from the maintained exchange-calendar source used by the application.

Do not duplicate market-session constants across scanner modules.

------------------------------------------------------------------------

# 27. Historical Comparison

``` yaml
historical:
  enabled: true

  comparable_setup:
    match:
      - strategy_version
      - setup_family
      - direction
      - volatility_regime
      - relative_volume_regime
      - trend_alignment
      - liquidity_regime
      - risk_structure

  minimum_sample_count: null

  insufficient_sample_behavior: HIDE_ESTIMATE
```

If the comparable sample is insufficient:

``` text
Insufficient historical sample
```

must be displayed instead of an invented estimate.

`minimum_sample_count` is `CALIBRATE`.

------------------------------------------------------------------------

# 28. Historical Outcome Evaluation

``` yaml
outcome:
  horizon_minutes: null

  first_touch:
    t1: true
    t2: true
    stop: true

  ambiguous:
    classification: AMBIGUOUS
    exclude_from_first_touch_estimate: true
    display_excluded_count: true

  neither_reached: true
```

The evaluation horizon must remain within the product's intraday
objective.

The exact value is `CALIBRATE`.

------------------------------------------------------------------------

# 29. Position Sizing

Position sizing is decision support only.

``` yaml
position_sizing:
  enabled: true

  risk_budget:
    source: USER_CONFIGURED

  formula:
    risk_per_share: ABS(reference_entry - stop)
    quantity: risk_budget / risk_per_share

  constraints:
    max_quantity: null
    max_notional: null
    max_daily_risk: null
    max_concurrent_journaled_trades: null

  broker_execution: false
```

The UI must explicitly label this:

``` text
Decision support only
```

No calculated quantity may be sent to Angel One as an order.

------------------------------------------------------------------------

# 30. Daily Risk Controls

``` yaml
risk:
  daily_risk_budget: null
  max_concurrent_trades: null
  max_new_entries_after_daily_loss: null
  max_alerts_per_symbol: null
```

All values are `USER_CONFIGURED` or `TBD`.

No universal rupee amount is defined by the current source documents.

The system must not silently introduce a value such as:

``` text
₹12,000
```

as a product rule.

------------------------------------------------------------------------

# 31. Partial Exits

``` yaml
partial_exit:
  enabled: true

  user_defined_quantity: true

  suggested_allocation:
    enabled: false
    target_1_percent: null
    target_2_percent: null
    trailing_percent: null
```

The user can journal actual partial exits.

Suggested allocation remains disabled until paper testing validates a
specific strategy configuration.

------------------------------------------------------------------------

# 32. Charge Estimation

Charges belong to the journal, not the scanner strategy.

``` yaml
charges:
  enabled: true
  source: USER_CONFIGURED
  calculated_server_side: true
```

The application should preserve:

``` text
gross_pnl
estimated_charges
net_pnl
```

The client must not be the authoritative source for final P&L.

------------------------------------------------------------------------

# 33. Configuration Schema

A normalized configuration object should have this shape:

``` json
{
  "strategy": {
    "id": "intraday-momentum",
    "version": "v1",
    "strategy_version": "intraday-momentum-v1",
    "configuration_version": 1,
    "status": "paper",
    "effective_from": null
  },

  "market": {
    "exchange": "NSE",
    "segment": "CASH_EQUITY",
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "supported_directions": ["LONG", "SHORT"]
  },

  "candles": {
    "setup_timeframe": "5m",
    "execution_context": "1m"
  },

  "feed": {
    "max_data_age_seconds": null,
    "required_tick_continuity": true
  },

  "eligibility": {
    "min_price": null,
    "min_avg_1m_volume": null,
    "min_avg_5m_volume": null,
    "min_avg_traded_value": null,
    "max_allowed_spread_bps": null,
    "min_required_1m_candles": null,
    "min_required_5m_candles": null
  },

  "structure": {
    "lookback_1m": null,
    "lookback_5m": null,
    "reference_method": null
  },

  "breakout": {
    "confirmation_window_candles": null,
    "minimum_acceptance_distance_bps": null,
    "late_entry_buffer_bps": null
  },

  "volume": {
    "rvol_timeframe": "5m",
    "rvol_lookback_periods": null,
    "rvol_comparison_method": "MEDIAN",
    "rvol_time_of_day_adjusted": true,
    "min_rvol": null
  },

  "trend": {
    "method": null
  },

  "volatility": {
    "method": null,
    "timeframe": "5m",
    "lookback_periods": null
  },

  "liquidity": {
    "minimum_score": null
  },

  "risk_reward": {
    "minimum_ratio": null
  },

  "entry": {
    "reference_method": null,
    "max_width_bps": null,
    "late_entry_buffer_bps": null
  },

  "stop": {
    "method": null,
    "volatility_multiplier": null,
    "minimum_distance_bps": null,
    "maximum_distance_bps": null
  },

  "targets": {
    "t1": {
      "method": "PERCENT_FROM_REFERENCE_ENTRY",
      "default_move_percent": 1.0
    },
    "t2_plus": {
      "method": "STRUCTURE_VOLATILITY_MOMENTUM"
    }
  },

  "trailing": {
    "enabled": true,
    "activation_method": null,
    "trigger": null,
    "distance_method": null,
    "distance": null
  },

  "confidence": {
    "weights": {
      "setup_quality": null,
      "relative_volume": null,
      "trend_alignment": null,
      "volatility": null,
      "liquidity": null,
      "risk_reward": null
    }
  },

  "signal": {
    "lifetime_minutes": 30
  },

  "deduplication": {
    "cooldown_minutes": null,
    "material_change_threshold": null
  },

  "historical": {
    "minimum_sample_count": null,
    "outcome_horizon_minutes": null
  }
}
```

------------------------------------------------------------------------

# 34. Configuration Validation Rules

The configuration loader must reject invalid configurations before the
scanner starts.

## 34.1 Required validation

``` text
strategy_version is present
configuration_version is present

exchange == NSE
segment == CASH_EQUITY
timezone == Asia/Kolkata

setup_timeframe == 5m
execution_context == 1m

signal.lifetime_minutes > 0
signal.lifetime_minutes <= 30

targets.t1.default_move_percent == 1.0 for v1

confidence weights are all present before activation
confidence weights sum to 1.0

risk/reward minimum is positive before activation

cooldown is non-negative before activation

historical minimum sample count is positive when historical estimates are enabled
```

## 34.2 Cross-field validation

The loader must also reject:

``` text
minimum distance > maximum distance

long target <= long entry

short target >= short entry

negative volume thresholds

negative traded-value thresholds

negative risk budget

confidence band overlap

confidence band gaps

signal lifetime > 30 minutes

live status with unresolved CALIBRATE/TBD strategy parameters
```

------------------------------------------------------------------------

# 35. Configuration Completeness States

The configuration should expose a completeness status.

``` yaml
configuration_state:
  state: INCOMPLETE
  unresolved_parameters: []
```

Allowed states:

``` text
INCOMPLETE
SIMULATION_READY
PAPER_READY
LIVE_READY
RETIRED
```

## `INCOMPLETE`

One or more required strategy parameters remain unresolved.

No scanner activation.

## `SIMULATION_READY`

All parameters required for deterministic simulation are populated.

Historical/synthetic testing is allowed.

## `PAPER_READY`

Historical tests and configuration validation have passed sufficiently
for paper tracking.

## `LIVE_READY`

Paper validation and operational safety gates have passed.

## `RETIRED`

The configuration must remain readable for historical reproduction but
must not generate new live signals.

------------------------------------------------------------------------

# 36. Calibration Workflow

Values marked `CALIBRATE` must follow this process:

``` text
Raw market data
      ↓
Inspect distributions
      ↓
Generate candidate parameter ranges
      ↓
Historical testing
      ↓
Sensitivity analysis
      ↓
Simulated scanner
      ↓
Paper tracking
      ↓
Review false positives / missed setups
      ↓
Freeze parameter set
      ↓
Create strategy version
```

Do not optimize parameters solely for one historical period.

The objective is reproducibility and understanding of behavior, not
curve-fitting a perfect historical result.

------------------------------------------------------------------------

# 37. Parameter Registry

The following registry is the implementation checklist.

  Parameter                         Classification      Initial value
  --------------------------------- ------------------- ---------------------------------
  Strategy ID                       `FIXED`             `intraday-momentum`
  Strategy version                  `FIXED`             `intraday-momentum-v1`
  Exchange                          `FIXED`             `NSE`
  Segment                           `FIXED`             `CASH_EQUITY`
  Timezone                          `FIXED`             `Asia/Kolkata`
  Setup timeframe                   `FIXED`             `5m`
  Execution timeframe               `FIXED`             `1m`
  Signal lifetime                   `FIXED_MAX`         `30 min`
  T1 move                           `FIXED_BY_PRD`      `1%`
  Min price                         `CALIBRATE`         `null`
  Avg 1m volume                     `CALIBRATE`         `null`
  Avg 5m volume                     `CALIBRATE`         `null`
  Traded value                      `CALIBRATE`         `null`
  Max spread                        `CALIBRATE`         `null`
  Required 1m candles               `CALIBRATE`         `null`
  Required 5m candles               `CALIBRATE`         `null`
  Structure lookback                `CALIBRATE`         `null`
  Breakout confirmation             `CALIBRATE`         `null`
  Breakout acceptance distance      `CALIBRATE`         `null`
  Late-entry buffer                 `CALIBRATE`         `null`
  RVOL lookback                     `CALIBRATE`         `null`
  Minimum RVOL                      `CALIBRATE`         `null`
  Trend method                      `TBD`               `null`
  Volatility method                 `TBD`               `null`
  Volatility lookback               `CALIBRATE`         `null`
  Liquidity minimum                 `CALIBRATE`         `null`
  Minimum risk/reward               `CALIBRATE`         `null`
  Entry-zone method                 `TBD`               `null`
  Stop method                       `TBD`               `null`
  Stop volatility multiplier        `CALIBRATE`         `null`
  T2 method                         `TBD`               `STRUCTURE_VOLATILITY_MOMENTUM`
  Trailing trigger                  `TBD`               `null`
  Trailing distance                 `TBD`               `null`
  Confidence weights                `CALIBRATE`         `null`
  Duplicate cooldown                `CALIBRATE`         `null`
  Material setup-change threshold   `CALIBRATE`         `null`
  Historical minimum sample         `CALIBRATE`         `null`
  Outcome horizon                   `CALIBRATE`         `null`
  Daily risk budget                 `USER_CONFIGURED`   `null`
  Maximum notional                  `USER_CONFIGURED`   `null`
  Maximum quantity                  `USER_CONFIGURED`   `null`

------------------------------------------------------------------------

# 38. What Must Be Resolved Before Paper Tracking

The following are the main implementation blockers:

-   [ ] Exact structure/range detection method.
-   [ ] Breakout confirmation window.
-   [ ] Breakdown confirmation window.
-   [ ] RVOL lookback.
-   [ ] Minimum RVOL.
-   [ ] Trend-alignment calculation.
-   [ ] Volatility calculation.
-   [ ] Volatility regime thresholds.
-   [ ] Entry-zone calculation.
-   [ ] Stop/invalidation calculation.
-   [ ] Minimum risk/reward.
-   [ ] T2 calculation.
-   [ ] Trailing trigger.
-   [ ] Trailing distance.
-   [ ] Confidence weights.
-   [ ] Eligibility thresholds.
-   [ ] Duplicate cooldown.
-   [ ] Historical sample threshold.
-   [ ] Outcome evaluation horizon.

These should be resolved through data inspection and testing, not by
arbitrary guesses.

------------------------------------------------------------------------

# 39. What Is Already Fixed

The following should **not** be reopened during ordinary strategy
implementation:

-   NSE cash-equity scope.
-   Long and short support.
-   1-minute and 5-minute candle usage.
-   Breakout/breakdown momentum setup families.
-   Relative volume as a strategy component.
-   Trend alignment as a strategy component.
-   Volatility as a strategy component.
-   Liquidity as a strategy component.
-   Risk/reward validation.
-   Stock-specific invalidation.
-   T1 default of 1%.
-   Signal lifetime maximum of 30 minutes.
-   Explainable confidence model.
-   Confidence components based on documented strategy factors.
-   Historical estimates separated from confidence.
-   Ambiguous historical outcomes.
-   Immutable strategy versioning.
-   No broker order execution.
-   No broker credentials in the browser.
-   Paper validation before live activation.

------------------------------------------------------------------------

# 40. Configuration Loading Contract

At runtime:

``` text
load strategy version
      ↓
load immutable configuration
      ↓
validate schema
      ↓
validate cross-field constraints
      ↓
calculate configuration hash
      ↓
register strategy version
      ↓
start scanner
```

The scanner must refuse to start in live mode when required strategy
parameters remain unresolved.

Recommended configuration metadata:

``` json
{
  "strategy_version": "intraday-momentum-v1",
  "configuration_version": 1,
  "configuration_hash": "<computed-at-runtime>",
  "status": "paper",
  "loaded_at": "<timestamp>"
}
```

The configuration hash should be persisted with generated signals.

------------------------------------------------------------------------

# 41. Configuration Hash

The hash should be computed from the canonicalized effective
configuration.

Conceptually:

``` text
configuration_hash =
SHA256(
  canonical_json(effective_strategy_configuration)
)
```

The hash is not a replacement for `strategy_version`.

Use both:

``` text
strategy_version
+
configuration_version
+
configuration_hash
```

This makes accidental configuration drift detectable.

------------------------------------------------------------------------

# 42. Signal Snapshot Requirement

Every signal must retain the effective configuration values that
materially affected its creation.

At minimum:

``` json
{
  "strategy_version": "intraday-momentum-v1",
  "configuration_version": 1,
  "configuration_hash": "...",
  "parameters": {
    "rvol_threshold": null,
    "risk_reward_minimum": null,
    "signal_lifetime_minutes": 30
  }
}
```

The production schema may normalize these values, but they must remain
reconstructable.

------------------------------------------------------------------------

# 43. Environment Rules

## Local development

``` yaml
environment:
  market_data: SIMULATED
  broker_orders: DISABLED
  strategy_status: simulated
```

## Preview

``` yaml
environment:
  market_data: GENERATED_OR_SIMULATED
  broker_orders: DISABLED
  strategy_status: simulated
```

## Paper tracking

``` yaml
environment:
  market_data: LIVE_OR_HISTORICAL
  broker_orders: DISABLED
  strategy_status: paper
```

## Production live tracking

``` yaml
environment:
  market_data: LIVE
  broker_orders: DISABLED
  strategy_status: live
```

The final line is intentional:

``` text
broker_orders: DISABLED
```

The application remains market-data-only even in live strategy mode.

------------------------------------------------------------------------

# 44. Final Configuration Contract

`intraday-momentum-v1` is configuration-valid when:

``` text
market scope is valid
        +
timeframes are valid
        +
feed rules are valid
        +
eligibility rules are populated
        +
setup rules are populated
        +
RVOL rules are populated
        +
trend rules are populated
        +
volatility rules are populated
        +
liquidity rules are populated
        +
risk/reward rules are populated
        +
entry rules are populated
        +
stop rules are populated
        +
T1 is 1% by default
        +
T2 rules are populated
        +
trailing rules are populated
        +
confidence weights sum to 1
        +
signal lifetime <= 30 minutes
        +
deduplication rules are populated
        +
historical evaluation rules are populated
        +
configuration hash is generated
```

The configuration is **not live-ready merely because it passes schema
validation**.

The required lifecycle remains:

``` text
CONFIG COMPLETE
      ↓
SIMULATION
      ↓
HISTORICAL TESTING
      ↓
SENSITIVITY REVIEW
      ↓
PAPER TRACKING
      ↓
OPERATIONAL VALIDATION
      ↓
LIVE MARKET-DATA TRACKING
```

No broker execution is introduced at any stage.
