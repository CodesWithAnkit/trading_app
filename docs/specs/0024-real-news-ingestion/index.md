# 0024. Real News Ingestion for News and Filings

**Date**: 2026-11-10
**Status**: In Progress

## Summary

`/dashboard/news` shows invented items today: 5 hardcoded seed filings, plus made up items for other symbols. Nothing is fetched from the market. This spec replaces that with real news from: NSE and BSE announcements read only from the exchanges' own published RSS feeds (off until you confirm their URLs and terms and set them in config), market news RSS feeds, and Alpha Vantage (kept in code, disabled until a premium key). News arrives through a "Fetch latest news" button and a background job every 5 minutes on weekdays from 08:30 to 16:00 IST. Each item is classified by keyword rules first, Gemini for items the rules can't decide, and Neutral as the fallback, and the page shows which method was used. Only the watched F&O stocks plus market wide macro news are kept, and the seed items are removed.

## Requirements

**User stories**:
- As a trader, I want real filings and news for the stocks I watch, so that evidence on the page is real.
- As a trader, I want to pull the latest news on demand, so that I don't wait for the next scheduled poll.
- As a trader, I want to see how each item's impact and direction were decided, so that I know how far to trust them.

**Acceptance criteria**:
- **AC-1**: `POST /api/v1/intelligence/news/fetch` (admin only, spec 0021 AdminGuard; updated 2026-11-10) runs a fetch across all enabled sources and returns `{ runId, status }`. A second call within 60 seconds returns 429 with the seconds remaining. Only one fetch runs at a time: an overlapping call returns the running run's id.
- **AC-2**: A scheduled job runs the same fetch every 5 minutes, Monday to Friday, 08:30 to 16:00 IST. If the previous run is still going, the tick is skipped.
- **AC-3** (updated 2026-11-10, news sources decision): Sources: **NSE** and **BSE** corporate announcements, read only from the exchanges' own published RSS feeds whose URLs are set in config (`NEWS_NSE_FEED_URLS`, `NEWS_BSE_FEED_URLS`); **market RSS** (ET Markets and Moneycontrol, `NEWS_RSS_FEEDS`); and **Alpha Vantage** `NEWS_SENTIMENT`, kept in code but disabled (`NEWS_ALPHAVANTAGE_ENABLED`, default `false`) until a premium key is bought. Every request is a plain HTTP GET with an honest `User-Agent` (`NEWS_USER_AGENT`, default `TradingTerminal-NewsReader/1.0`, never a personal name or email): no browser imitation headers, no cookie priming, no calls to exchange website JSON APIs. Each source runs independently: one failing never blocks the others, and its error is recorded on the run.
- **AC-12**: A source with no feed configured, or disabled, is recorded on the run as `skipped` with its reason ("no official feed configured", "disabled until premium"), never as an error. A feed that answers a plain request with 401, 403, or an HTML block page is also recorded as `skipped` ("blocked by exchange"), not retried in the same run, and not worked around. Skipped sources don't count toward `partial` or `failed`.
- **AC-4**: Items are kept only if they map to a symbol in today's watched F&O universe (`instruments`), or are market wide macro news (RBI, SEBI, government policy) stored with symbol `MARKET`. Mapping order: a symbol or BSE scrip code carried in the item; else the company name matched against the committed names file (`apps/backend/src/intelligence/news/company-names.json`, normalized by dropping Ltd, Limited and similar); else a watched symbol appearing as a word in the headline. Everything else is dropped, never stored as `MARKET` unless the macro rule matches.
- **AC-5**: Each item is stored once. The `(source, source_item_id)` pair is unique, and a re-fetch updates nothing and creates no duplicates.
- **AC-6**: Classification sets `impact_level`, `direction`, `event_type` and `confidence` in order. First, **keyword rules** (category and headline, a versioned rule table). For items the rules leave undecided, **Gemini**, capped at 200 calls a day. If Gemini fails, times out, or the cap is reached, the item gets **Low / Neutral**. Each item stores `classified_by` (`rules` | `gemini` | `default`), and the page shows it per item.
- **AC-7**: `GET /api/v1/intelligence/news` returns only stored real items, newest first, filtered by symbol if given. The seed list and the made up items are removed. With nothing stored, the page shows "No news fetched yet" with the Fetch button.
- **AC-8**: The page shows the last fetch's time and result ("Last fetch 2m ago · 14 new · BSE failed"), and the button shows a spinner while a fetch runs. New items appear without a reload, through the existing `intelligence:news` SSE event.
- **AC-10**: An admin can cancel the running fetch with `POST /api/v1/intelligence/news/fetch-runs/:id/cancel`. The run stops before its next item (items already stored stay), ends with status `cancelled`, and the page shows "Cancelled". Cancelling a run that is not running returns 409.
- **AC-11**: An admin can pause and resume the scheduled fetch with `PUT /api/v1/intelligence/news/schedule` `{ paused: boolean }`. The pause is saved in the database (survives restarts); while paused, schedule ticks start no run. The manual Fetch still works. Every signed in user sees "Schedule paused" on the page; only admins see the Fetch, Cancel, and Pause/Resume controls.
- **AC-9**: Official filings (NSE, BSE) set `is_official_filing = true` and link to the feed item's `link`. Market RSS and Alpha Vantage items are tagged as general news with their publisher and link.

## Decision

**Chosen option**: an `NewsIngestionService` in the intelligence module with one adapter per source (all returning a common `RawNewsItem`), a symbol mapper, a three step classifier (rules → Gemini → default), and a fetch run log. It is triggered by the API button and a Nest `@Cron` schedule.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`) · `supabase-postgres-best-practices` (migration)

## Feature design

**Data model** (one migration):
| Table | Change |
|---|---|
| `news_and_events` (existing) | add `source_item_id text`, `classified_by text NOT NULL DEFAULT 'default'` (check: rules, gemini, default), `rules_version text`, `fetch_run_id uuid`. add `is_seed boolean NOT NULL DEFAULT false`. Add a unique index on `(source, source_item_id)`. Seed handling: first check which tables reference `news_and_events`. If none do, delete only the 5 known seed rows (matched by headline and source); otherwise mark them `is_seed = true`. The API always excludes `is_seed` rows. |
| `news_ingestion_settings` (new, added 2026-11-10) | single row: `id smallint PK DEFAULT 1 CHECK (id = 1)`, `schedule_paused boolean NOT NULL DEFAULT false`, `paused_by uuid null`, `paused_at timestamptz null`. RLS on, service role only. |
| `news_gemini_usage` (new) | `day date PK` (IST date), `calls int NOT NULL DEFAULT 0`. RLS on, service role only. |
| `news_fetch_runs` (new) | `id uuid PK`, `trigger text` (manual, schedule), `requested_by uuid null`, `started_at timestamptz`, `finished_at timestamptz null`, `status text` (running, done, partial, failed, cancelled), `cancel_requested_at timestamptz null`, `per_source jsonb` (`{ nse: { fetched, kept, new, error } … }`), `gemini_calls int`. A partial unique index allows only one row with `status = 'running'`. RLS on, service role only. |

`symbol = 'MARKET'` marks macro items.

**Sources** (adapter → `RawNewsItem { source, sourceItemId, symbolHint, companyName, headline, excerpt, category, url, publishedAt }`):
| Source | Endpoint / method | `source_item_id` |
|---|---|---|
| NSE | the official announcement RSS feed(s) in `NEWS_NSE_FEED_URLS` (empty = skipped); plain GET, honest `User-Agent` | item `guid`, else the link |
| BSE | the official announcement RSS feed(s) in `NEWS_BSE_FEED_URLS` (empty = skipped); plain GET, honest `User-Agent` | item `guid`, else the link |
| RSS | configurable list, default ET Markets and Moneycontrol markets feeds | item `guid`, else the link |
| Alpha Vantage | `NEWS_SENTIMENT` for watched tickers, batched, max 1 call per 30 min; runs only when `NEWS_ALPHAVANTAGE_ENABLED=true` | article URL |

**News sources detail** (added 2026-11-10 from the cross check; governs task 8):
- **Legacy rows**: the task 8 migration deletes `news_and_events` rows with `source IN ('NSE','BSE')` and `fetch_run_id IS NOT NULL` (they came from the scraped JSON APIs and their ids, `seq_id` / `NEWSID`, would never match feed `guid`s). HIGH items from those sources go too; the method that produced them is no longer used.
- **Feed config parsing**: comma separated, trimmed, empties dropped; each must be an `https` URL, else that feed is `skipped` "invalid feed URL".
- **Requests**: plain GET with only `User-Agent` (`NEWS_USER_AGENT`) and `Accept: application/rss+xml, application/xml, text/xml`. No `Cookie`, `Referer`, `Origin`, `Accept-Language`, or `sec-*` headers, on every source including market RSS. 10 s timeout; follow at most 3 redirects, same host only. Send `If-None-Match` / `If-Modified-Since` from the last `ETag` / `Last-Modified` per feed (kept in memory); a 304 is ok with 0 items. The old `BROWSER_HEADERS`, the NSE cookie flow, and both JSON adapters are deleted.
- **Outcome per feed**: `skipped` "blocked by exchange" for 401 or 403, or a 200 whose `content-type` contains `text/html` or whose body doesn't start (after whitespace) with `<?xml`, `<rss`, or `<feed`; `skipped` "rate limited" for 429 or a `Retry-After`; `error` for 5xx, timeouts, network errors, or unparseable XML. A feed `skipped` as blocked or rate limited is remembered for 6 hours (in memory) and skipped without a request ("blocked by exchange, retry after HH:MM IST"); a manual Fetch may try it again once.
- **Outcome per source**: `skipped` only when every feed of that source is skipped (or none configured); `error` when any feed errored; else `ok`. `per_source.<key>` becomes `{ status: 'ok' | 'skipped' | 'error', fetched, kept, new, error: string | null, skipped: string | null, feeds: [{ url, status, reason }] }`. Skipped reasons are exactly: "no official feed configured", "disabled until premium", "no key", "premium required", "blocked by exchange", "blocked by exchange, retry after HH:MM IST", "rate limited", "invalid feed URL". Skipped is never written to `error`.
- **Run status**: `failed` if every non skipped source errored; `partial` if some did; `done` otherwise, including when every source is skipped.
- **Status line (AC-8)**: names only sources skipped as blocked or rate limited ("BSE blocked"); sources skipped as not configured or disabled collapse to a muted "2 sources off".
- **Alpha Vantage**: runs only when `NEWS_ALPHAVANTAGE_ENABLED=true`; enabled without `ALPHA_VANTAGE_API_KEY` is skipped "no key"; an `Information` or `Note` answer mentioning premium is skipped "premium required". The AV last call rule counts only `status = 'ok'`.
- **Exchange item parsing**: RSS 2.0 only (no Atom), handling CDATA and entities; `content:encoded` ignored. `source_item_id` = `guid`, else `link` with `utm_*` parameters and fragment removed; items with neither are dropped and counted. A symbol or BSE scrip code is not guaranteed: a fixture tested pattern reads an uppercase NSE symbol or a 6 digit scrip code from the title or description; `category` is empty, so rules match on the headline alone.
- **Names file**: `apps/backend/src/intelligence/news/company-names.json`, shape `{ "SYMBOL": "Company Name" | ["Name", "Alias"] }`. Names are normalized by dropping Limited, Ltd, India, Corporation, Corp, Company, Co and collapsing spaces; names under 4 characters or equal to the symbol are ignored. A missing or invalid file logs a warning and uses an empty map. Each run logs how many watched symbols have no name. The Angel One instrument file is used only for BSE scrip code to NSE symbol mapping (its BSE rows carry a name equal to the symbol), never as a company name source.
- **Universe query**: select `symbol` only. A query error is logged at error level and the run continues with the instrument file F&O list, noted in the run log; an empty result also uses that list.
- **Fixtures**: synthetic RSS 2.0 samples in the test files (real feed samples can replace them once the URLs are confirmed).

**Write path**: `insert … on conflict (source, source_item_id) do nothing returning id`. Only inserted rows are classified (no Gemini call for a duplicate), then updated with the classification. New rows always have a non empty `source_item_id`.

**Field mapping** (every NOT NULL column has a source):
| Column | NSE / BSE | RSS | Alpha Vantage |
|---|---|---|---|
| `symbol` | mapped NSE symbol, or `MARKET` | matched symbol, or `MARKET` | matched symbol, or `MARKET` |
| `source` | `NSE` / `BSE` | feed publisher (e.g. `ET Markets`) | `Alpha Vantage · <source>` |
| `headline` | feed item `title` (same as RSS) | `title` | `title` |
| `excerpt`, `raw_excerpt` | feed item `description`, HTML stripped, excerpt 400 chars, raw 2,000 chars (same as RSS) | `description`, same limits | `summary`, same limits |
| `source_url` | feed item `link` | `link` | `url` |
| `published_at` | RFC822 `pubDate` with its own offset (same as RSS) | RFC822 `pubDate` | `time_published` `YYYYMMDDTHHMMSS` as UTC |
| `event_type` | `EARNINGS` if a results rule matched, else `OFFICIAL_FILING`; `MACRO` for macro | `GENERAL_NEWS`, or `MACRO` | `GENERAL_NEWS`, or `MACRO` |
| `is_official_filing` | true | false | false |
| `impact_level`, `direction`, `confidence` | rules (confidence 0.9), else Gemini (its 0 to 1), else Low / Neutral / 0.3 | same | same |

**Rule table v1** (`rules-v1`, first match wins; a matched rule with `direction: null` sends only the direction to Gemini):
| Pattern (category or headline, case insensitive) | Event type | Impact | Direction |
|---|---|---|---|
| financial results, quarterly results, earnings | EARNINGS | High | null |
| order win, order received, contract awarded, LOI | OFFICIAL_FILING | High | Bullish |
| SEBI order, penalty, fraud, default, insolvency, NCLT | OFFICIAL_FILING | High | Bearish |
| pledge invoked, pledge created | OFFICIAL_FILING | High | Bearish |
| pledge released, revoked | OFFICIAL_FILING | Medium | Bullish |
| buyback, bonus issue, dividend, stock split | OFFICIAL_FILING | Medium | Bullish |
| resignation of (CEO, CFO, MD, auditor) | OFFICIAL_FILING | Medium | Bearish |
| acquisition, merger, amalgamation, demerger | OFFICIAL_FILING | Medium | null |
| fund raising, QIP, rights issue, preferential | OFFICIAL_FILING | Medium | Neutral |
| credit rating upgraded / downgraded | OFFICIAL_FILING | Medium | Bullish / Bearish |
| block deal, bulk deal | OFFICIAL_FILING | Medium | null |
| board meeting intimation, trading window, AGM, record date | OFFICIAL_FILING | Low | Neutral |
| RBI, repo rate, monetary policy, SEBI circular, budget, GST council | MACRO | High | null |
"Undecided" means no rule matched, or the matched rule left the direction null.

**Gemini step**: model `gemini-2.5-flash`, temperature 0, 8 s timeout, a JSON response schema `{ impact: High|Medium|Low, direction: Bullish|Bearish|Mixed|Neutral, eventType, confidence: 0..1 }`. The prompt gives the headline, excerpt and symbol only. Invalid JSON or a timeout falls back to the default. The cap: before each call, atomically `update news_gemini_usage set calls = calls + 1 where day = <IST today> and calls < 200 returning calls` (inserting the day row if missing); no row returned means the cap is reached.

**Source queries**: lookback is 2 days on a manual fetch and 1 day on schedule, applied by filtering feed items on `pubDate` (RSS feeds return their latest items, not a date range). Exchange RSS items parse like market RSS (`title`, `link`, `guid`, `pubDate`, `description`), with `is_official_filing = true`, `source` `NSE` or `BSE`, and any symbol or scrip code read from the item. The removed JSON API adapters (`fetchNse` cookie flow, `fetchBse` AnnSubCategoryGetData) are deleted, not left disabled. Alpha Vantage (when enabled): watched tickers in batches of up to 25 per call, `time_from` = the last successful AV call (at most one call per 30 min, so the first batch per window only).

**Watched universe**: symbols from `instruments` for the latest `last_selected_on` day (so pre 09:15 fetches use yesterday's list), selecting only columns that exist (`symbol`; the live table has no `name` column, and the current query asks for one, fails, and silently falls back, which is a bug to fix). If `instruments` has none, use the full F&O list from the instrument file. Company names come only from the committed names file.

**Scheduling and concurrency**: the cron is `*/5 8-15 * * 1-5` plus `0 16 * * 1-5`, with `timeZone: 'Asia/Kolkata'`; ticks before 08:30 are skipped. Only one run at a time, enforced by the partial unique index (an overlapping manual call returns the running run). A run still `running` after 10 minutes is marked `failed` on the next attempt. Schedule ticks read `news_ingestion_settings.schedule_paused` and start nothing when it is true. Cancel sets `cancel_requested_at`; the run checks it between items and sources and finishes as `cancelled`. Retention (updated 2026-11-10 for spec 0025): the daily prune at 16:30 IST deletes only `LOW` and `MEDIUM` items older than 30 days; `HIGH` items are kept for good, so the backtest comparison has a growing history.

**Contract, web and SSE**: `NewsFilingItemContract` (backend and web) gains `classifiedBy: 'rules' | 'gemini' | 'default'` and `isMacro: boolean`. `MARKET` items appear in the all symbols view and on every symbol's view as "Market wide". After a run, each newly inserted item is emitted once as `intelligence:news` with the item contract. The page labels `classifiedBy` as "Rule", "AI" or "Unclassified".

**API surface**:
| Endpoint | Method | Auth | Output | Errors |
|---|---|---|---|---|
| `/api/v1/intelligence/news/fetch` | POST | admin | `{ runId, status }` | 429 cooldown (`retryAfter`), 403 non admin |
| `/api/v1/intelligence/news/fetch-runs/:id/cancel` | POST | admin | `{ runId, status }` | 404, 409 not running, 403 |
| `/api/v1/intelligence/news/schedule` | GET | signed in | `{ paused, pausedAt }` | none |
| `/api/v1/intelligence/news/schedule` | PUT | admin | `{ paused, pausedAt }` | 422 bad body, 403 |
| `/api/v1/intelligence/news/fetch-runs/latest` | GET | signed in | the latest run with `per_source` | none |
| `/api/v1/intelligence/news` | GET (existing) | signed in | real items only, each with `classifiedBy` | none |

**Value sourcing**:
| Value | Source |
|---|---|
| watched symbols | `instruments.symbol` for today's `last_selected_on` |
| company names | `company-names.json` (symbol to company name, about 220 F&O rows), filled and refreshed by the engineer from a source they are permitted to use |
| exchange feed URLs | env `NEWS_NSE_FEED_URLS`, `NEWS_BSE_FEED_URLS` (comma separated), set by the engineer after confirming the feed and the exchange's terms in a browser |
| request identity | env `NEWS_USER_AGENT`, default `TradingTerminal-NewsReader/1.0` |
| BSE code → NSE symbol | Angel One instrument file (BSE rows: token = scrip code, name), matched to NSE `-EQ` rows by name, used when a BSE item carries a scrip code |
| macro detection | keyword list (RBI, SEBI, repo rate, budget, GST council…) in the rule table |
| impact, direction, event type | rule table (v1), else Gemini (JSON response schema), else Low / Neutral / GENERAL_NEWS |
| Gemini daily count | `sum(gemini_calls)` of today's IST runs |
| cooldown remaining | 60 s minus the time since the latest manual run's `started_at` |
| AV last call | latest run whose `per_source.alphavantage` was fetched, at least 30 minutes ago |
| feeds list | env `NEWS_RSS_FEEDS` (comma separated). Unset: the defaults `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms` (ET Markets) and `https://www.moneycontrol.com/rss/marketreports.xml` (Moneycontrol). Set to empty: market RSS off |

**Key invariants**: no invented items ever reach the API; `(source, source_item_id)` is unique; at most one fetch runs at a time; at most 200 Gemini calls per IST day; at most 1 Alpha Vantage call per 30 min.

**Security**: fetch, cancel, and pause are admin only (spec 0021 AdminGuard); reading news, the latest run, and the schedule state needs sign in. Keys stay on the backend. Gemini receives headlines only, never user data.

**Configuration required**: `NEWS_RSS_FEEDS` (optional); `NEWS_NSE_FEED_URLS`, `NEWS_BSE_FEED_URLS` (optional, empty means that exchange is off); `NEWS_ALPHAVANTAGE_ENABLED` (default `false`); `NEWS_USER_AGENT` (optional); existing `GEMINI_API_KEY`, `ALPHA_VANTAGE_API_KEY`.

**Critical test scenarios**:
- Each adapter parses a saved sample response into `RawNewsItem`s (fixtures), verifies **AC-3**
- One source throws, and the others still store items, with the run `partial` and the error recorded, verifies **AC-3**
- Re-running with the same fixtures creates no duplicates, verifies **AC-5**
- BSE scrip codes map to NSE symbols, a company name from the names file maps to its symbol, and an unwatched company is dropped, verifies **AC-4**
- With no exchange feed URLs and Alpha Vantage disabled, the run ends `done` with NSE, BSE, and Alpha Vantage `skipped` and their reasons; a feed answering 403 is `skipped` "blocked by exchange"; no request carries cookies or browser imitation headers, verifies **AC-3**, **AC-12**
- The watched universe query selects only existing columns and uses today's `instruments` list, verifies **AC-4**
- Rules decide known categories, undecided items go to Gemini, and at the cap or on failure they become Low / Neutral with `classified_by` set, verifies **AC-6**
- A non admin gets 403 on fetch, cancel, and pause; a cancelled run ends `cancelled` with earlier items kept; a paused schedule starts no run while manual fetch still works; the prune keeps a 40 day old HIGH item and deletes a 40 day old LOW one, verifies **AC-1**, **AC-10**, **AC-11**
- A second manual fetch within 60 s gets 429, and an overlapping fetch returns the same run, verifies **AC-1**
- An empty table returns `[]` and the page shows "No news fetched yet", verifies **AC-7**

## Build plan

1. Migration (new columns, unique index, safe seed handling, `news_fetch_runs`, `news_gemini_usage`), satisfies **AC-5**, **AC-7**
2. BSE adapter, the symbol mapper, rules classifier v1, storage with dedup, the fetch API with cooldown, and seed removal: the first real items end to end on the page, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9** (its BSE JSON adapter is superseded by task 8)
3. NSE, RSS and Alpha Vantage adapters with independent failure, satisfies **AC-3**, **AC-9** (its NSE JSON adapter is superseded by task 8)
4. Gemini step with the daily cap, and the default fallback, satisfies **AC-6**
5. Cron schedule with skip on overlap, satisfies **AC-2**
6. Page: Fetch button, last fetch line, `classified_by` tag per item, empty state, SSE refresh, satisfies **AC-1**, **AC-6**, **AC-8**
7. Admin only fetch, cancel (`cancelled` status, `cancel_requested_at`), and schedule pause (`news_ingestion_settings`), with the page controls shown to admins only and the paused state to everyone; HIGH items exempt from the prune, satisfies **AC-1**, **AC-10**, **AC-11**
8. News sources change: replace the NSE and BSE JSON adapters with an exchange RSS adapter driven by `NEWS_NSE_FEED_URLS` / `NEWS_BSE_FEED_URLS`; honest `User-Agent` on every request and no cookie or browser headers; `skipped` handling (AC-12); Alpha Vantage behind `NEWS_ALPHAVANTAGE_ENABLED`; the `company-names.json` file and name matching; fix the universe query, satisfies **AC-3**, **AC-4**, **AC-12**
9. Tests for the scenarios above, satisfies **AC-1** to **AC-12**

## Consequences

**Positive**: the page shows only real, linked items. Classification is explainable, and AI is used only where it adds something.
**Negative**: until you confirm and configure the exchange feeds, there are no official filings, only market RSS headlines. The exchanges may still block plain requests or restrict automated use in their terms, so you check their terms before turning a feed on. The names file needs an occasional refresh as the F&O list changes. RSS symbol matching by name can miss some items or mismatch others. Gemini and Alpha Vantage have daily limits, so a busy day falls back to rules and the default.
**Neutral**: the old seed rows are deleted by the migration.

## Follow-up

- [ ] Open the NSE and BSE RSS pages and terms of use in a browser; if you are satisfied automated reading of their RSS is permitted, copy the announcement feed URLs into `NEWS_NSE_FEED_URLS` / `NEWS_BSE_FEED_URLS`.
- [ ] Fill `company-names.json` for the F&O list from a source you are permitted to use.
- [ ] When a premium Alpha Vantage key is bought, set `NEWS_ALPHAVANTAGE_ENABLED=true` and confirm `NEWS_SENTIMENT` returns a feed.
- [ ] If official filings matter more than the terms allow, consider a licensed exchange or vendor feed (a new spec).
## Rationale

Reasoning and options: see [rationale.md](rationale.md). Verify steps: [verify.md](verify.md).
