# Project Scope

## At a glance

| Feature | Status |
|---|---|
| Strategy Engine Implementation (Phase 2) | in-progress |

---

## Strategy Engine Implementation (Phase 2) `in-progress`

**Intent**: Implement a deterministic, stateless, side-effect-free pipeline for strategy simulation and calibration using historical data.
**Done when**: The engine deterministically transforms configuration and historical candles into verifiable signal snapshots without any live broker execution.

- [x] Design it (spec): [0001](../specs/0001-strategy-engine-implementation/index.md)
- [x] Build it: /develop
  - [x] Core types & config validation (AC-1, AC-2)
  - [x] Eligibility & feature pipeline without look-ahead (AC-3)
  - [x] Signal scoring & snapshot building (AC-4)
  - [x] Lifecycle management & Simulation runner (AC-5, AC-6)
  - [x] Reporting & Fixtures (AC-7, AC-8)
- [x] Verify it: /check verify
- [ ] Test it: /test
