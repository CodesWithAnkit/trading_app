-- Create AI Predictions table
CREATE TYPE prediction_direction AS ENUM ('Bullish', 'Bearish', 'Neutral');

CREATE TABLE public.ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    direction prediction_direction NOT NULL,
    confidence_score NUMERIC NOT NULL,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_ai_predictions_symbol_expires_at ON public.ai_predictions(symbol, expires_at);

-- Create Stock News table
CREATE TABLE public.stock_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    sentiment_score NUMERIC,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_stock_news_symbol ON public.stock_news(symbol);

-- Enable RLS
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_news ENABLE ROW LEVEL SECURITY;

-- Service Role full access (for NestJS backend)
CREATE POLICY "Service role full access on ai_predictions" ON public.ai_predictions
    USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on stock_news" ON public.stock_news
    USING (auth.role() = 'service_role');

-- Authenticated users can read
CREATE POLICY "Authenticated users can read ai_predictions" ON public.ai_predictions
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read stock_news" ON public.stock_news
    FOR SELECT USING (auth.role() = 'authenticated');
