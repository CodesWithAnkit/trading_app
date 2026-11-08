# Historical NIFTY 50 / SENSEX Index Data Sources for Backtesting

**Date**: 2026-11-08  
**Topic**: Why Angel One `getCandleData` returns `AG8004 Invalid API Key`, and which API can bulk-backfill multi-year 5-minute bars for NIFTY 50 (NSE) and SENSEX (BSE).

Items marked **unverified** could not be confirmed from a primary source during this research. Re-check them before building on them.

---

## 1. Summary

- Angel One's `AG8004` on `getCandleData` has **no official explanation** in anything I could fetch. Forum threads show it happening to users whose login and `getProfile` work, which matches your symptom. Admins have not answered in the visible threads.
- Angel One's official per-interval day limits and 5m index depth are **not published** in the pages I could read. Forum users report a **500-candle cap per request** (unofficial).
- Best fit for a bulk multi-year 5m backfill: **Zerodha Kite Connect** (Connect plan, ₹500 per app per month, historical data included). Subscribe for one month, backfill into Postgres, then cancel or keep.
- Fallbacks: fix the Angel key through a SmartAPI forum ticket, or **Dhan** (5 years of intraday, 90 days per request, index coverage unverified).
- Free sources do not give multi-year 5m index history. Yahoo is about 60 days for 5m. Bhavcopy is daily only.

---

## 2. Angel One SmartAPI

### 2.1 What causes AG8004 on getCandleData

| Finding | Source |
|---|---|
| Login returns a JWT, but `getCandleData` and `getLtpData` return AG8004. No answer given. Thread is flagged deleted for non-privileged viewers. | [forum post 19141](https://smartapi.angelone.in/smartapi/forum/post/19141) |
| Keys made through the "New Login" flow return AG8004. A key made through the older "Login" page still worked for one user. | [forum post 18969](https://smartapi.angelone.in/smartapi/forum/post/18969) |
| A user with a "Trading" key was told to create a separate historical app and could not find how. Another could not register a data-only key without a static IP. A third said any IP works for a data-only key. These reports conflict. | [forum post 18969](https://smartapi.angelone.in/smartapi/forum/post/18969) |
| Further users report invalid-key errors on fresh keys. | [forum thread](https://smartapi.angelone.in/smartapi/forum/uid/8803) |

Conclusions:
- Whether a separate "Historical Data API" app type exists today is **unverified**. Forum users imply it did exist. I found no official doc describing how to create one.
- Whether static IP applies to data APIs is **unverified** and the forum reports conflict. Your key already works from a whitelisted IP, so IP is unlikely to be the cause.
- Most likely causes, all **unverified**: an app-type or key-generation mismatch on the new flow, or a server-side defect. Action: raise a ticket on the [SmartAPI forum](https://smartapi.angelone.in/smartapi/forum) with the client ID and the API key's last four characters. Ask for a historical-enabled key. Try creating a second app of the other type and test it.

### 2.2 Limits (from forum, not official docs)

- Rate limit table: `getCandleData` 3 per second, 180 per minute, 5,000 per hour, per [forum post 19181](https://smartapi.angelone.in/smartapi/forum/post/19181) quoting the official rate-limit announcement.
- Reports of a 500-candle maximum per request, including 5m: [forum post 10902](https://smartapi.angelone.in/smartapi/forum/post/10902). Unofficial.
- Per-interval max days and 5m index depth: **unverified**. The official page [smartapi.angelone.in/docs/Historical](https://smartapi.angelone.in/docs/Historical) did not render content for me.
- Cost: SmartAPI is free for Angel One clients. **Unverified** from a primary source in this research.

---

## 3. Alternatives

### 3.1 Zerodha Kite Connect

- Cost: Personal API is free but has "no historical or real-time data". The Connect plan is ₹500 per app per month and includes historical candles. From October 2026, paid users with at least ₹2,000 monthly brokerage get 500 Developer Credits toward renewal. [Zerodha support](https://support.zerodha.com/category/trading-and-markets/kite-api/articles/what-are-the-charges-for-kite-apis)
- Intervals: `minute`, `3minute`, `5minute`, `10minute`, `15minute`, `30minute`, `60minute`, `day`. Per-request day cap and depth are not stated on the page ("back several years"). [Kite docs](https://kite.trade/docs/connect/v3/historical/)
- Index coverage: the `instrument_token` comes from the instruments list. A forum thread titled "Trying to fetch NIFTY 50 historical data (5m timeframe), but nothing comes from before 09/01/2015" suggests 5m NIFTY 50 history starts in January 2015. [forum](https://kite.trade/forum/discussion/13428/trying-to-fetch-nifty-50-historical-data-5m-timeframe-but-nothing-comes-from-before-09-01-2015) This is a user report. SENSEX (BSE index) availability is **unverified**.
- Rate limits, daily login with TOTP, static IP rules: **unverified** here. Kite access tokens are generally refreshed daily. Confirm in the docs.
- Node SDK: official `kiteconnect` npm package (**unverified** in this pass).

### 3.2 Upstox API v3

- Minutes: available from January 2022 only. 1 to 15 min intervals are capped at 1 month per request. Days: from January 2000, 1 decade per request. [Upstox docs](http://upstox.com/developer/api-documentation/v3/get-historical-candle-data/)
- Auth: `Authorization: Bearer <access_token>`. NIFTY 50 and SENSEX index keys are not confirmed on that page. Cost and static IP: **unverified**.
- Verdict: 5m depth of about 4 years fails the 2015+ goal. Fine for daily bars.

### 3.3 Fyers API v3

- Standard plan is free: intraday history is 1 year rolling, daily 5 years. Prime (paid, price not listed) gives intraday 5+ years and daily 25+ years. Data API limits: Standard 5 per second, 50 per minute, 5,000 per day. Prime 10 per second, 500 per minute, 500,000 per day. Exceeding the per-minute limit more than 3 times in a day blocks you until the next day. [Plans and limits](https://fyers.in/api-docs/v3/getting-started/plans-and-limits/)
- Index symbols, per-request day cap, static IP: **unverified**. Official docs are at [fyers.in/api-docs/v3](https://fyers.in/api-docs/v3/getting-started/).

### 3.4 Dhan HQ API

- Intraday endpoint `POST https://api.dhan.co/v2/charts/intraday`. Intervals 1, 5, 15, 25, 60 min. 90 days per request. History goes back 5 years. Auth is an `access-token` JWT header. [Dhan docs](https://dhanhq.co/docs/v2/historical-data/)
- The page says data exists for "all exchanges and segments for all active instruments". NIFTY and SENSEX index coverage is therefore likely but **unverified**.
- Data API rate limit: 5 per second, 100,000 per day. [Dhan docs](https://dhanhq.co/docs/v2/)
- Data API cost, token lifetime, static IP: **unverified**.
- Verdict: about 5 years of 5m data (roughly 2021 onward). Not 2015.

### 3.5 TrueData

- Provides NSE Indices data. Pricing is quote-based by segment and symbol count, with a trial. [TrueData](https://feedback.truedata.in/knowledge-base/article/getting-started-with-truedata-market-data-api)
- Official Python package shows REST historical bars. A 5m historical option and depth are **unverified**. No official Node SDK was found. Contact support@truedata.in.

### 3.6 Not confirmed (excluded)

ICICI Breeze, 5paisa, Kotak Neo, Global Datafeeds: I did not fetch a primary source confirming index 5m history depth, so they are left out per the brief. Check each vendor's docs if the fallbacks fail.

### 3.7 Free sources

- **Yahoo Finance (`^NSEI`, `^BSESN`)**: 5m is capped to the last 60 days, 1m to about 7 days. Evidence is a [yfinance issue](https://github.com/ranaroussi/yfinance/issues/2451) and third-party docs, not an official Yahoo statement. Daily bars go back many years (unverified here).
- **NSE bhavcopy and archives**: daily end-of-day only, no intraday. Use for daily index closes. Source: [NSE reports](https://www.nseindia.com/all-reports) (not fetched, so the daily-only claim rests on your brief).
- **TradingView export**: **unverified**. Depth for 5m depends on the plan. Manual export, not suited to a server script, and automating it risks breaching its terms.

---

## 4. Comparison

| Provider | NIFTY 50 / SENSEX | 5m depth | Cost | Rate limit | Static IP | Env vars |
|---|---|---|---|---|---|---|
| Angel One SmartAPI | Reported yes (unverified) | Unverified; 500 candles per request reported | Free (unverified) | 3/s, 180/min, 5,000/h | Whitelisted today | `ANGEL_API_KEY`, `ANGEL_CLIENT_ID`, `ANGEL_PIN`, `ANGEL_TOTP_SECRET` |
| Zerodha Kite Connect | NIFTY yes (forum); SENSEX unverified | From about 2015 (forum) | ₹500 per app per month | Unverified | Unverified | `KITE_API_KEY`, `KITE_API_SECRET`, `KITE_ACCESS_TOKEN` (daily) |
| Upstox v3 | Unverified | From Jan 2022 | Unverified | Unverified | Unverified | `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`, `UPSTOX_ACCESS_TOKEN` |
| Fyers v3 | Unverified | 1 year (free) or 5+ years (Prime) | Free, or Prime (price not found) | 5/s, 50/min, 5,000/day (free) | Unverified | `FYERS_APP_ID`, `FYERS_SECRET`, `FYERS_ACCESS_TOKEN` |
| Dhan HQ | Likely (unverified) | 5 years, 90 days per request | Unverified | 5/s, 100,000/day | Unverified | `DHAN_CLIENT_ID`, `DHAN_ACCESS_TOKEN` |
| TrueData | NSE indices yes | Unverified | Quote-based | Unverified | Unverified | `TRUEDATA_USER`, `TRUEDATA_PASSWORD` |
| Yahoo Finance | Yes | 60 days | Free | Unofficial | No | none |
| NSE bhavcopy | Daily only | none | Free | n/a | No | none |

Env var names are suggestions for this repo, not vendor requirements.

---

## 5. Recommendation

**Primary: Zerodha Kite Connect for one month.**
1. Pay ₹500 for one Connect app. Store `KITE_API_KEY`, `KITE_API_SECRET` and the daily `KITE_ACCESS_TOKEN` as secrets.
2. Look up the NIFTY 50 and SENSEX instrument tokens from the instruments list. Confirm SENSEX is present before paying (**unverified**).
3. Run a one-off script that pages `5minute` and `day` candles in small date windows, then writes them to Postgres. Backtests then read from the database, so the subscription is only needed for backfill and refreshes.
4. Stay inside the rate limit (check the Kite docs for the current figure).

**Fallback order:**
1. **Fix Angel One**: file a forum ticket (section 2.1). Cheapest if it works. Cap each request at 500 candles to be safe.
2. **Dhan HQ**: about 5 years of 5m data with 90-day windows. Covers most modern regimes but not 2015 to 2020.
3. **Fyers Prime**: 5+ years of intraday. Price must be checked.
4. **Daily bars only**: Upstox daily (from 2000) or NSE bhavcopy, if 5m depth is not essential.

**Free top-up**: use Yahoo 5m for the last 60 days to keep the dataset current without paying.

---

## 6. Sources

- Angel One forum, AG8004 threads: [19141](https://smartapi.angelone.in/smartapi/forum/post/19141), [18969](https://smartapi.angelone.in/smartapi/forum/post/18969), [18953](https://smartapi.angelone.in/smartapi/forum/post/18953), [uid 8803](https://smartapi.angelone.in/smartapi/forum/uid/8803)
- Angel One forum, limits: [10902](https://smartapi.angelone.in/smartapi/forum/post/10902), [19181](https://smartapi.angelone.in/smartapi/forum/post/19181)
- [Zerodha: charges for Kite APIs](https://support.zerodha.com/category/trading-and-markets/kite-api/articles/what-are-the-charges-for-kite-apis)
- [Kite Connect historical docs](https://kite.trade/docs/connect/v3/historical/)
- [Kite forum: NIFTY 50 5m from 2015](https://kite.trade/forum/discussion/13428/trying-to-fetch-nifty-50-historical-data-5m-timeframe-but-nothing-comes-from-before-09-01-2015)
- [Upstox v3 historical candle docs](http://upstox.com/developer/api-documentation/v3/get-historical-candle-data/)
- [Fyers plans and limits](https://fyers.in/api-docs/v3/getting-started/plans-and-limits/)
- [Dhan historical data docs](https://dhanhq.co/docs/v2/historical-data/), [Dhan API home](https://dhanhq.co/docs/v2/)
- [TrueData getting started](https://feedback.truedata.in/knowledge-base/article/getting-started-with-truedata-market-data-api)
- [yfinance issue 2451](https://github.com/ranaroussi/yfinance/issues/2451)
