# Intraday Stock Tracker — Product Requirements Document

**Status:** Draft v1.1 — Market Intelligence scope added  
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
- review signal quality and actual trading performance over time;
- understand how market news, sentiment, institutional-flow context, sector strength, and price action affect a potential setup;
- make the final decision manually using traceable evidence rather than an opaque buy/sell prediction.

## 3. Non-goals and safety boundaries

- No broker-order placement, modification, cancellation, or automation.
- No funds, holdings, positions, portfolio, or order API integrations.
- No options, indices, or Nifty instruments in the first release.
- No promise or claim that a signal will be profitable or that any approach can guarantee a result.
- No automated trade decision presented as certainty; intelligence is advisory and must expose evidence, uncertainty, and data freshness.
- No API key, MPIN, TOTP secret, or session token in client-side code, source control, notifications, or this document.

All alerts are rule-based observations and historical/statistical estimates, not investment advice. The product is decision support: it explains evidence and risks, and the user decides whether to act.

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
- Target 1: configurable default; the current 1% value is only a starting placeholder and must be validated per setup, volatility, costs, and holding window;
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

### 5.5 Market intelligence and explainable analysis

The first release expands beyond technical-only scanning. It combines multiple evidence categories, but does not hide them inside one unexplained prediction. The user must be able to inspect each category and its contribution to the analysis.

#### A. Market and sector context

- Determine broad market regime from eligible NSE cash-equity price action, market breadth, sector/index context where permitted, volatility, and intraday trend. Index values may be used as contextual data only; index instruments are not tradable instruments in this release.
- Identify relatively strong and weak sectors and stocks using consistent time windows and benchmark comparisons.
- Evaluate VWAP, opening-range behaviour, trend structure, relative volume, volatility, liquidity, support/resistance context, and breakout/breakdown confirmation.
- Mark conditions as trending, range-bound, volatile/dislocated, or unclear only when defined rule criteria are met.

#### B. News and event intelligence

- Ingest licensed or otherwise authorized financial-news feeds and official company/exchange announcements. Do not scrape or redistribute content where terms do not permit it.
- Prioritize primary sources: NSE/BSE corporate announcements and filings, company investor-relations releases, RBI publications, Ministry of Statistics and Programme Implementation releases, and other relevant official government/regulatory publications.
- Use reputable news providers for context and corroboration, subject to licensing, cost, availability, and attribution requirements. Provider selection is an implementation decision and must be recorded before production.
- Classify each item by affected company/sector/market, event type, likely direction (positive/negative/mixed/unknown), potential impact (low/medium/high), confidence, publication time, ingestion time, source, and whether it is confirmed or unverified.
- Deduplicate syndicated copies and distinguish the event time from the publication and ingestion times. Show links to original sources when available.
- Treat language-model summaries/classifications as fallible interpretations. Preserve the source headline/excerpt and never present inferred impact as a confirmed fact.
- Flag earnings, results, corporate actions, regulatory announcements, macro releases, geopolitical developments, and other event risk. Do not assume that positive news automatically implies a rising stock.

#### C. Investor mood and positioning context

- Derive sentiment from observable, timestamped evidence such as market breadth, advance/decline counts, sector participation, relative strength, volatility, price gaps, volume behaviour, and eligible derivatives/positioning data when a permitted data source is available.
- Show a transparent state such as bullish, bearish, mixed, or uncertain, alongside the evidence and lookback window. Avoid treating sentiment as a directly observed fact when it is a calculated proxy.
- Sentiment from news or public commentary may be added only when source coverage, timestamps, licensing, and a repeatable calculation method are documented. Social posts, rumours, and unverified tips cannot be treated as verified market facts.

#### D. Institutional activity

- Use official published FII/FPI and DII flow reports, NSE/BSE bulk and block deal disclosures, and other official disclosures relevant to the selected stock universe.
- Clearly label whether a figure is market-wide, sector-level, or company-specific, and whether it is intraday, end-of-day, or otherwise delayed.
- Never infer a named investor's current intent from an old disclosure. Publicly disclosed activity is historical context, not a live order-flow feed.
- Institutional activity is contextual evidence and must not independently create a trade alert.

#### E. Established investor/trader principles as explicit rules

Translate principles into testable rules rather than quotes or unverified claims about what a famous investor currently does. Initial principles include:

- **Risk first:** define invalidation and maximum acceptable loss before considering entry.
- **Trend and relative strength:** prefer alignment with a defined trend or explicitly explain a counter-trend setup.
- **Price/volume confirmation:** require a documented confirmation condition for breakout/breakdown setups.
- **Reward relative to risk:** reject setups whose estimated reward does not justify planned risk after estimated costs and slippage.
- **Discipline:** avoid chasing extended moves, repeated entries after a configured loss limit, and setups with insufficient evidence.
- **No-trade is valid:** unclear, contradictory, stale, illiquid, or event-dislocated conditions may result in no setup.

These principles are hypotheses to test for intraday NSE cash equities; long-term investing frameworks must not be assumed to transfer unchanged to intraday trading.

#### F. Explainable analysis card

For each stock considered, display: market regime; sector context; relevant news/events and source timestamps; sentiment/flow evidence and data age; technical setup; positive evidence; contradictory evidence; entry zone; invalidation/stop; targets; estimated costs/slippage; historical comparable-setup sample size and outcomes; strategy/rule version; and explicit reasons for qualification or rejection. The user must be able to inspect component evidence without relying on a single opaque composite score.

### 5.6 Trade journal

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
| FR-11 | The dashboard shows market regime, sector context, news/events, sentiment proxies, institutional disclosures, technical evidence, and conflicting evidence as separate inspectable categories. |
| FR-12 | Every external data item records source, source timestamp (when provided), ingestion timestamp, coverage/period, and freshness status. |
| FR-13 | Stale, delayed, missing, contradictory, or disconnected critical data is visibly flagged and can suppress actionable setup presentation. |
| FR-14 | News classifications show source links, classification confidence, impact rationale, and a clear distinction between confirmed facts and inferred interpretation. |
| FR-15 | Institutional-flow and deal data are labelled with their actual publication period and are never represented as live positioning unless the source explicitly supports that claim. |
| FR-16 | Every setup explanation records its rule version, input snapshot, positive evidence, negative/conflicting evidence, and rejection/qualification reasons. |
| FR-17 | Backtests and outcome estimates account for brokerage/charges, taxes where applicable, spread, slippage, latency, and conservative fill assumptions. |
| FR-18 | Outcome probabilities are shown only when supported by a defined out-of-sample evaluation and adequate sample size; otherwise show “insufficient evidence.” |
| FR-19 | The product provides a no-trade outcome when required data is stale, risk rules fail, evidence is contradictory, or the setup is not validated. |
| FR-20 | The product never guarantees profits, accuracy, target attainment, or a positive daily result. |

## 7. Data-source policy, freshness, and confidence

### 7.1 Preferred source hierarchy

| Data domain | Preferred source(s) | Intended use | Important limitation |
| --- | --- | --- | --- |
| Live stock price/volume | Angel One SmartAPI market-data feed, subject to account/API permissions and feed availability | Intraday candles, VWAP, relative volume, signal levels | Must monitor timestamps, disconnects, gaps, rate limits, and feed entitlements. |
| Official announcements | NSE/BSE corporate announcements and filings; company investor-relations releases | Company-specific event detection and source verification | Availability and publication time vary; deduplicate mirrored notices. |
| Market-wide/sector context | Authorized exchange data and licensed market-data provider where needed | Breadth, sector participation, benchmark context | Index data is contextual only in this NSE cash-equity product; licensing must be confirmed. |
| FII/FPI and DII activity | Official exchange/depository publications where available | Market-wide flow context | Generally published after the activity period; never label delayed figures as live. |
| Bulk/block deals and disclosures | Official NSE/BSE disclosures | Publicly disclosed activity context | Disclosure time and trade time may differ; not a live institutional order book. |
| Macro/regulatory events | RBI, MOSPI, Government of India and relevant regulator websites/releases | Calendar/event risk and market context | Confirm release timestamp, revisions, and the exact period covered. |
| Financial news | Licensed reputable news API/feed; vendor selection pending | Summaries, event discovery, corroboration | Licensing, attribution, retention, and redistribution rules must be reviewed before integration. |
| Historical prices | Authorized historical data from Angel One or a licensed vendor; official exchange data if permitted | Backtesting and comparable-setup analysis | Historical data must match live-market definitions and corporate-action adjustments. |

Do not assume an endpoint, historical depth, field, price entitlement, or redistribution right exists until verified against the provider's current documentation and account terms. The production source/vendor list is an explicit implementation gate.

### 7.2 Initial freshness policy (configurable, validate against provider SLAs)

- Live price/tick stream: mark **stale** when no expected update has arrived for 5 seconds during active market hours; mark **disconnected** when the session is confirmed lost. This threshold is an initial operational default, not a claim about provider guarantees.
- Derived intraday candle: display candle close time and whether the candle is complete or still forming. Do not treat an incomplete candle as a confirmed close.
- News: show publication and ingestion timestamps; label older items as context. An initial 30-minute freshness window may be used for intraday-impact ranking, while retaining older items for context when relevant.
- Official filings and macro releases: freshness is measured against the source publication time and polling success, not against an assumed real-time feed.
- FII/FPI/DII reports and bulk/block deals: display the reporting/trade period and publication timestamp; these are contextual unless genuinely intraday and source-confirmed.
- Any missing timestamp, clock skew, feed gap, parsing failure, or source outage must be visible and must lower confidence or suppress the affected analysis.

Thresholds are initial product defaults. Tune them using observed provider behaviour and record changes in configuration/version history.

### 7.3 Confidence and evidence rules

- Keep **data quality**, **news-classification confidence**, **setup quality**, and **historical outcome probability** as separate concepts. Do not merge them into a misleading single probability.
- Every score must expose its component values, rules, time window, source freshness, missing inputs, and version.
- Historical outcome probabilities require a clearly defined outcome (for example, target reached before stop within a stated time limit), sample count, date range, market-regime coverage, and out-of-sample results.
- Show “insufficient evidence” when the sample is too small, data quality fails, calibration is poor, or a rule has not passed validation. Do not fabricate a numeric confidence score.
- News impact direction is an estimate, not a fact; include contradictory news and price reaction where available.
- The UI should show a reasoned analysis, not an auto-executing BUY/SELL instruction. The final decision and execution remain manual.

## 8. Risk controls and validation requirements

### 8.1 Pre-setup risk gates

- Exclude suspended, cautionary, illiquid, or otherwise unsuitable instruments using documented eligibility rules.
- Reject a setup if feed health is stale/disconnected, required inputs are missing, or source timestamps are inconsistent.
- Define the invalidation/stop before calculating reward; calculate risk per share and estimated total risk using user-entered intended quantity when provided.
- Include estimated charges, taxes, spread, slippage, and conservative execution assumptions in reward/risk and backtest results.
- Require a configurable minimum net reward-to-risk ratio and maximum planned risk per trade; exact values remain an open decision and must not be silently hard-coded.
- Support configurable daily loss limit, maximum number of entries, cooldown after consecutive losses, and maximum exposure across simultaneously tracked manual trades. Until configured, show these as unresolved settings and do not claim risk controls are fully configured.
- Avoid new setups when market conditions are materially dislocated or an event-risk rule is triggered, unless a separately tested rule explicitly covers that condition.
- Provide **NO TRADE** as a first-class result.

### 8.2 Backtesting and paper validation

- Use chronological splits: development/training period, validation period, and untouched out-of-sample test period. No future data may leak into features or decisions.
- Use walk-forward evaluation across bullish, bearish, range-bound, and high-volatility periods.
- Simulate realistic costs, spread, slippage, delayed observations, missed fills, gaps, partial fills where relevant, and conservative handling when target and stop occur within the same candle.
- Avoid survivorship bias and account for symbol eligibility and corporate actions where data supports it. Document known gaps when it does not.
- Report trade count, win rate, average win/loss, net expectancy per trade, profit factor, maximum drawdown, loss streaks, exposure, cost sensitivity, and performance by setup, stock, sector, time of day, and market regime.
- Evaluate probability calibration when probabilities are shown; compare estimated probabilities with observed frequencies and provide uncertainty/sample-size context.
- Compare every proposed rule/model change against a fixed baseline on the same out-of-sample windows. Reject changes that only improve in-sample results or fail after costs.
- Run paper tracking with frozen rules before relying on live signals. Define a minimum paper period and sample size as a launch gate before production; values must be selected explicitly after data availability is known.
- Record strategy version, data source/version, configuration, and evaluation window for every report so results are reproducible.

## 9. Data and architecture

```text
Next.js dashboard on Vercel
  └─ authenticated, responsive user interface

Always-on worker with a fixed outbound IP
  └─ Angel One SmartAPI market-data connection, scanner, alert engine

Supabase
  └─ authentication, alerts, trades, settings, real-time updates, audit history
```

The worker is separate from Vercel because continuous market-data scanning requires a persistent connection and a fixed IP can be allowlisted with Angel One. The dashboard and worker communicate only through secure server-side interfaces and the database.

## 10. Core data entities

| Entity | Purpose |
| --- | --- |
| Instrument | Eligible NSE cash-equity stock and liquidity metadata. |
| Signal | A time-bound detected setup and its immutable planned levels. |
| Signal metric | Inputs, score components, and rule-version metadata for a signal. |
| Trade | A manually recorded position linked to an optional signal. |
| Trade leg | Entry, full exit, or partial exit event. |
| User setting | Notification, charge-estimate, risk, and display preferences. |
| Audit event | Timestamped record of signal and journal actions. |
| News/event item | Source, source/ingestion timestamps, affected entities, event type, classification, confidence, and source link. |
| Market context snapshot | Market regime, breadth, sector/relative strength, volatility, and calculation window. |
| Data-source health | Provider status, last successful update, delay/staleness state, gaps, and error metadata. |
| Strategy/rule version | Immutable version of rules, thresholds, features, and evaluation metadata. |
| Backtest run | Data period, strategy version, cost model, split type, metrics, and reproducibility metadata. |

## 11. Success measures

- Live market-data connection stays visible and data freshness is clear.
- Active alerts are delivered promptly and expire correctly.
- A manual entry or exit can be logged in under 10 seconds.
- Journal calculations are traceable and accurate.
- Historical analysis separates alert performance from actual trade performance.
- Paper tracking validates the initial strategy before relying on it for live decisions.
- Every displayed analysis identifies source timestamps and visibly distinguishes confirmed data from inferred interpretation.
- Backtest reports include costs, slippage, out-of-sample results, and enough sample context to avoid presenting noise as confidence.
- Stale/missing data and failed risk gates correctly suppress setup qualification.

## 12. Delivery phases

1. **Foundation and data contracts:** dashboard, authentication, Supabase schema, source-health model, simulated events/signals, and manual journal. Define data provenance fields before adding live feeds.
2. **Technical baseline:** historical/simulated scanner, eligibility filters, VWAP/trend/relative-volume setups, explicit rule versions, and baseline backtest with conservative costs.
3. **Market-context foundation:** ingest official company announcements and macro-event sources; add market/sector context, breadth, and transparent sentiment proxies. Validate source terms and timestamps.
4. **News and institutional context:** integrate an approved/licensed news source; add FII/FPI/DII reports and bulk/block deal disclosures with explicit reporting periods and delayed-data labels.
5. **Explainable analysis UI:** display evidence, contradictory signals, confidence components, source links, freshness, rule version, and no-trade reasons. Keep user decisions manual.
6. **Historical validation:** chronological out-of-sample and walk-forward tests, cost/slippage sensitivity, regime breakdown, and probability calibration where supported.
7. **Live market data:** fixed-IP worker plus Angel One SmartAPI market-data-only integration, feed-health monitoring, and live-vs-delayed states.
8. **Paper validation:** run frozen rules on live data without broker execution; compare expected setups with actual observable outcomes and manually journaled execution.
9. **Personal live tracking:** enable live analysis only after source reliability, risk configuration, and validation gates are met. Angel One execution remains manual.

## 13. Open decisions

- Final daily risk limits, per-trade risk, minimum net reward-to-risk, cooldowns, and maximum alert/trade caps.
- Fixed-IP hosting provider and region for the always-on worker.
- Eligibility thresholds for price, volume, spread, and intraday tradability.
- Approved licensed news and market-data vendors, retention/redistribution rights, cost, and historical-data depth.
- Final freshness thresholds based on provider behaviour and observed feed latency.
- Minimum sample-size, out-of-sample, paper-trading duration, and calibration gates required before displaying probability estimates as validated.
- Whether to include any derivatives positioning as contextual data in a later phase; no options trading is in scope.
- Default partial-exit allocation across Targets 1, 2, and trailing exit.
- Charge-estimation inputs for the trade journal.
