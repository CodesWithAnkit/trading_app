# 0022 Rationale: Backtest History Provider

## Context

Spec 0020 assumed the existing Angel One SmartAPI account could serve historical candles. In practice (verified 2026-11-08 from a whitelisted IP, raw REST, same session): login and `getProfile` succeed, while `getCandleData` returns `AG8004 Invalid API Key` for both an index token and a stock token. The portal shows a single key of type "Trading". Angel One publishes no explanation, and forum users report the same symptom with no admin answer ([research note](../../research/historical_index_data_sources.md)).

The gate in 0020 needs at least 2 full out of sample calendar years. With the 70/30 split that needs roughly 7 or more years of 5 minute history. Of the sources checked, only Kite Connect is reported to carry 5 minute NIFTY 50 history back to about 2015. Dhan and Fyers Prime give about 5 years, and Upstox 5 minute data starts in 2022. Kite needs a Zerodha trading account, which you don't have yet. You plan to open one. Kite access tokens expire daily and are issued through a browser login.

## Rationale

The backfill in 0020 already writes provider neutral rows through a `CandleFetcher` function, so swapping sources is a small, contained change. Making it pluggable avoids betting on one vendor: Angel One is free and already wired, Kite is the only verified ten year source. Paying ₹500 for a single month is the cheapest way to get enough history for the gate to mean anything. Five year sources (Dhan, Fyers) would force weakening the gate, which defeats the purpose of pre-registration. A NIFTY only fallback keeps the lab useful and honest if SENSEX is missing, rather than permanently blocked.

Options considered: keep Angel One only (free, but blocked indefinitely on an unexplained error); switch to Dhan (about 5 years, so the gate split must change); Fyers Prime (price unlisted, 5 or more years); Kite one month (chosen). See the research note for sources.
