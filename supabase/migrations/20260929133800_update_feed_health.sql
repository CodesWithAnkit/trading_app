-- Update feed_health table for Angel One integration

ALTER TABLE public.feed_health DROP COLUMN IF EXISTS source;
ALTER TABLE public.feed_health DROP COLUMN IF EXISTS latency_ms;
ALTER TABLE public.feed_health DROP COLUMN IF EXISTS checked_at;

ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS last_tick_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS last_candle_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS connection_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS reconnect_count INTEGER DEFAULT 0;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS subscribed_instrument_count INTEGER DEFAULT 0;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS last_error_code TEXT;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS last_error_message TEXT;
ALTER TABLE public.feed_health ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
