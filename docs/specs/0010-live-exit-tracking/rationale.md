# Rationale · 0010 Live exit tracking

## Context

Spec 0009 builds the signals: entry price, stop, and target from the multi strategy engine, saved to `signals` and pushed over the live stream. After that, the scanner never looks at a signal again: its `status` stays `ACTIVE` all day. Whether it hit its target or stop is only worked out after the close, by the 15:32 reconciliation. The strategy code has a `lifecycle.ts`, but the live scanner never uses it. The scanner can also fire the same setup again on every 5m close while the first plan is still open, which creates duplicate signals. Intraday positions must be flat before the close, and there is no rule for plans still open late in the day.

Constraints: plans are LONG only today (no strategy produces SHORT yet); the feed delivers Quote mode ticks for about 230 F&O stocks (spec 0009); the backend can restart during the session; and the web app already receives live events over SSE.

## Options considered

### Option 1: Check every tick (chosen)
- Pros: the alert fires the moment the price touches the level, which is when a trader would actually exit.
- Cons: a single spike tick can trigger an exit the candle close would not confirm.

### Option 2: Check on the 1 minute candle close
- Pros: filters single tick spikes.
- Cons: up to a minute late, and a fast move can blow past the stop before the alert.

### Option 3: Check the candle high and low (the end of day rule)
- Pros: matches the 15:32 reconciliation exactly.
- Cons: alerts only arrive at the candle close; it is an audit rule, not a live one.

The dedupe rule had two candidates: per stock and strategy (chosen), or one open plan per stock regardless of strategy. The first keeps a second strategy's confirmation visible. The alert channel had two: an in app toast plus card state (chosen), or also browser notifications with sound. The first needs no browser permission; notifications are a follow-up.

## Rationale

Every tick matches how a trader actually exits: a stop is a price, not a candle. The engineer chose it, and the spike risk is acceptable because the reconciliation still records the candle based result for comparison.

The 15:15 exit leaves 15 minutes to square off before the broker's own auto square off near the close.

Keeping the plan index in memory, with the database as the record, makes the per tick check cheap for about 230 streams. The conditional update (`where status = 'ACTIVE'`) makes the database the guard against double exits after a restart or a race.

Per stock and strategy dedupe follows the engineer's request and keeps confirmations from other strategies visible.

The runner ups were candle close checking (fewer false alarms, but late) and one plan per stock (cleaner, but hides confirmations).
