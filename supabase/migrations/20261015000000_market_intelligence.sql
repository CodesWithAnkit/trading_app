-- 0017 Market Intelligence and Explainable Analysis Schema
-- Tables: market_context_snapshots, news_and_events, institutional_flows, bulk_block_deals, evidence_snapshots

-- 1. Market Context Snapshots
CREATE TABLE IF NOT EXISTS public.market_context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    market_regime TEXT NOT NULL, -- 'BULLISH_TREND_DAY', 'BEARISH_TREND_DAY', 'RANGE_BOUND_CONGESTED', 'VOLATILE_DISLOCATED', 'UNCLEAR'
    advance_count INTEGER NOT NULL,
    decline_count INTEGER NOT NULL,
    unchanged_count INTEGER NOT NULL,
    pct_above_vwap NUMERIC NOT NULL,
    median_day_change NUMERIC NOT NULL,
    sector_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_context_time ON public.market_context_snapshots(snapshot_time DESC);

-- 2. News and Corporate Announcements
CREATE TABLE IF NOT EXISTS public.news_and_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    headline TEXT NOT NULL,
    excerpt TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    event_type TEXT NOT NULL, -- 'OFFICIAL_FILING', 'EARNINGS', 'GENERAL_NEWS', 'MACRO'
    impact_level TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
    direction TEXT NOT NULL, -- 'BULLISH', 'BEARISH', 'MIXED', 'NEUTRAL'
    confidence NUMERIC NOT NULL DEFAULT 1.0,
    is_official_filing BOOLEAN NOT NULL DEFAULT false,
    raw_excerpt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_symbol_published ON public.news_and_events(symbol, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON public.news_and_events(published_at DESC);

-- 3. Institutional Flows
CREATE TABLE IF NOT EXISTS public.institutional_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    fii_gross_buy NUMERIC NOT NULL,
    fii_gross_sell NUMERIC NOT NULL,
    fii_net NUMERIC NOT NULL,
    dii_gross_buy NUMERIC NOT NULL,
    dii_gross_sell NUMERIC NOT NULL,
    dii_net NUMERIC NOT NULL,
    reporting_period TEXT NOT NULL DEFAULT 'PREVIOUS_DAY_EOD', -- 'PREVIOUS_DAY_EOD', 'MONTHLY_CUMULATIVE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_institutional_flows_date ON public.institutional_flows(report_date DESC);

-- 4. Bulk and Block Deals
CREATE TABLE IF NOT EXISTS public.bulk_block_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_date DATE NOT NULL,
    deal_time TIME,
    symbol TEXT NOT NULL,
    client_name TEXT NOT NULL,
    deal_type TEXT NOT NULL, -- 'BULK', 'BLOCK'
    action TEXT NOT NULL, -- 'BUY', 'SELL'
    quantity BIGINT NOT NULL,
    price NUMERIC NOT NULL,
    value_in_crores NUMERIC NOT NULL,
    source TEXT NOT NULL DEFAULT 'NSE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bulk_deals_symbol_date ON public.bulk_block_deals(symbol, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_deals_date ON public.bulk_block_deals(deal_date DESC);

-- 5. Explainable Evidence Snapshots
CREATE TABLE IF NOT EXISTS public.evidence_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    market_regime TEXT NOT NULL,
    sector_relative_strength NUMERIC NOT NULL,
    positive_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictory_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_gates JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualification_status TEXT NOT NULL, -- 'QUALIFIED', 'REJECTED', 'OBSERVATION_ONLY'
    rejection_reason TEXT,
    estimated_charges NUMERIC NOT NULL DEFAULT 20.0,
    net_reward_risk NUMERIC NOT NULL,
    historical_sample_size INTEGER,
    historical_win_rate NUMERIC,
    rule_version TEXT NOT NULL DEFAULT 'v1.1'
);

CREATE INDEX IF NOT EXISTS idx_evidence_symbol_created ON public.evidence_snapshots(symbol, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.market_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_and_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_block_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_snapshots ENABLE ROW LEVEL SECURITY;

-- Read policies: Allow public read access to intelligence feeds
CREATE POLICY "Anyone can read market context snapshots" ON public.market_context_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can read news and events" ON public.news_and_events FOR SELECT USING (true);
CREATE POLICY "Anyone can read institutional flows" ON public.institutional_flows FOR SELECT USING (true);
CREATE POLICY "Anyone can read bulk block deals" ON public.bulk_block_deals FOR SELECT USING (true);
CREATE POLICY "Anyone can read evidence snapshots" ON public.evidence_snapshots FOR SELECT USING (true);

-- Write policies: Service role has full write access
CREATE POLICY "Service role full access on market context snapshots" ON public.market_context_snapshots USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on news and events" ON public.news_and_events USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on institutional flows" ON public.institutional_flows USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on bulk block deals" ON public.bulk_block_deals USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on evidence snapshots" ON public.evidence_snapshots USING (auth.role() = 'service_role');
