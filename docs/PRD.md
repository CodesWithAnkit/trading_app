# Intraday Stock Tracker — Product Requirements Document

**Status:** Draft v1.0  
**Product type:** Personal, responsive web dashboard  
**Market:** NSE cash-equity stocks only (first release)

## 1. Product summary

Intraday Stock Tracker is a personal decision-support dashboard for observing short-lived intraday stock setups, recording manually executed trades, and learning from their outcomes. It scans eligible NSE cash-equity stocks, surfaces potential long and short setups, and presents a time-bound trade plan.

The application never places, changes, or cancels broker orders. The user remains responsible for every trading decision and executes trades separately in Angel One.

## 2. Problem and goal

Intraday opportunities can be brief and difficult to compare consistently. The tracker should make possible setups easier to inspect, capture a clear entry/exit plan, and maintain a reliable journal of what actually happened.

The goal is to help one trader:

- find liquid, eligible stocks showing defined intraday momentum setups;
- assess potential long and short opportunities in a 1–30 minute window;
- record entries, exits, and partial exits in seconds;
- review signal quality and actual trading performance over time.

## 3. Non-goals and safety boundaries

- No broker-order placement, modification, cancellation, or automation.
- No funds, holdings, positions, portfolio, or order API integrations.
- No options, indices, or Nifty instruments in the first release.
- No promise or claim that a signal will be profitable.
- No API key, MPIN, TOTP secret, or session token in client-side code, source control, notifications, or this document.

All alerts are rule-based observations and historical/statistical estimates, not investment advice.

## 4. Users

### Primary user

One individual trader who executes trades manually through Angel One and uses this product to observe, evaluate, and journal intraday setups.

## 5. First-release scope

### 5.1 Dashboard

- Responsive browser dashboard optimized for desktop, with usable tablet and mobile layouts.
- Market-data connection status and latest update time.
- Active long and short alerts.
- Alert countdown, price, entry zone, stop, targets, confidence, and reasoning.
- Open manual trades, daily summary, alert history, and trade journal.
- Search and filtering by symbol, direction, setup, confidence, and status.
- Browser/desktop notification preference.

### 5.2 Signal scanner

- Scan eligible, liquid NSE cash-equity stocks during market hours.
- Exclude illiquid, suspended, cautionary, or unsuitable instruments.
- Support bullish breakout/momentum and bearish breakdown/momentum setups.
- Evaluate price action, relative volume, trend, volatility, liquidity, and risk/reward.
- Produce an entry zone, stock-specific invalidation/stop, Target 1, further targets, and trailing-exit guidance.
- Expire each signal no later than 30 minutes after it was created.

### 5.3 Signal plan

Each alert includes:

- symbol, exchange, and live price;
- `Long` or `Short` direction;
- setup name and concise rationale;
- entry zone;
- stop-loss / invalidation level;
- Target 1: a 1% move from entry by default;
- Target 2 and later targets based on momentum and volatility;
- trailing-exit logic;
- creation and expiry timestamps;
- a transparent confidence score and component metrics.

For example, a ₹20 long setup has a default Target 1 at ₹20.20. A short uses the same percentage move in the opposite direction.

### 5.4 Outcome-confidence layer

For comparable historical setups, the product may display:

- estimated likelihood of Target 1, Target 2, or stop being reached first;
- expected movement range over the next 1–30 minutes;
- count and results of similar past setups;
- low, medium, or high setup-quality label.

These are estimates based on rules and historical evidence, never profit guarantees.

### 5.5 Trade journal

- **I entered** action: records entry time, price, quantity, direction, and linked alert.
- **I exited** action: records exit time, price, quantity, target reached or exit reason.
- Support partial exits across targets.
- Track gross P&L, configurable estimated charges, net P&L, holding duration, and notes.
- Compare actual execution and outcome against the original alert plan.
- Preserve an audit trail for alert and trade-journal changes.

## 6. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | The user can view active alerts ranked by setup quality. |
| FR-02 | Every active alert shows a live countdown and becomes non-actionable at expiry. |
| FR-03 | The user can manually mark an alert as entered, skipped, or expired. |
| FR-04 | The user can log full and partial exits for an open trade. |
| FR-05 | The product calculates gross and estimated net P&L for journaled trades. |
| FR-06 | The user can filter and inspect historical alerts and trades. |
| FR-07 | The user can enable or disable browser notifications. |
| FR-08 | The product clearly distinguishes live data, delayed/stale data, and disconnected status. |
| FR-09 | The product records the inputs and rule version used for each alert. |
| FR-10 | The product does not expose or call broker order-management endpoints. |

## 7. Data and architecture

```text
Next.js dashboard on Vercel
  └─ authenticated, responsive user interface

Always-on worker with a fixed outbound IP
  └─ Angel One SmartAPI market-data connection, scanner, alert engine

Supabase
  └─ authentication, alerts, trades, settings, real-time updates, audit history
```

The worker is separate from Vercel because continuous market-data scanning requires a persistent connection and a fixed IP can be allowlisted with Angel One. The dashboard and worker communicate only through secure server-side interfaces and the database.

## 8. Core data entities

| Entity | Purpose |
| --- | --- |
| Instrument | Eligible NSE cash-equity stock and liquidity metadata. |
| Signal | A time-bound detected setup and its immutable planned levels. |
| Signal metric | Inputs, score components, and rule-version metadata for a signal. |
| Trade | A manually recorded position linked to an optional signal. |
| Trade leg | Entry, full exit, or partial exit event. |
| User setting | Notification, charge-estimate, risk, and display preferences. |
| Audit event | Timestamped record of signal and journal actions. |

## 9. Success measures

- Live market-data connection stays visible and data freshness is clear.
- Active alerts are delivered promptly and expire correctly.
- A manual entry or exit can be logged in under 10 seconds.
- Journal calculations are traceable and accurate.
- Historical analysis separates alert performance from actual trade performance.
- Paper tracking validates the initial strategy before relying on it for live decisions.

## 10. Delivery phases

1. **Foundation:** dashboard design, authentication, Supabase schema, simulated alerts, and manual journal.
2. **Scanner prototype:** historical/simulated strategy evaluation and performance views.
3. **Live data:** fixed-IP worker plus Angel One SmartAPI market-data integration.
4. **Validation:** paper tracking, historical testing, and signal-rule refinement.
5. **Personal live tracking:** live signals with manual broker execution only.

## 11. Open decisions

- Final daily risk limits and maximum alert/trade caps.
- Fixed-IP hosting provider and region for the always-on worker.
- Eligibility thresholds for price, volume, spread, and intraday tradability.
- Default partial-exit allocation across Targets 1, 2, and trailing exit.
- Charge-estimation inputs for the trade journal.
