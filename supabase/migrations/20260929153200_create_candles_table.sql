-- Create candles table for persisting aggregated market data

CREATE TABLE public.candles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol text NOT NULL,
    instrument_token text,
    timeframe text NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    volume numeric DEFAULT 0,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    is_complete boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Index for querying recent candles efficiently by symbol and timeframe
CREATE INDEX idx_candles_symbol_time_timeframe ON public.candles(symbol, timeframe, start_time DESC);
