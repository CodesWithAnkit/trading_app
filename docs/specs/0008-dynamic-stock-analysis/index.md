---
status: Accepted
date: 2026-09-29
---

# Dynamic Stock Analysis and Multi-Strategy Engine

## Summary
Implements a dynamic market scanner that automatically selects top bullish stocks (the stock universe is defined in [spec 0009](../0009-real-stock-analysis/index.md), AC-1 and AC-12 to AC-15) without relying on a predefined hardcoded list. The backend Strategy Engine will concurrently evaluate these stocks against four specific intraday trading strategies derived from our deep research (VWAP, Momentum/Breakout, Mean-Reversion, and Scalping). The engine will automatically generate precise Trade Plans (Entry, Stop Loss, Target), surfacing the best active or "approaching" setups to the UI, allowing the user to easily save them to a Manual Journal.

## Requirements
- **AC-1**: On startup or market open, the backend builds a dynamic universe of stocks to monitor instead of relying only on a static list. The universe is defined in [spec 0009](../0009-real-stock-analysis/index.md) (Angel One F&O price gainers mapped to cash stocks, top gainers only).
- **AC-2**: The `ScannerService` subscribes to the live tick stream for this dynamic universe.
- **AC-3**: The `StrategyEngine` evaluates four concurrent strategies for each tick/candle: Momentum/Breakout, Mean-Reversion, Scalping, and VWAP Breakout/Pullback.
- **AC-4**: The Engine calculates exact Trade Plan levels (Entry, Stop, Target) based on the quantitative rules defined in the research doc.
- **AC-5**: If no strategy strictly triggers a signal, the Engine identifies and emits "approaching" setups (e.g., price is 1% away from VWAP breakout) to ensure the UI remains active.
- **AC-6**: The Dashboard UI surfaces the highest-confidence active or approaching setups as the "Top Bullish Stocks."
- **AC-7**: Users can click any stock in the "Top Bullish" list to open a detailed **Stock Analysis Page**.
- **AC-8**: The Stock Analysis Page must visually display the matched **Strategy Rules** (e.g. "RSI < 30", "Close > VWAP") and the auto-generated **Trade Plan** (Entry, Target, Stop Loss) on a chart or card.
- **AC-9**: The Trade Plan UI contains a "Save to Journal" action, allowing users to log the setup into their Manual Journal.
- **AC-10**: A dedicated **Manual Journal Page** displays a data table of all saved setups (Pending, Won, Lost) with the user's personal notes.

## Decision
We are building this feature entirely on the existing stack (Next.js frontend, NestJS backend, Supabase persistence). 

**Data Model**
1. **`TradeSetup` (In-Memory / API Response)**
   - `symbol` (string)
   - `strategy_name` (string: e.g. "VWAP Breakout")
   - `signal_type` (string: "BUY" | "SELL" | "APPROACHING")
   - `entry_price` (number)
   - `stop_price` (number)
   - `target_price` (number)
   - `confidence_score` (number: 0-100)
2. **`JournalEntry` (Supabase DB)**
   - `id` (uuid, pk)
   - `user_id` (uuid, fk)
   - `symbol` (string)
   - `strategy_name` (string)
   - `entry_price` (number)
   - `stop_price` (number)
   - `target_price` (number)
   - `status` (string: PENDING, WON, LOST, CANCELLED)
   - `notes` (text)

**API Surface**
- `GET /api/v1/scanner/top-setups`: Returns a ranked list of `TradeSetup` objects, sorted by `confidence_score`.
- `POST /api/v1/journal`: Accepts a `TradeSetup` and persists it as a `JournalEntry`.
- `GET /api/v1/journal`: Fetches the user's manual journal entries.

## Build plan
1. **Database Migration** (Backend)
   - Create the `journal_entries` table in Supabase with RLS policies mapping to the `JournalEntry` schema.
2. **Dynamic Instrument Discovery** (Backend)
   - Update `ScannerService.onModuleInit` to build the dynamic universe described in [spec 0009](../0009-real-stock-analysis/index.md) instead of the static `.env` `SCANNER_INSTRUMENTS` list, which is no longer used.
3. **Multi-Strategy Implementation** (Backend)
   - Implement the `StrategyEngine` with individual evaluators for each of the 8 rules defined in the deep research:
     - **Momentum/Breakout**: Buy if price > OpenRangeHigh & volume > AvgVolume*1.2. Stop: ORLow. Target: 1:1 or 2:1 RR.
     - **Mean-Reversion (Bollinger + RSI)**: Buy if price < LowerBand & RSI(14) < 30. Stop: Below LowerBand. Target: 20 SMA.
     - **Scalping**: Buy if trend is UP & 1m close > 9-EMA & volume spikes. Stop: 10 ticks. Target: 1:1 RR.
     - **VWAP Trend**: Buy if close > VWAP & prev_close <= VWAP. Stop: VWAP. Target: Fixed R:R.
     - **Gap-and-Go**: Buy if gap >= 4% at 09:30 & 1m high > PreMarketHigh. Stop: 1m low.
     - **MA Crossover**: Buy if 9-EMA crosses above 21-EMA. Stop: 1 ATR. Target: 1 ATR.
     - **Oscillator Thresholds**: Buy if RSI(14) crosses back above 30. Sell if crosses below 70.
     - **Volume Profile**: Buy on pullback to Point of Control (POC) in uptrend. Stop: Below Value Area Low.
   - Add proximity logic to return `APPROACHING` setups for stocks within ~0.5% - 1% of the exact trigger conditions.
4. **API Endpoints** (Backend)
   - Implement `GET /top-setups` and the `journal` POST/GET controllers.
5. **Dashboard UI Integration** (Frontend)
   - **Market Scanner Section**: Update the Dashboard page to poll `/top-setups`. Replace static stock lists with a "Top Bullish" dynamic data grid showing symbol, matched strategy, and confidence score.
6. **Stock Analysis & Trade Plan UI** (Frontend)
   - **Stock Analysis Page (`/dashboard/analysis/[symbol]`)**: Create a new dynamic route.
   - **Strategy Card**: Display the exact rules that triggered (e.g., "Gap >= 4% and 1m High Broken").
   - **Trade Plan Component**: Render the Entry, Target, and Stop Loss prices explicitly. Include a "Save Setup" button.
7. **Manual Journal UI** (Frontend)
   - **Journal Page (`/dashboard/journal`)**: Create a new route.
   - **Journal Data Table**: Display saved `JournalEntry` records, allowing users to edit the `status` (Won/Lost) and `notes` field.

## Consequences
- **Performance**: Subscribing to 50+ stocks dynamically and evaluating 4 strategies on every 1-second tick will increase CPU load on the backend compared to the static 5-stock mock. The event loop must remain unblocked.
- **Data Completeness**: VWAP calculation requires accumulating tick volume over the entire trading session. The backend must start before market open to build an accurate VWAP, or fetch historical intraday volume data on startup.

## Follow-up
- We may need to optimize the candlestick aggregation if 50+ instruments cause lag in the NestJS event loop.
- Historical intraday data fetching (to populate moving averages and VWAP instantly upon restart) will be required for seamless intra-day deployments.

## Rationale
(basis: docs/deep_research_intraday)
By moving the Trade Plan generation entirely to the backend, we ensure the strategy rules (defined strictly in the deep research) are executed uniformly without client-side calculation discrepancies. Showing "approaching" setups guarantees that users won't stare at an empty dashboard during choppy mid-day markets. Reusing the existing stack prevents introducing a heavy time-series database before we prove product-market fit with the logic.
