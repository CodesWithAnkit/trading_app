-- 0024 update (2026-11-10): admin cancel of a running fetch, and a saved schedule pause.

ALTER TABLE public.news_fetch_runs
    ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz;

ALTER TABLE public.news_fetch_runs DROP CONSTRAINT IF EXISTS news_fetch_runs_status_check;
ALTER TABLE public.news_fetch_runs
    ADD CONSTRAINT news_fetch_runs_status_check CHECK (status IN ('running', 'done', 'partial', 'failed', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.news_ingestion_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    schedule_paused boolean NOT NULL DEFAULT false,
    paused_by uuid,
    paused_at timestamptz
);
INSERT INTO public.news_ingestion_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.news_ingestion_settings ENABLE ROW LEVEL SECURITY;
