# Market Data Feed

This area turns the Angel One SmartAPI WebSocket feed into normalized ticks and completed 1m and 5m candles for `ScannerService`.

- **Files:**
  - `types.ts`: the `MarketDataProvider` interface, `MarketTick`, `Candle`, and `FeedHealth`. Code outside this folder depends on these types, not on a concrete provider.
  - `AngelOneMarketDataProvider.ts`: TOTP login, WebSocket V2 connection, subscriptions, and feed health. Reconnects with exponential backoff and re-applies stored subscriptions after a reconnect.
  - `TickNormalizer.ts`: maps a raw SmartAPI tick to `MarketTick`. String prices arrive scaled by 100. Invalid ticks return `null`.
  - `CandleAggregator.ts`: builds 1m and 5m candles per symbol and fires `on1mComplete` / `on5mComplete` when a tick crosses into the next interval. Late ticks for a past interval are dropped.

- **Conventions:**
  - A new data source implements `MarketDataProvider`; `ScannerService` picks it with `MARKET_DATA_PROVIDER` (`angelone` or `mock`).
  - With `MARKET_DATA_PROVIDER=angelone`, missing `ANGEL_ONE_*` credentials make the backend exit on startup (fail fast).
  - No strategy logic here. Indicators and setups live in `../strategy/`.

- **Commands** (from `apps/backend`):
  - `npm run scanner:angelone:smoke`: connect with real credentials and print live ticks and 1m candles.
  - `npx vitest run src/scanner/market-data`: unit tests for this area.

- **Spec:** [0005 Angel One Market Data](../../../../../docs/specs/0005-angel-one-market-data/index.md).

_Drafted by /sync from the introducing change, worth a quick human pass._
