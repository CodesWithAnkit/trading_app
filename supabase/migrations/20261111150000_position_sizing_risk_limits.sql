-- Spec 0028 (Position Sizing and Risk Limits): per user risk limits on user_settings, and
-- direction, quantity, exit and realized P&L on journal_entries. Idempotent.

-- 1. Settings. Fill nulls first, then defaults, then NOT NULL and checks (order matters).
update public.user_settings set risk_budget = 1500 where risk_budget is null;

alter table public.user_settings
  alter column risk_budget set default 1500,
  add column if not exists daily_loss_limit_inr numeric not null default 6000,
  add column if not exists max_open_trades integer not null default 3,
  add column if not exists max_capital_per_trade_inr numeric not null default 50000;

alter table public.user_settings alter column risk_budget set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_risk_budget_check') then
    alter table public.user_settings add constraint user_settings_risk_budget_check check (risk_budget >= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_daily_loss_limit_check') then
    alter table public.user_settings add constraint user_settings_daily_loss_limit_check check (daily_loss_limit_inr >= risk_budget);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_max_open_trades_check') then
    alter table public.user_settings add constraint user_settings_max_open_trades_check check (max_open_trades between 1 and 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_max_capital_check') then
    alter table public.user_settings add constraint user_settings_max_capital_check check (max_capital_per_trade_inr >= 1000);
  end if;
end $$;

-- 2. Journal.
alter table public.journal_entries
  add column if not exists direction text,
  add column if not exists quantity integer,
  add column if not exists exit_price numeric,
  add column if not exists exit_at timestamptz,
  add column if not exists realized_pnl numeric,
  add column if not exists signal_id uuid references public.signals(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'journal_entries_direction_check') then
    alter table public.journal_entries add constraint journal_entries_direction_check
      check (direction is null or direction in ('LONG', 'SHORT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'journal_entries_quantity_check') then
    alter table public.journal_entries add constraint journal_entries_quantity_check
      check (quantity is null or quantity >= 1);
  end if;
  -- Only rows closed after this migration carry exit_at; legacy closed rows are untouched.
  if not exists (select 1 from pg_constraint where conname = 'journal_entries_close_check') then
    alter table public.journal_entries add constraint journal_entries_close_check
      check (
        exit_at is null
        or status = 'CANCELLED'
        or (status in ('WON', 'LOST') and exit_price is not null and realized_pnl is not null)
      );
  end if;
end $$;

-- Legacy direction: from where the stop sits; equal stop and entry stays null ("check direction").
update public.journal_entries
set direction = case when stop_price < entry_price then 'LONG' when stop_price > entry_price then 'SHORT' end
where direction is null;

create index if not exists idx_journal_user_status_exit on public.journal_entries (user_id, status, exit_at);
