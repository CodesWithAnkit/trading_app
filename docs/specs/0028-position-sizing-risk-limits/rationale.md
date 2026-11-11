# 0028. Position sizing and risk limits: rationale

## Context

Signals arrive with entry, stop and target, but no size. The Settings page shows risk controls (max daily loss, max concurrent trades, single trade risk) that are page state only and enforce nothing. The journal records trades without quantity, direction or exit, so the app cannot know how much you lost today. The result: sizing happens in your head, and nothing stops a losing streak from compounding.

Forces: the app is decision support for one trader, and orders are always placed by hand at the broker, so the app can only advise. Limits must reflect what you actually traded, not every signal fired. Verdicts go stale fast: taking or closing a trade changes the room for every other signal. Intraday tight stops can produce position sizes larger than your capital can carry.

## Options considered

### Option 1: Compute in the browser

The web app already holds settings and could load the journal; it computes qty and skip reasons per card.

**Pros**:
- Instant updates when you edit the journal in the same tab; no new backend code.

**Cons**:
- Rules live only in the browser; future Signal Alerts (sent from the backend) could not reuse them.
- Harder to test and easy to drift between pages.

### Option 2: Backend RiskService on read plus change push (chosen)

A pure sizing function in NestJS, fed by a per user context, attached to every signal response and SSE payload, with `risk:changed` pushed after journal or settings writes.

**Pros**:
- One source of truth, reusable by alerts and the paper ledger; pure function is easy to unit test.
- Always reflects the latest journal state.

**Cons**:
- Signal reads now depend on the user; the SSE broadcast needs per user risk.
- An extra event type and refetch path on the web.

### Option 3: Stamp the verdict on the signal at insert

Compute size once when the signal fires and store it.

**Pros**:
- Simplest read path; a historical record of the advice.

**Cons**:
- Stale as soon as you take another trade or hit the limit, which is exactly when it matters.
- Signals are global but limits are per user.

## Rationale

Option 2 wins because the verdict must be both shared across surfaces and fresh. Freshness rules out Option 3: the daily room changes with every trade you close. Reuse rules out Option 1: Signal Alerts and the Paper Trading Ledger will need the same "take N or skip" logic from the backend. Keeping `sizeSignal` pure keeps the hard part testable, and the RiskService is a thin context loader.

Counting open risk with realized loss (rather than realized only) stops the classic failure where three open trades all stop out and blow through the limit. Shrinking qty to fit the remaining room, instead of skipping outright, keeps a usable trade when room is partial, while still never exceeding the limit. Measuring loss in real rupees from the journal (your pick) is heavier to enter but is the only version that matches your actual account.
