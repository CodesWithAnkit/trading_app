-- Spec 0010: live exit tracking for trade plans.

ALTER TABLE public.signals
    ADD COLUMN IF NOT EXISTS exit_price NUMERIC,
    ADD COLUMN IF NOT EXISTS exit_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS exit_reason TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signals_exit_reason_check') THEN
        ALTER TABLE public.signals
            ADD CONSTRAINT signals_exit_reason_check
            CHECK (exit_reason IS NULL OR exit_reason IN ('TARGET', 'STOP', 'TIME'));
    END IF;
END $$;

-- Restart reload and stale sweeps look up open plans by status and day.
CREATE INDEX IF NOT EXISTS idx_signals_status_created_at ON public.signals (status, created_at);

-- Closes an open plan and records its history row in one transaction.
-- Returns true only if this call moved the plan out of ACTIVE (so an exit is recorded once).
CREATE OR REPLACE FUNCTION public.close_signal_plan(
    p_signal_id UUID,
    p_to_status TEXT,
    p_exit_price NUMERIC,
    p_exit_at TIMESTAMP WITH TIME ZONE,
    p_exit_reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    closed_id UUID;
BEGIN
    IF p_to_status NOT IN ('TARGET_HIT', 'STOP_HIT', 'TIME_EXIT') THEN
        RAISE EXCEPTION 'Invalid exit status %', p_to_status;
    END IF;

    UPDATE public.signals
       SET status = p_to_status,
           exit_price = p_exit_price,
           exit_at = p_exit_at,
           exit_reason = p_exit_reason,
           updated_at = NOW()
     WHERE id = p_signal_id
       AND status = 'ACTIVE'
    RETURNING id INTO closed_id;

    IF closed_id IS NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.signal_status_history (signal_id, from_status, to_status, event_time)
    VALUES (p_signal_id, 'ACTIVE', p_to_status, p_exit_at);

    RETURN TRUE;
END;
$$;
