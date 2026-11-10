-- 0024 Real News Ingestion: dedup key and classification provenance on news_and_events,
-- a fetch run log with a single running run, and the atomic daily Gemini cap.

-- 1. news_and_events: new columns
ALTER TABLE public.news_and_events
    ADD COLUMN IF NOT EXISTS source_item_id text,
    ADD COLUMN IF NOT EXISTS classified_by text NOT NULL DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS rules_version text,
    ADD COLUMN IF NOT EXISTS fetch_run_id uuid,
    ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_and_events_classified_by_check') THEN
        ALTER TABLE public.news_and_events
            ADD CONSTRAINT news_and_events_classified_by_check CHECK (classified_by IN ('rules', 'gemini', 'default'));
    END IF;
END $$;

-- Rows with a null source_item_id (old rows) do not collide; every new row has one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_news_source_item ON public.news_and_events (source, source_item_id);

-- 2. Seed handling: delete the 5 known seed rows if nothing references the table, else flag them.
DO $$
DECLARE
    referenced boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND confrelid = 'public.news_and_events'::regclass
    ) INTO referenced;

    IF referenced THEN
        UPDATE public.news_and_events SET is_seed = true
        WHERE (headline, source) IN (
            ('Tata Steel Commissions 5 MTPA Blast Furnace Expansion at Kalinganagar Facility', 'NSE NEAPS Regulatory Filing'),
            ('Jio Platforms Deploys Next Gen Edge Compute Stack Across 12 Indian Metro Clusters', 'BSE Corporate Announcement'),
            ('RBI Audits Retail Credit Disbursal Workflows, No Adverse Observations Issued', 'Reserve Bank of India Press Release'),
            ('European Financial Institution Renews Multi Year Core Cloud Modernization Mandate', 'Bloomberg Financial Wire'),
            ('Monthly Commercial Vehicle Dispatch Numbers Show 14.2% YoY Volume Acceleration', 'NSE Corporate Filing')
        );
    ELSE
        DELETE FROM public.news_and_events
        WHERE (headline, source) IN (
            ('Tata Steel Commissions 5 MTPA Blast Furnace Expansion at Kalinganagar Facility', 'NSE NEAPS Regulatory Filing'),
            ('Jio Platforms Deploys Next Gen Edge Compute Stack Across 12 Indian Metro Clusters', 'BSE Corporate Announcement'),
            ('RBI Audits Retail Credit Disbursal Workflows, No Adverse Observations Issued', 'Reserve Bank of India Press Release'),
            ('European Financial Institution Renews Multi Year Core Cloud Modernization Mandate', 'Bloomberg Financial Wire'),
            ('Monthly Commercial Vehicle Dispatch Numbers Show 14.2% YoY Volume Acceleration', 'NSE Corporate Filing')
        );
    END IF;
END $$;

-- 3. Fetch run log
CREATE TABLE IF NOT EXISTS public.news_fetch_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger text NOT NULL CHECK (trigger IN ('manual', 'schedule')),
    requested_by uuid,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'partial', 'failed')),
    per_source jsonb NOT NULL DEFAULT '{}'::jsonb,
    gemini_calls int NOT NULL DEFAULT 0
);

-- At most one run in progress at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_news_fetch_runs_running ON public.news_fetch_runs ((status)) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_news_fetch_runs_started ON public.news_fetch_runs (started_at DESC);
ALTER TABLE public.news_fetch_runs ENABLE ROW LEVEL SECURITY;

-- 4. Daily Gemini usage (IST day)
CREATE TABLE IF NOT EXISTS public.news_gemini_usage (
    day date PRIMARY KEY,
    calls int NOT NULL DEFAULT 0
);
ALTER TABLE public.news_gemini_usage ENABLE ROW LEVEL SECURITY;

-- Takes one Gemini call from today's budget. Returns the new count, or null when the cap is reached.
CREATE OR REPLACE FUNCTION public.news_gemini_take(p_day date, p_cap int)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    taken int;
BEGIN
    INSERT INTO public.news_gemini_usage (day, calls) VALUES (p_day, 0) ON CONFLICT (day) DO NOTHING;
    UPDATE public.news_gemini_usage SET calls = calls + 1
    WHERE day = p_day AND calls < p_cap
    RETURNING calls INTO taken;
    RETURN taken;
END;
$$;

REVOKE ALL ON FUNCTION public.news_gemini_take(date, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.news_gemini_take(date, int) TO service_role;
