# 0020 Rationale: Guru Strategy Backtest Lab

## Context

A video ("5 Trading Gurus vs Claude AI") tested five rules from popular Indian trading YouTubers on gold and US index data. Every rule fell well short of its claim once costs were included. You want to repeat this honestly on the markets you actually trade (Nifty and Sensex), and only let a rule into the live scanner if it earns its place.

Three things make this harder than it looks. First, the rules are stated vaguely ("rising", "small candle", "pin bar"), so if the definitions aren't pinned down before testing, they get tuned afterwards to fit the data (overfitting). Second, the `candles` table only holds what the live feed captured, which is a few weeks, far too short to judge anything. Third, there is no authorization in the app today, yet this feature must be admin only.

If you skip the lab and just wire the rules in live, the scanner fills up with signals that have no measured edge, sitting next to signals from the existing engine. That undermines trust in all of them.

## Options considered

### Option 1: Pine Script on TradingView, as in the video

Ask Claude to write Pine Script, then read TradingView's strategy tester.

**Pros**: no code in this repo, and you get a visual chart straight away.
**Cons**: the free plan only has a few months of history, results live outside the app, and the rule logic can't be reused for live signals in your engine.

### Option 2: In process backtest module in NestJS, sharing rule functions with the live engine (chosen)

**Pros**: uses the data, broker and engine you already have. One rule definition serves both the backtest and live. Results are stored and auditable.
**Cons**: runs share CPU with the scanner, and you need a historical backfill.

### Option 3: Separate Python research service (vectorbt or backtrader)

**Pros**: mature backtest libraries and fast vectorised runs.
**Cons**: adds a second language and service to deploy and operate, and the rules would be duplicated in TypeScript for live, so they could drift apart.

## Rationale

Option 2 wins because the deciding force is that the rule which passes must be identical to the rule that runs live. Only a shared TypeScript function guarantees that. The data volume (two symbols, a few hundred thousand bars) is small enough for a plain loop in Node. A separate service would be premature.

A pre-registered definitions table, a fixed 70/30 split, and gate constants in code are there to stop the most likely failure: rules quietly being tuned on the same data they are judged on. The coin toss baseline puts that risk in front of you, because any rule that can't beat it after costs has no edge.

Admin auth reuses Supabase's `app_metadata` instead of a new roles table. This is a single user app today, and `app_metadata` can't be edited by the user themselves, so it is safe as the source of truth for the role.
