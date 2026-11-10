-- Spec 0025 (live news gate): a real `signals.symbol`, the entry verdict (fixed at insert),
-- and the after entry verdict (only escalates). Items are embedded snapshots, not foreign
-- keys, so pruning news never breaks a signal.

alter table public.signals
  add column if not exists symbol text,
  add column if not exists news_gate text check (news_gate in ('pass', 'warn', 'block')),
  add column if not exists news_gate_reason text,
  add column if not exists news_gate_items jsonb not null default '[]'::jsonb,
  add column if not exists news_gate_checked_at timestamptz,
  add column if not exists news_after_gate text check (news_after_gate in ('warn', 'block')),
  add column if not exists news_after_reason text,
  add column if not exists news_after_items jsonb not null default '[]'::jsonb,
  add column if not exists news_after_checked_at timestamptz;

-- Plain NSE symbol, the same form as news_and_events.symbol (any -EQ suffix stripped).
update public.signals
set symbol = regexp_replace(upper(snapshot_json->>'symbol'), '-EQ$', '')
where symbol is null and snapshot_json ? 'symbol';

create index if not exists idx_signals_symbol_created_at on public.signals (symbol, created_at desc);

-- After entry escalation in one statement (never read then write): none < warn < block.
-- Returns the ids that actually moved up, so the caller pushes SSE only for those.
create or replace function public.news_gate_escalate(
  p_ids uuid[],
  p_gate text,
  p_reason text,
  p_items jsonb,
  p_checked_at timestamptz
) returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.signals s
  set news_after_gate = p_gate,
      news_after_reason = p_reason,
      news_after_items = p_items,
      news_after_checked_at = p_checked_at
  where s.id = any(p_ids)
    and p_gate in ('warn', 'block')
    and (case s.news_after_gate when 'block' then 2 when 'warn' then 1 else 0 end)
      < (case p_gate when 'block' then 2 when 'warn' then 1 else 0 end)
  returning s.id;
$$;

revoke all on function public.news_gate_escalate(uuid[], text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.news_gate_escalate(uuid[], text, text, jsonb, timestamptz) to service_role;
