-- Migration 003: Phase 3 DealPulse Additions

-- 1. Create Search Logs Table for Crowd-Sourced Heatmap
CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    asin TEXT NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create PostgreSQL Function to calculate Top 5% percentiles
-- This function counts searches in the last 24h per ASIN, and returns a boolean True if the specified ASIN is in the top 5% of all searches.
CREATE OR REPLACE FUNCTION is_high_market_interest(target_asin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
WITH search_counts AS (
  SELECT asin, COUNT(*) as hit_count
  FROM public.search_logs
  WHERE searched_at > NOW() - INTERVAL '24 hours'
  GROUP BY asin
),
ranked_counts AS (
  SELECT asin, 
         PERCENT_RANK() OVER (ORDER BY hit_count DESC) as pct_rank
  FROM search_counts
)
SELECT EXISTS (
  SELECT 1 FROM ranked_counts 
  WHERE asin = target_asin AND pct_rank <= 0.05
);
$$;

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for the search logs
CREATE POLICY "Allow public insert to search_logs" ON public.search_logs
    FOR INSERT WITH CHECK (true);

-- Allow service role reading
CREATE POLICY "Allow service role all access to search_logs" ON public.search_logs
    USING (true) WITH CHECK (true);
