-- Spec 0024 task 8 (news sources change): NSE and BSE are now read only from the
-- exchanges' official RSS feeds. Rows stored by the old scraped JSON adapters use ids
-- (`seq_id`, `NEWSID`) that will never match feed guids, so they would duplicate feed
-- items. They are deleted, HIGH items included (the method that produced them is no
-- longer used). Seed rows (`fetch_run_id IS NULL`) are untouched.
delete from public.news_and_events
where source in ('NSE', 'BSE')
  and fetch_run_id is not null;
