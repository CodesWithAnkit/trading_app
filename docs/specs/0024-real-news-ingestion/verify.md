# Verify: Real News Ingestion · spec 0024 · updated 2026-11-10
_Steps derived from spec 0024 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] As an admin, open `/dashboard/news` and click "Fetch latest news" → spinner shows, then the line reads "Last fetch … · N new" (exchange sources show as skipped until their feed URLs are set) → AC-1, AC-8
- [ ] Click Fetch again within 60 s → the button shows "Wait Ns" and the API returned 429 with `retryAfter` → AC-1
- [ ] As a non admin, open the page → no Fetch, Cancel, or Pause controls; the page still shows news and the paused state → AC-1, AC-11
- [ ] Start a fetch, click "Cancel fetch" → the line reads "Cancelled …"; items stored before the cancel remain → AC-10
- [ ] Click "Pause schedule" → "Schedule paused" shows for every user; at the next 5 minute tick in market hours no run starts; manual Fetch still works; "Resume schedule" clears it → AC-11
- [ ] Each item shows a Rule, AI, or Unclassified label, an Official filing or General news tag, and a working Source link → AC-6, AC-9
- [ ] No old seed headline (Tata Steel blast furnace, Jio edge compute, etc.) appears anywhere → AC-7
- [ ] With the table empty, the page shows "No news fetched yet" → AC-7
- [ ] With the page open, a new fetch adds items without a reload → AC-8
- [ ] A symbol view also lists "Market wide" items → AC-4

## Commands
- [x] `select count(*) from news_and_events` before and after a second fetch with no new news → unchanged (no duplicates) → AC-5
- [ ] `select source, count(*) from news_and_events group by 1` → only NSE, BSE, RSS publishers, Alpha Vantage, never seed sources → AC-3, AC-7
- [ ] `select per_source, status from news_fetch_runs order by started_at desc limit 1` → each source has its own fetched/kept/new/error; one failing source gives `partial` → AC-3
- [x] `select calls from news_gemini_usage where day = (now() at time zone 'Asia/Kolkata')::date` → never above 200 → AC-6
- [x] `select symbol from news_and_events where symbol <> 'MARKET' except select symbol from instruments` → empty (only watched symbols) → AC-4
- [ ] `POST /api/v1/intelligence/news/fetch` with a non admin token → 403 → AC-1
- [ ] `PUT /api/v1/intelligence/news/schedule` with `{ "paused": "yes" }` → 422 → AC-11

- [ ] With `NEWS_NSE_FEED_URLS`, `NEWS_BSE_FEED_URLS` empty and `NEWS_ALPHAVANTAGE_ENABLED` unset, a run ends `done` with those three `skipped` and their reasons → AC-3, AC-12
- [ ] No outgoing news request carries a Cookie header or browser imitation headers; the User-Agent is `NEWS_USER_AGENT` → AC-3

## Value sourcing
- [ ] A company name from `company-names.json` in a feed title maps to its symbol → AC-4
- [ ] A BSE scrip code maps to its NSE symbol through the instrument file, and an unwatched company is dropped
- [ ] Watched universe: with `instruments.last_selected_on` set, only that day's symbols are kept; before 09:15 yesterday's list is used
- [x] `published_at` for NSE/BSE is the exchange IST time (+05:30), for Alpha Vantage UTC; compare one item against its source
- [ ] Cooldown: 60 s from the latest manual run's `started_at`
- [ ] Alpha Vantage (only once enabled): at most one call per 30 min, `skipped` shown otherwise
- [ ] Retention: after the 16:30 IST prune, a 40 day old HIGH item remains and a 40 day old LOW item is gone

## Acceptance-criteria coverage
- AC-1 · fetch, cooldown, admin only · AC-2 · schedule (pause step and the 08:30 skip test) · AC-3 · per source result · AC-4 · universe and Market wide · AC-5 · no duplicates · AC-6 · labels and Gemini cap · AC-7 · no seed, empty state · AC-8 · last fetch line, live add · AC-9 · filing vs news tags and links · AC-10 · cancel · AC-11 · pause and admin controls
