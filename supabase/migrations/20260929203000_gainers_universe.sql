-- Phase 6 (spec 0009, AC-13 and AC-15): top gainers universe and duplicate free candles.

-- The IST day a stock was last selected as a top gainer. Today's universe = rows with today's date.
ALTER TABLE public.instruments
    ADD COLUMN IF NOT EXISTS last_selected_on DATE;

CREATE INDEX IF NOT EXISTS idx_instruments_last_selected_on ON public.instruments (last_selected_on);

-- Upserting instruments by symbol lookup needs a fast path; token is already unique.
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON public.instruments (symbol);

-- Candles become upserts on (symbol, timeframe, start_time). Remove existing duplicates first,
-- keeping the most recent write for each minute.
DELETE FROM public.candles c
USING public.candles newer
WHERE c.symbol = newer.symbol
  AND c.timeframe = newer.timeframe
  AND c.start_time = newer.start_time
  AND (newer.created_at, newer.id) > (c.created_at, c.id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'candles_symbol_timeframe_start_time_key'
    ) THEN
        ALTER TABLE public.candles
            ADD CONSTRAINT candles_symbol_timeframe_start_time_key UNIQUE (symbol, timeframe, start_time);
    END IF;
END $$;
