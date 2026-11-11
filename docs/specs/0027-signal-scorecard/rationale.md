# 0027. Signal Scorecard: rationale

## Context

The scanner and the guru live engine fire trade plans every session, and the 15:32 IST reconcile job (spec 0009) writes a deterministic WON, LOST or NEUTRAL outcome and a percent P&L onto each signal. Nothing turns those outcomes into a judgment about which strategies earn their keep. The Performance page is entirely mock data, so today there is no way to say, with numbers, that a strategy has an edge.

Several forces shape this. Percent P&L is not comparable across setups with different stop distances, so results must be expressed in R (multiples of planned risk). Intraday edges are small, so trading costs can erase them, and a gross only view would mislead. Samples are small for a single trader, so any number without its sample size invites acting on noise. Finally, the grouping keys the scope asks for (strategy, regime) are not stored on signals: strategy is implied by `setup_family` or guru snapshot data, and regime lives in separate snapshot tables.

The app is decision support for one trader (spec 0021 access control, multi user deferred). Volume is hundreds to low thousands of reconciled signals per year. If this isn't decided, the next slice (risk limits, paper trading, regime filters) is built on unmeasured strategies.

## Options considered

### Option 1: Aggregate on read with keys derived at query time

Compute everything in the API from existing columns: map `setup_family` and the guru snapshot to a strategy in code, and join each signal to the nearest `market_context_snapshots` row on every request.

**Pros**:
- No migration at all; fastest to start.
- Always fresh.

**Cons**:
- The strategy mapping lives in code and drifts as strategies are renamed or added.
- The nearest snapshot lookup per signal on every request is slower and can give a different regime if snapshots are later backfilled, which breaks "same rows, same numbers".
- There is no strategy version to filter on.

### Option 2: Stamp grouping keys on signals, aggregate on read (chosen)

Add `strategy_id`, `strategy_version` and `market_regime` to `signals`, stamped at insert and backfilled once. Aggregate per request in a pure TS function.

**Pros**:
- The grouping keys are fixed at decision time, so results are reproducible and reflect what was known at entry.
- The aggregation is one pure, unit testable function. Freshness is free.
- The keys are reusable by Regime Strategy Filters and Journal Tags.

**Cons**:
- Needs a migration plus changes in two insert paths.
- Backfilled regime for old signals is approximate.

### Option 3: Postgres view or RPC doing the GROUP BY

Push the aggregation into SQL, returning ready made rows per cut.

**Pros**:
- Scales to far larger volumes; less data crosses the wire.

**Cons**:
- R, cost R and bucket logic split between SQL and TS (`referenceEntryOf`/`stopOf` already live in TS), so two sources of truth for the math.
- Harder to unit test, and no measured performance need at this volume.

### Option 4: Nightly materialized scorecard table

After reconcile, precompute all cuts into a table that the page reads.

**Pros**:
- Fastest reads.

**Cons**:
- Stored derived values go stale and need recomputing whenever settings (min sample, risk budget) or filters change. Arbitrary date range filters make precomputing impractical.
- Another scheduled job to operate and debug.

## Rationale

Option 2 wins because the force that matters most is trust: the scope requires that "numbers match the reconciled signal outcomes", and you want to judge a strategy by what was known when it fired. Stamping strategy and regime at insert fixes those keys at decision time and makes every rerun identical, which Option 1 cannot guarantee. Keeping the math in one TS function next to the existing `referenceEntryOf`/`stopOf` helpers avoids the split logic of Option 3. At this volume, reading on demand costs milliseconds, so the precomputation of Option 4 buys nothing and adds staleness.

The metric choices follow the same idea. Reconciled outcomes only (not live exits) because they are deterministic and rerunnable. NEUTRAL trades count with their real R because a flat trade still used a slot and risk. Expectancy is net of costs because intraday edges are thin. Costs use the per signal `estimated_charges` where an evidence row exists, as you asked, with a ₹20 fallback (the column's own default) and a visible coverage share so the estimate is never hidden. Converting rupees to R needs a quantity, and sizing from `risk_budget` matches how Position Sizing will work, so the scorecard and the coming risk engine speak the same units.

The minimum sample is configurable (default 30, the common rule of thumb where win rate and expectancy start to settle), stored as a typed, checked column rather than in the untyped `display_preferences` JSON.
