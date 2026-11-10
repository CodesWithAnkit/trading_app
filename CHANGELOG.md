# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No version has been tagged yet, so everything built so far is listed here, oldest work first within each section. Each line names the spec that governs it.

### Added
- Strategy engine (backend): a deterministic, side effect free pipeline that turns a strategy configuration and historical candles into verifiable signal snapshots, for simulation and calibration, with no broker execution (see spec 0001).
- Intraday Stock Tracker web app (web): the dashboard shell built to the Stitch designs, with design tokens, custom fonts, and domain components, plus the Trades, Signals, Performance, Journal, and Settings pages (see specs 0002 and 0003).
- Real API (backend + web): a NestJS backend for the API and the scanner, Supabase Postgres for signals and trades, and the Next.js app moved to `apps/web` and running against the real API (see spec 0004).
- Angel One market data (backend): a SmartAPI WebSocket feed in Quote mode, tick normalization, and 1 minute and 5 minute candle aggregation that the strategy engine runs on (see spec 0005).
- Live dashboard (backend + web): real prices, market status, candles, and signals from the Angel One feed, with honest empty and market closed states, a Markets page, a Stock Detail page, and scanner diagnostics in development (see specs 0006 and 0007).
- Multi strategy scanner (backend + web): the scanner streams every F&O stock, evaluates four strategies (VWAP, momentum, mean reversion, scalping), shows active and approaching setups, and lets you save a trade plan to the journal (see spec 0008).
- Real time updates and outcome tracking (backend + web): momentum ranking from live data, approaching setups and new signals over Server Sent Events, live exit tracking for open plans (target, stop, or time exit), an end of day reconciliation of predicted versus actual outcomes, and a day replay (see specs 0009 and 0010).
- Top bar symbol search (web): jump to any watched F&O stock or any NSE stock with live price and plan status, from the keyboard (⌘K or Ctrl+K, arrows, Esc) (see spec 0012).
- Analysis page chart (web): a candlestick chart with volume, live price updates, and entry, stop, and target lines, using TradingView Lightweight Charts (see spec 0013).
- Bulk trade actions (web): select several trades on the Trades page and act on them together from a floating action bar (see spec 0014).
- AI stock predictions (backend + web): predictions from Gemini with Alpha Vantage data (see spec 0015).
- Deployment setup (backend + web): a Dockerfile and a Render blueprint for the backend, with the web app set up for Vercel (see spec 0016).
- Market intelligence and explainable analysis (backend + web): market breadth and regime, sector relative strength, news and filings, delayed institutional context, and an analysis card that weighs supporting evidence against contradicting factors and runs six deterministic risk gates (see specs 0017 and 0018).
- Mobile views (web): the Stitch mobile design across the app shell and the five bottom navigation tabs, with stacked position cards, a sector heat grid, and a pre trade discipline gate (see spec 0019).
- Guru strategy backtest lab (backend + web, admin only): five guru intraday rules tested on NIFTY and SENSEX 5 minute history with a versioned cost model, against buy and hold and coin toss baselines, with a pass or fail gate, an out of sample leaderboard, equity curves, per year results, and a trades drawer (see spec 0020).
- Sign in and access control (backend + web): invite only Supabase email and password sign in, password reset and sign out, a verified bearer token on every API call, ticket based access to the live stream, and an admin role for admin only areas such as the backtest lab (see spec 0021).
- Backtest history provider (backend): a pluggable history source (Angel One or Kite Connect) with resumable chunked backfill, a clear message when Angel One rejects historical calls, and gate judging on NIFTY alone when SENSEX history is missing (see spec 0022).
- Live guru signals (backend + web): an admin can switch on, per rule and symbol, only the guru rules whose latest backtest passed the gate; they then emit normal signal cards on closed bars, and a rule whose newer run fails is blocked automatically. No automatic orders (see spec 0023).
- A sector alpha table on the Market Intelligence page, and a daily cache for the large Angel One instrument master file.
- A migration runner script for the Supabase migrations.
- Real news ingestion for the News page: items from NSE and BSE exchange RSS feeds, ET Markets and Moneycontrol RSS, and Alpha Vantage, each mapped to a watched F&O symbol or kept as market wide (`MARKET`), stored once, and classified by keyword rules, then Gemini (capped at 200 calls a day), then a Low / Neutral default. Each item shows how it was classified and links to its source (see spec 0024).
- Admin controls for news fetching: Fetch now (with a 60 second cooldown), Cancel a running fetch, and Pause or Resume the weekday schedule, which is saved across restarts. Every user sees the last fetch result and a "Schedule paused" state (see spec 0024).
- A scheduled news fetch every 5 minutes from 08:30 to 16:00 IST on weekdays, plus a daily prune that keeps HIGH impact items for good (see specs 0024 and 0025).
- A news gate on every live signal (scanner stocks and guru index signals). Each new signal gets an entry verdict (pass, warn, or blocked) from news published in the 60 minutes before it fires, and a separate "after entry" verdict when blocking or warning news arrives while the signal is still active. Verdicts are stored on the signal and pushed live (see spec 0025).
- Signal card badges: "Blocked by news", "News warning", and "News after entry", with the deciding headlines linked to their sources and "Market wide news" for macro items (see spec 0025).
- A "with and without the news gate" comparison on each backtest run, over trades on days with news coverage only, with a warning when there are fewer than 30 such trades (`GET /api/v1/backtest/runs/:id/news-comparison`, admin only; see spec 0025).
- NIFTY 50 and India VIX on the Market Intelligence page from the live Angel One feed, including the VIX day range (see spec 0026).
- The last real market reading of the day is saved every minute while the feed is live and shown with its time ("As of 15:29 IST") when ticks stop or the backend restarts (see spec 0026).
- The Data Provenance Registry on the Market Intelligence page now shows real state: feed status and last tick, the last news fetch result, and institutional data as "Not connected" (see spec 0026).

### Changed
- NSE and BSE news is read only from official exchange RSS feeds set in config (`NEWS_NSE_FEED_URLS`, `NEWS_BSE_FEED_URLS`). Every news request sends only an honest `User-Agent` and an XML `Accept` header; a feed that refuses a plain request is recorded as skipped, not as an error, and is left alone for 6 hours. Exchange feeds stay off until URLs are configured (see spec 0024).
- Alpha Vantage news is off until `NEWS_ALPHAVANTAGE_ENABLED=true` is set; enabled without a key or without premium access it shows as skipped (see spec 0024).
- News symbol matching now uses a committed company names file (`apps/backend/src/intelligence/news/company-names.json`), which starts empty (see spec 0024).
- Gate 06 on the analysis page now uses the same news gate as live signals: blocking news is a FAIL, warning news or an unreadable news check is a WARNING (see spec 0025).
- The analysis page's Gate 03 is computed from the symbol's real 5 minute candles (distance from the 20 EMA in ATR units) and reads WARNING "Insufficient candles" with fewer than 20. Evidence lines now use real sector and EMA values; lines with no real source are removed (see spec 0026).
- The News & Regulatory Filings panel on the Market Intelligence page shows the latest stored news instead of fixed sample items (see spec 0024).

### Removed
- The seed and sample news items, including the fake "risk embargo" banner on the Market Intelligence page (see specs 0024 and 0026).
- The scraped NSE and BSE website announcement adapters, and the news rows they stored (see spec 0024).
- Every sample market number on the Market Intelligence page and the dashboard regime strip (NIFTY, VIX, breadth, regime, sectors). A missing value now shows a dash and "No live data" (see spec 0026).
- The sample FII/DII flows and bulk deals. The institutional card now says "No institutional flow source connected" until a real source is added (see spec 0026).

### Fixed
- The watched stock universe for news mapping no longer fails silently on a missing column and falls back to the full F&O list (see spec 0024).
- Feed items older than the lookback (1 day on a scheduled fetch, 2 days on a manual one) are no longer stored, classified, or pushed (see spec 0024).
- A news feed's `ETag` is saved only after its items are stored, so a failed store no longer hides those items on the next fetch (see spec 0024).
- A fetch run whose setup fails is closed as failed straight away instead of staying "running" for 10 minutes (see spec 0024).
- The dashboard no longer crashes when the market regime is unknown (see spec 0026).
- India VIX and NIFTY index ticks are no longer counted as stocks in market breadth (see spec 0026).
