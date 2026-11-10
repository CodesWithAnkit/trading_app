-- 0023 Guru Strategy Live Promotion: which passing guru rules are switched on live, per index.
CREATE TABLE IF NOT EXISTS public.strategy_live_toggles (
    rule_id text NOT NULL,
    symbol text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    updated_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (rule_id, symbol)
);

-- Service role only: RLS on, no policies for anon or authenticated.
ALTER TABLE public.strategy_live_toggles ENABLE ROW LEVEL SECURITY;
