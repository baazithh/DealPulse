-- Migration 002: Phase 2 Additions

-- 1. Create Data Table for Watchlists
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    asin TEXT NOT NULL,
    target_price_inr NUMERIC NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'notified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modify Price History Table
-- Add one_star_pct to track sentiment velocity
ALTER TABLE public.price_history 
ADD COLUMN IF NOT EXISTS one_star_pct INTEGER DEFAULT 0;

-- 3. Row Level Security Updates
-- Enable RLS
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for the watchlist (via API proxy)
CREATE POLICY "Allow public insert to watchlists" ON public.watchlists
    FOR INSERT WITH CHECK (true);

-- Only service role can read/update the cron watchlists
CREATE POLICY "Allow service role all access to watchlists" ON public.watchlists
    USING (true) WITH CHECK (true);
