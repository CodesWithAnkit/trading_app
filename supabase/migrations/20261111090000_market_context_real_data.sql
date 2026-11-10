-- Spec 0026: the market context snapshot keeps the last real reading of the day (NIFTY,
-- India VIX, regime confidence) so the page can show it, labelled with its time, when live
-- ticks stop or the backend restarts. All columns are nullable; existing rows are untouched.
alter table public.market_context_snapshots
  add column if not exists nifty_ltp numeric,
  add column if not exists nifty_change_pct numeric,
  add column if not exists vix_ltp numeric,
  add column if not exists vix_change_pct numeric,
  add column if not exists vix_day_low numeric,
  add column if not exists vix_day_high numeric,
  add column if not exists regime_confidence integer,
  add column if not exists session_date date;

create index if not exists idx_market_context_snapshots_session
  on public.market_context_snapshots (session_date, snapshot_time desc);
