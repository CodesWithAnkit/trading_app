-- Spec 0028 AC-12: journal routes now filter by the signed in user. Rows written before that
-- (the old POST never set user_id) would be hidden for good. On a single user project they
-- belong to that one account, so assign them. With zero or several accounts nothing changes
-- (ownership can't be known; a human decides). Idempotent.
do $$
declare
  only_user uuid;
begin
  if (select count(*) from auth.users) = 1 then
    select id into only_user from auth.users limit 1;
    update public.journal_entries set user_id = only_user where user_id is null;
  end if;
end $$;
