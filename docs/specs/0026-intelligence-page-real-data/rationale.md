# 0026. Rationale

## Context

The intelligence page was built under spec 0017 with sample values so it would look complete before every source existed. Those samples are still the fallback. `market-breadth.service.ts` hardcodes NIFTY 24845.60, change 0.85, VIX 13.42 and change -3.8 even when ticks are live, and uses a 142 / 56 / 32 baseline when ticks are cold. `institutional-context.service.ts` returns `SEED_INSTITUTIONAL_FLOW` and `SEED_BULK_DEALS`. `explainable-analysis.service.ts` always passes Gate 03 at "0.82 ATR Distance" and prints evidence such as "RVOL 2.85x" and CVD divergence with no calculation behind them. The web page adds its own fallbacks and a provenance block that is pure text.

On a trading screen a plausible fake number is worse than a blank, because it looks like a reason to trade. The feed already exists, the instrument file already lists the index tokens, and `market_context_snapshots`, `feed_health` and `news_fetch_runs` already exist, so most real sources are close at hand. The only value with no acceptable source today is institutional flow: the free sources are NSE website reports, which carry the same scraping concerns already rejected for news.

## Options considered

### Option 1: Fix in place on the existing feed and snapshot table
Subscribe the index tokens, persist context to `market_context_snapshots`, remove samples.
**Pros**: no new infrastructure; reuses tables and calculators that exist; small blast radius.
**Cons**: the scanner gains index ticks that must be kept out of breadth.

### Option 2: Separate index quote polling over the SmartAPI REST quote endpoint
**Pros**: keeps index data out of the tick pipeline.
**Cons**: a second data path, rate limits, and polling lag for values the socket already streams.

### Option 3: Keep last values in memory only
**Pros**: no migration.
**Cons**: a restart mid session blanks the page until the next tick, and outside hours nothing shows.

### Option 4: Label samples as "sample" instead of removing them
**Pros**: least work.
**Cons**: still fake numbers on a trading screen; rejected by the engineer's rule.

## Rationale

Option 1 wins because every piece already exists: the provider supports additive subscription and replays on reconnect, the indicators module has `ema` and `wilderAtr`, the features module has `calculateRvol`, and the snapshot table has breadth and sector columns waiting for writes. Adding nullable columns is a safe migration and gives restart survival, which beats memory only (Option 3) at very low cost.

For the open calls: the provenance block stays because its three sources are real and it builds trust; evidence lines without a calculator are removed rather than tagged, because a tagged guess still reads as evidence; the 18.00 VIX text goes because nothing gates on it, while the 16 and 22 bands are what the code uses. Gate 06 is left to spec 0025 to avoid two specs owning one gate.
