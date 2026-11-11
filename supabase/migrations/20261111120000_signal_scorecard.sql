-- Spec 0027 (Signal Scorecard): grouping keys stamped on signals at insert, plus the
-- scorecard min sample setting. The backfill is idempotent (only fills nulls).

alter table public.signals
  add column if not exists strategy_id text,
  add column if not exists strategy_version text,
  add column if not exists market_regime text;

alter table public.user_settings
  add column if not exists scorecard_min_sample integer not null default 30;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_scorecard_min_sample_check') then
    alter table public.user_settings
      add constraint user_settings_scorecard_min_sample_check check (scorecard_min_sample >= 5);
  end if;
end $$;

-- Range reads skip unreconciled rows.
create index if not exists idx_signals_reconciled_scorecard
  on public.signals (created_at)
  where outcome_status is not null;

-- strategy_id: guru rows from the rule id, scanner rows from the setup family.
update public.signals
set strategy_id = case
  when setup_family = 'GURU' and coalesce(snapshot_json->'guru'->>'ruleId', snapshot_json->>'setup') is not null
    then 'guru:' || coalesce(snapshot_json->'guru'->>'ruleId', snapshot_json->>'setup')
  else lower(setup_family)
end
where strategy_id is null;

-- strategy_version: guru definitions version, else signal_metrics, else 'unversioned'.
update public.signals s
set strategy_version = coalesce(
  case when s.setup_family = 'GURU' then s.snapshot_json->'guru'->>'definitionsVersion' end,
  (select m.strategy_version from public.signal_metrics m where m.signal_id = s.id),
  'unversioned'
)
where s.strategy_version is null;

-- market_regime: the signal's latest evidence row, else the latest market snapshot at or
-- before the signal on the same IST day. Left null ("Unknown") when neither exists.
update public.signals s
set market_regime = coalesce(
  (select e.market_regime from public.evidence_snapshots e
    where e.signal_id = s.id order by e.created_at desc limit 1),
  (select c.market_regime from public.market_context_snapshots c
    where c.snapshot_time <= s.created_at
      and (c.snapshot_time at time zone 'Asia/Kolkata')::date = (s.created_at at time zone 'Asia/Kolkata')::date
    order by c.snapshot_time desc limit 1)
)
where s.market_regime is null;
