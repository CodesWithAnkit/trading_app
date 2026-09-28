# Decision Record: 0001. Implement deterministic strategy engine and calibration

## Context

The core trading algorithm must be proven against historical data before risking real capital. To do this safely, the system must deterministically generate trading signals (entry, stop, targets) from raw OHLC candles and strategy configurations. Any external side effects (like WebSocket connections, order placement, live database writes) would introduce non-determinism, making backtests unreliable and calibration dangerous. The primary constraint is strictly zero broker integration in this phase; the goal is a pure, testable, and calibratable simulation runner that proves the strategy's statistical edge.

## Options considered

Options considered were not documented at decision time, as the provided Phase 2 Prompt explicitly prescribes the deterministic, stateless pipeline architecture.

## Rationale

A stateless, functional design is the only reliable way to guarantee reproducibility in trading simulations. By strictly separating the calculation of signals from the execution of orders, we eliminate the risk of accidental live trades during testing and prevent look-ahead bias. This design allows us to run extensive unit and property tests across thousands of simulated edge cases (gaps, false breakouts, contradictory trends) quickly and reliably, which is mandatory before moving to paper trading (Phase 3).

## References

**Project sources**:
- `docs/PHASE_2_STRATEGY_IMPLEMENTATION_PROMPT.md` (Strategy Engine Implementation Guidelines)
- `docs/STITCH_UI_IMPLEMENTATION_PLAN.md` (Previous UI Phase Guidelines)

**Practices & standards**:
- Pure functional pipelines for algorithmic testing
- Look-ahead bias prevention in financial backtesting
- Property-based testing for financial invariants
