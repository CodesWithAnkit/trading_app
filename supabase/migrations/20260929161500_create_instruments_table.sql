-- Create instruments table
CREATE TABLE IF NOT EXISTS public.instruments (
    symbol TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    exchange TEXT DEFAULT 'NSE',
    name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- Allow public read access (like other public data in this app)
CREATE POLICY "Allow public read access on instruments"
    ON public.instruments
    FOR SELECT
    TO public
    USING (true);

-- Allow service role to manage instruments
CREATE POLICY "Allow service role full access on instruments"
    ON public.instruments
    USING (auth.jwt() ->> 'role' = 'service_role');
