-- instruments
CREATE TABLE public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    instrument_token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    last_price NUMERIC
);

-- strategy_versions
CREATE TABLE public.strategy_versions (
    strategy_id TEXT NOT NULL,
    version TEXT NOT NULL,
    config_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (strategy_id, version)
);

-- signals
CREATE TABLE public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID REFERENCES public.instruments(id),
    direction TEXT NOT NULL,
    setup_family TEXT NOT NULL,
    status TEXT NOT NULL,
    entry_low NUMERIC,
    entry_high NUMERIC,
    target_1 NUMERIC,
    target_2 NUMERIC,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- signal_metrics
CREATE TABLE public.signal_metrics (
    signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
    strategy_version TEXT NOT NULL,
    config_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (signal_id)
);

-- signal_status_history
CREATE TABLE public.signal_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_settings
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_budget NUMERIC,
    display_preferences JSONB DEFAULT '{}'::jsonb
);

-- trades
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    gross_realized_pnl NUMERIC DEFAULT 0,
    net_realized_pnl NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- trade_legs
CREATE TABLE public.trade_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    net_pnl NUMERIC DEFAULT 0
);

-- audit_events
CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- feed_health
CREATE TABLE public.feed_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set immutability for snapshot/metric/audit history
CREATE OR REPLACE FUNCTION check_immutability() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'This table is append-only. Updates/Deletes are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_signal_metrics
BEFORE UPDATE OR DELETE ON public.signal_metrics
FOR EACH ROW EXECUTE FUNCTION check_immutability();

CREATE TRIGGER immutable_signal_status_history
BEFORE UPDATE OR DELETE ON public.signal_status_history
FOR EACH ROW EXECUTE FUNCTION check_immutability();

CREATE TRIGGER immutable_trade_legs
BEFORE UPDATE OR DELETE ON public.trade_legs
FOR EACH ROW EXECUTE FUNCTION check_immutability();

CREATE TRIGGER immutable_audit_events
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION check_immutability();

CREATE TRIGGER immutable_strategy_versions
BEFORE UPDATE OR DELETE ON public.strategy_versions
FOR EACH ROW EXECUTE FUNCTION check_immutability();

-- RLS Configuration
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own trades" ON public.trades
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own trade legs" ON public.trade_legs
    FOR ALL USING (
        trade_id IN (
            SELECT id FROM public.trades WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their own audit events" ON public.audit_events
    FOR ALL USING (auth.uid() = user_id);

-- System tables should be readable by all authenticated users (or handled via Service Role in backend)
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read instruments" ON public.instruments FOR SELECT USING (true);
CREATE POLICY "Anyone can read signals" ON public.signals FOR SELECT USING (true);
CREATE POLICY "Anyone can read signal metrics" ON public.signal_metrics FOR SELECT USING (true);
