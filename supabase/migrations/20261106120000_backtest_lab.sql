-- 0020 Guru Strategy Backtest Lab
-- candles already has UNIQUE (symbol, timeframe, start_time) (candles_symbol_timeframe_start_time_key), so no change there.

CREATE TABLE IF NOT EXISTS public.backtest_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id text NOT NULL,
    symbol text NOT NULL,
    definitions_version text NOT NULL,
    cost_model jsonb NOT NULL,
    window_start date,
    window_end date,
    oos_start date,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
    progress numeric NOT NULL DEFAULT 0,
    trades integer,
    win_rate numeric,
    net_pnl_r numeric,
    profit_factor numeric,
    max_drawdown_r numeric,
    per_year jsonb,
    in_sample jsonb,
    out_of_sample jsonb,
    gap_days integer NOT NULL DEFAULT 0,
    passed_gate boolean NOT NULL DEFAULT false,
    error text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);

-- At most one active run per rule and symbol.
CREATE UNIQUE INDEX IF NOT EXISTS backtest_runs_one_active
    ON public.backtest_runs (rule_id, symbol)
    WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS backtest_runs_latest
    ON public.backtest_runs (rule_id, symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS public.backtest_trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES public.backtest_runs(id) ON DELETE CASCADE,
    trade_date date NOT NULL,
    side text NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    entry_time timestamptz NOT NULL,
    entry numeric NOT NULL,
    stop numeric NOT NULL,
    target numeric NOT NULL,
    exit_time timestamptz NOT NULL,
    exit numeric NOT NULL,
    exit_reason text NOT NULL CHECK (exit_reason IN ('target', 'stop', 'time')),
    r_gross numeric NOT NULL,
    cost_r numeric NOT NULL,
    r_net numeric NOT NULL,
    is_oos boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS backtest_trades_run_entry
    ON public.backtest_trades (run_id, entry_time);

CREATE TABLE IF NOT EXISTS public.backtest_locks (
    name text PRIMARY KEY,
    acquired_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only: RLS on, no policies for anon or authenticated.
ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_locks ENABLE ROW LEVEL SECURITY;
