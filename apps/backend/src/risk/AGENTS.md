# Position sizing and risk limits (spec 0028)

Turns every signal into "take N shares" or "skip, reason" for the signed in user. Governing spec: [0028 Position Sizing and Risk Limits](../../../../docs/specs/0028-position-sizing-risk-limits/index.md).

- **Files:**
  - `sizing.ts`: pure rules. `sizeSignal(signal, ctx)` (the verdict), `buildContext(limits, openRows, closedTodayRows)`, `realizedPnl(direction, entry, exit, qty)`, `DEFAULT_LIMITS`. No database access.
  - `risk.service.ts`: `RiskService`: `limitsFor`, `updateLimits` (validates the merged row, upserts), `contextFor(userId)` (PENDING entries plus today's IST closes), `withRisk` (attach verdicts to mapped API signals), `notify(userId)` and `changes$` (the per user `risk:changed` source).
  - `risk.controller.ts`: `GET`/`PATCH /api/v1/settings/risk`, `GET /api/v1/risk/context`.
  - `risk.module.ts`: exports `RiskService`; `ApiModule` imports it.

- **Conventions:**
  - Skip reasons keep the spec order: invalid stop (missing, zero distance, wrong side, entry ≤ 0) first, then max open trades, daily loss limit, stop too wide, capital too small, stop too wide for the remaining room. Never divide before the stop check.
  - Read the stop from `snapshot_json.stop.level` directly; never `stopOf` (its 0.99 fallback invents a stop).
  - Load the context once per request, then size every signal from it. Signal rows stay global; verdicts are personal.
  - Any route that writes the journal or the limits calls `risk.notify(user.id)` after a successful write. `signal:new` stays global and never carries `risk`.
  - Daily loss is the day's NET realized P&L in IST (`istDayRange`), never the server clock. Journal rows with no quantity count as ₹0.
  - `realized_pnl` is computed on the server only. A close is one conditional update (`status = 'PENDING'`), so a second close gets 409.

- **Verification:**
  - `npx vitest run src/risk src/api/journal.controller.spec.ts --root apps/backend`

_Drafted by /sync from the introducing change, worth a quick human pass._
