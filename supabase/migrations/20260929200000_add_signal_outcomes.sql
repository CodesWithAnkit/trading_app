-- Phase 6 (spec 0009): end-of-day outcome tracking on signals.
-- Populated by the 15:32 IST reconciliation task (cron + CLI). Idempotent.

ALTER TABLE public.signals
    ADD COLUMN IF NOT EXISTS actual_high NUMERIC,
    ADD COLUMN IF NOT EXISTS actual_low NUMERIC,
    ADD COLUMN IF NOT EXISTS actual_close NUMERIC,
    ADD COLUMN IF NOT EXISTS outcome_status TEXT,
    ADD COLUMN IF NOT EXISTS outcome_pnl_pct NUMERIC,
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'signals_outcome_status_check'
    ) THEN
        ALTER TABLE public.signals
            ADD CONSTRAINT signals_outcome_status_check
            CHECK (outcome_status IS NULL OR outcome_status IN ('WON', 'LOST', 'NEUTRAL'));
    END IF;
END $$;

-- Reconciliation, outcomes and top-setups all filter signals by day.
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals (created_at DESC);
