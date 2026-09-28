# Project Scope

## At a glance

| Feature | Status |
|---|---|
| Strategy Engine Implementation (Phase 2) | in-progress |
| Intraday Stock Tracker Dashboard UI | in-progress |

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

---

## Intraday Stock Tracker Dashboard UI `in-progress`

**Intent**: Implement a pure UI shell for the Intraday Stock Tracker with mock data and local state transitions, ensuring pixel-perfect fidelity to the Stitch designs.
**Done when**: All screens are built, responsive, and interactive with mock data, without connecting to real APIs.

- [x] Design it (spec): [0002](../specs/0002-intraday-dashboard-ui/index.md)
- [ ] Build it: /develop
  - [x] Design tokens, layout shell, and mock state providers (AC-1, AC-6, AC-8)
  - [x] Screen 1 (Dashboard), Empty/Delayed states, Screen 2 (Signal Detail), Screen 3 (Expired state) (AC-2, AC-3)
  - [x] Screen 4 (Trade Entry Modal), Screen 5 (Risk Error Modal), Screen 6 (Open Trade Detail) (AC-4, AC-5)
  - [x] Screen 7 (Trade Journal + Audit Drawer) (AC-7)
- [ ] Verify it: /check verify
- [ ] Test it: /test
