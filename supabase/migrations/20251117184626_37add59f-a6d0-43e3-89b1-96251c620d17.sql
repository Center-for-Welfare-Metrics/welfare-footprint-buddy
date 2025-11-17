-- CHANGE START – quota system upgrade: Create anonymous_daily_usage table
-- Track anonymous users' daily scan usage by IP address

CREATE TABLE IF NOT EXISTS public.anonymous_daily_usage (
  ip_address TEXT NOT NULL,
  date TEXT NOT NULL,  -- Format: YYYY-MM-DD (UTC)
  scans_used INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ip_address, date)
);

-- Add index for faster lookups by date (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_anonymous_daily_usage_date ON public.anonymous_daily_usage(date);

-- RLS: Service role only (backend functions manage this table)
ALTER TABLE public.anonymous_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage anonymous usage"
  ON public.anonymous_daily_usage
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.anonymous_daily_usage IS 'Tracks daily scan usage for anonymous users by IP address. Each IP gets 10 free scans per day (UTC). Resets automatically when date changes.';
-- CHANGE END