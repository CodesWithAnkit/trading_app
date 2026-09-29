import { z } from "zod";

export const StrategyIdentitySchema = z.object({
  id: z.string(),
  version: z.string(),
  strategy_version: z.string(),
  configuration_version: z.number(),
  status: z.enum(["draft", "simulated", "paper", "live", "retired"]),
  effective_from: z.string().datetime().nullable(),
});

export const MarketScopeSchema = z.object({
  exchange: z.literal("NSE"),
  segment: z.literal("CASH_EQUITY"),
  timezone: z.string(),
  currency: z.literal("INR"),
  supported_directions: z.array(z.enum(["LONG", "SHORT"])),
});

export const CandlesConfigSchema = z.object({
  primary: z.array(z.enum(["1m", "5m"])),
  signal_context: z.object({
    setup_timeframe: z.literal("5m"),
    execution_context: z.literal("1m"),
  }),
  use_completed_candles_for_confirmation: z.boolean(),
  allow_forming_candle_for_monitoring: z.boolean(),
  required_history: z.object({
    one_minute: z.number().nullable(),
    five_minute: z.number().nullable(),
  }),
});

export const FeedConfigSchema = z.object({
  max_data_age_seconds: z.number().nullable(),
  required_tick_continuity: z.boolean(),
  reject_on_missing_candle: z.boolean(),
  reject_on_invalid_price: z.boolean(),
  reject_on_invalid_volume: z.boolean(),
  allow_signal_when_simulated: z.boolean(),
});

export const EligibilityConfigSchema = z.object({
  instrument_type: z.literal("NSE_CASH_EQUITY"),
  require_active_status: z.boolean(),
  exclude_suspended: z.boolean(),
  exclude_cautionary: z.boolean(),
  exclude_unsuitable: z.boolean(),
  min_price: z.number().nullable(),
  min_avg_1m_volume: z.number().nullable(),
  min_avg_5m_volume: z.number().nullable(),
  min_avg_traded_value: z.number().nullable(),
  max_allowed_spread_bps: z.number().nullable(),
  min_required_1m_candles: z.number().nullable(),
  min_required_5m_candles: z.number().nullable(),
});

export const SetupsConfigSchema = z.object({
  enabled: z.array(z.enum(["BREAKOUT_MOMENTUM", "BREAKDOWN_MOMENTUM"])),
  breakout: z.object({ enabled: z.boolean() }),
  breakdown: z.object({ enabled: z.boolean() }),
});

export const StructureConfigSchema = z.object({
  lookback_1m: z.number().nullable(),
  lookback_5m: z.number().nullable(),
  reference_method: z.string().nullable(),
  minimum_structure_quality: z.number().nullable(),
  allow_extended_range: z.boolean(),
});

export const BreakoutBreakdownConfigSchema = z.object({
  confirmation_window_candles: z.number().nullable(),
  minimum_acceptance_distance_bps: z.number().nullable(),
  require_volume_confirmation: z.boolean(),
  reject_immediate_range_return: z.boolean(),
  late_entry_buffer_bps: z.number().nullable(),
});

export const VolumeConfigSchema = z.object({
  enabled: z.boolean(),
  rvol: z.object({
    timeframe: z.literal("5m"),
    lookback_periods: z.number().nullable(),
    comparison_method: z.enum(["MEDIAN", "MEAN"]).nullable(),
    time_of_day_adjusted: z.boolean(),
    min_rvol: z.number().nullable(),
  }),
  confirmation: z.object({
    required_for_signal: z.boolean(),
    minimum_component_score: z.number().nullable(),
  }),
});

export const TrendConfigSchema = z.object({
  timeframe_primary: z.literal("5m"),
  timeframe_secondary: z.literal("1m"),
  method: z.string().nullable(),
  long: z.object({
    allowed_states: z.array(z.enum(["ALIGNED_BULLISH", "MIXED"])),
  }),
  short: z.object({
    allowed_states: z.array(z.enum(["ALIGNED_BEARISH", "MIXED"])),
  }),
});

export const VolatilityConfigSchema = z.object({
  method: z.string().nullable(),
  timeframe: z.literal("5m"),
  lookback_periods: z.number().nullable(),
  regimes: z.object({
    low: z.number().nullable(),
    normal: z.number().nullable(),
    high: z.number().nullable(),
    extreme: z.number().nullable(),
  }),
  block_signal_in_extreme: z.boolean(),
});

export const LiquidityConfigSchema = z.object({
  enabled: z.boolean(),
  inputs: z.object({
    traded_volume: z.boolean(),
    traded_value: z.boolean(),
    candle_continuity: z.boolean(),
    spread: z.boolean(),
  }),
  minimum_score: z.number().nullable(),
});

export const RiskRewardConfigSchema = z.object({
  minimum_ratio: z.number().nullable(),
  require_valid_ordering: z.boolean(),
  long: z.object({
    required_order: z.array(z.enum(["STOP", "ENTRY", "TARGET"])),
  }),
  short: z.object({
    required_order: z.array(z.enum(["STOP", "ENTRY", "TARGET"])),
  }),
});

export const EntryConfigSchema = z.object({
  mode: z.enum(["ZONE", "POINT"]),
  reference_method: z.string().nullable(),
  max_width_bps: z.number().nullable(),
  reject_late_entry: z.boolean(),
  late_entry_buffer_bps: z.number().nullable(),
});

export const StopConfigSchema = z.object({
  method: z.string().nullable(),
  structural: z.object({ enabled: z.boolean() }),
  volatility_adjustment: z.object({
    enabled: z.boolean(),
    multiplier: z.number().nullable(),
  }),
  minimum_distance_bps: z.number().nullable(),
  maximum_distance_bps: z.number().nullable(),
  reject_if_risk_too_small: z.boolean(),
  reject_if_risk_too_large: z.boolean(),
});

export const TargetsConfigSchema = z.object({
  t1: z.object({
    method: z.enum(["PERCENT_FROM_REFERENCE_ENTRY", "RISK_MULTIPLIER"]),
    default_move_percent: z.number().nullable(),
  }),
  t2_plus: z.object({
    enabled: z.boolean(),
    method: z.string().nullable(),
    max_targets: z.number().nullable(),
    require_structure_support: z.boolean(),
    require_volatility_support: z.boolean(),
    require_directional_ordering: z.boolean(),
    minimum_extension_bps: z.number().nullable(),
  }),
});

export const TrailingConfigSchema = z.object({
  enabled: z.boolean(),
  activation: z.object({
    method: z.string().nullable(),
    trigger: z.number().nullable(),
  }),
  distance: z.object({
    method: z.string().nullable(),
    value: z.number().nullable(),
  }),
  never_loosen_initial_stop: z.boolean(),
});

export const ConfidenceConfigSchema = z.object({
  enabled: z.boolean(),
  range: z.object({ min: z.number(), max: z.number() }),
  components: z.object({
    setup_quality: z.object({ weight: z.number().nullable() }),
    relative_volume: z.object({ weight: z.number().nullable() }),
    trend_alignment: z.object({ weight: z.number().nullable() }),
    volatility: z.object({ weight: z.number().nullable() }),
    liquidity: z.object({ weight: z.number().nullable() }),
    risk_reward: z.object({ weight: z.number().nullable() }),
  }),
  quality_bands: z.object({
    low: z.object({ min: z.number(), max: z.number() }),
    medium: z.object({ min: z.number(), max: z.number() }),
    high: z.object({ min: z.number(), max: z.number() }),
  }),
});

export const StrategyConfigSchema = z.object({
  strategy: StrategyIdentitySchema,
  market: MarketScopeSchema,
  candles: CandlesConfigSchema,
  feed: FeedConfigSchema,
  eligibility: EligibilityConfigSchema,
  setups: SetupsConfigSchema,
  structure: StructureConfigSchema,
  breakout: BreakoutBreakdownConfigSchema,
  breakdown: BreakoutBreakdownConfigSchema,
  volume: VolumeConfigSchema,
  trend: TrendConfigSchema,
  volatility: VolatilityConfigSchema,
  liquidity: LiquidityConfigSchema,
  risk_reward: RiskRewardConfigSchema,
  entry: EntryConfigSchema,
  stop: StopConfigSchema,
  targets: TargetsConfigSchema,
  trailing: TrailingConfigSchema,
  confidence: ConfidenceConfigSchema,
});

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;
