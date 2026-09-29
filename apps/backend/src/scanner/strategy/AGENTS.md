# Strategy Engine Implementation

This area contains the deterministic, stateless, side-effect-free pipeline for strategy simulation and calibration.

- **Conventions:**
  - Pure functions only. No state mutation, no network requests.
  - Zero broker (Angel One) execution or network code.
  - No look-ahead bias: calculate features using only strictly historical data relative to the evaluation candle.
  - Deterministic data types and validation with `zod`.
  - Signal generation yields strictly identical outputs for identical inputs.
  - Unresolved parameters are surfaced for calibration.

- **Files:**
  - `config/`: Configuration definitions and validation (`strategyConfig.ts`).
  - `market/`: Canonical market data representations (`candleTypes.ts`).
  - `eligibility/`: Asset filtering logic (`eligibilityEngine.ts`).
  - `features/`: Mathematical indicator calculations (`rvolCalculator.ts`, `trendCalculator.ts`).
  - `setup/`: Trade candidate detection (`candidateDetection.ts`).
  - `setup/multiStrategyEngine.ts`: live strategy triggers used by `ScannerService` (`evaluateAllStrategies`) and 1% proximity checks for approaching setups (`evaluateStrategyProximity`).
  - `plan/`: Entry/stop/target planning and risk reward (`tradePlanBuilder.ts`).
  - `signal/`: Immutable signal state (`signalSnapshot.ts`).
  - `simulation/`: Orchestration and historical evaluation (`simulationRunner.ts`, `calibration.ts`).

- **Verification:**
  - Verify changes with deterministic unit tests and the `/check verify` runtime proofs.
  - See [0001-strategy-engine-implementation](../../../../../docs/specs/0001-strategy-engine-implementation/index.md) for the governing spec.

_Drafted by /sync from the introducing change, worth a quick human pass._
