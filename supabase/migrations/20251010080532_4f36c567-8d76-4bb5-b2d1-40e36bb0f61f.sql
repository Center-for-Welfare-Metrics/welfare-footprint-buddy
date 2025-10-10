-- ============================================================
-- AI Response Cache & Performance Tracking System
-- Version: 1.0
-- Purpose: Implement content-based caching and cost analytics
-- ============================================================

-- ============================================================
-- TABLE 1: AI Response Cache
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key (content-based, privacy-safe)
  content_hash text NOT NULL UNIQUE,
  
  -- Versioning for auto-invalidation
  prompt_template_id text NOT NULL,
  prompt_version text NOT NULL,
  
  -- Cached data
  response_data jsonb NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  
  -- Performance metadata
  tokens_used integer,
  latency_ms integer NOT NULL,
  hit_count integer DEFAULT 1,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_hit_count CHECK (hit_count >= 1)
);

-- Indexes for fast lookups
CREATE UNIQUE INDEX idx_cache_content_hash ON public.ai_response_cache(content_hash);
CREATE INDEX idx_cache_expiry ON public.ai_response_cache(expires_at);
CREATE INDEX idx_cache_prompt_version ON public.ai_response_cache(prompt_template_id, prompt_version);
CREATE INDEX idx_cache_provider_model ON public.ai_response_cache(provider, model);

-- Enable RLS (cache is service-role only, no client access)
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Service role policies (separate for each operation)
CREATE POLICY "Cache select by service role"
  ON public.ai_response_cache FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Cache insert by service role"
  ON public.ai_response_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Cache update by service role"
  ON public.ai_response_cache FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Cache delete by service role"
  ON public.ai_response_cache FOR DELETE
  USING (auth.role() = 'service_role');

-- Add table comment
COMMENT ON TABLE public.ai_response_cache IS 'Content-based cache for AI responses with 7-day TTL and auto-invalidation on prompt/model changes';

-- ============================================================
-- TABLE 2: AI Usage Metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Temporal data
  timestamp timestamptz DEFAULT now(),
  
  -- Request metadata
  provider text NOT NULL,
  model text NOT NULL,
  operation text NOT NULL,
  
  -- Performance metrics
  latency_ms integer NOT NULL,
  tokens_used integer,
  
  -- Cache performance
  cache_hit boolean DEFAULT false,
  cache_key_hash text,
  
  -- Cost estimation
  estimated_cost_usd numeric(10, 8),
  
  CONSTRAINT valid_timestamp CHECK (timestamp <= now()),
  CONSTRAINT valid_latency CHECK (latency_ms >= 0)
);

-- Indexes for analytics queries
CREATE INDEX idx_metrics_timestamp ON public.ai_usage_metrics(timestamp DESC);
CREATE INDEX idx_metrics_provider_model_op ON public.ai_usage_metrics(provider, model, operation, timestamp DESC);
CREATE INDEX idx_metrics_cache_hit ON public.ai_usage_metrics(cache_hit, timestamp DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can write
CREATE POLICY "Metrics insert by service role"
  ON public.ai_usage_metrics FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can read
CREATE POLICY "Metrics select by service role"
  ON public.ai_usage_metrics FOR SELECT
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.ai_usage_metrics IS 'Detailed AI usage tracking for cost analysis and performance monitoring (180-day retention)';

-- ============================================================
-- TABLE 3: Daily Metrics Rollup (for fast historical queries)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_metrics_daily_rollup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Date (date-only, no time component)
  date date NOT NULL,
  
  -- Grouping dimensions
  provider text NOT NULL,
  model text NOT NULL,
  operation text NOT NULL,
  
  -- Request counts
  total_requests integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  cache_misses integer NOT NULL DEFAULT 0,
  hit_rate numeric(5, 4), -- e.g., 0.7523 = 75.23%
  
  -- Latency percentiles (milliseconds)
  avg_latency_ms integer,
  p95_latency_ms integer,
  p99_latency_ms integer,
  
  -- Token usage
  total_tokens bigint DEFAULT 0,
  
  -- Cost
  estimated_cost_usd numeric(12, 6),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one row per day/provider/model/operation
  CONSTRAINT unique_daily_rollup UNIQUE (date, provider, model, operation)
);

-- Index for time-series queries
CREATE INDEX idx_rollup_date ON public.ai_metrics_daily_rollup(date DESC);
CREATE INDEX idx_rollup_provider_model ON public.ai_metrics_daily_rollup(provider, model, date DESC);

-- Enable RLS
ALTER TABLE public.ai_metrics_daily_rollup ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Rollup select by service role"
  ON public.ai_metrics_daily_rollup FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Rollup insert by service role"
  ON public.ai_metrics_daily_rollup FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Rollup update by service role"
  ON public.ai_metrics_daily_rollup FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Rollup delete by service role"
  ON public.ai_metrics_daily_rollup FOR DELETE
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.ai_metrics_daily_rollup IS 'Daily aggregated metrics for fast historical analytics';

-- ============================================================
-- CLEANUP FUNCTIONS
-- ============================================================

-- Function to delete expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % expired AI cache entries', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Function to delete old metrics (>180 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_usage_metrics
  WHERE timestamp < NOW() - INTERVAL '180 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % AI metrics older than 180 days', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Trigger function to probabilistically run cleanup
CREATE OR REPLACE FUNCTION public.trigger_ai_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1% probability on each cache insert
  IF random() < 0.01 THEN
    PERFORM public.cleanup_expired_cache();
    PERFORM public.cleanup_old_metrics();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to cache table
DROP TRIGGER IF EXISTS ai_cache_cleanup_trigger ON public.ai_response_cache;
CREATE TRIGGER ai_cache_cleanup_trigger
AFTER INSERT ON public.ai_response_cache
FOR EACH ROW
EXECUTE FUNCTION public.trigger_ai_cleanup();

-- ============================================================
-- DAILY ROLLUP AGGREGATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.aggregate_daily_metrics(target_date date DEFAULT CURRENT_DATE - 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing rollup for target date (idempotent)
  DELETE FROM public.ai_metrics_daily_rollup
  WHERE date = target_date;
  
  -- Insert aggregated metrics
  INSERT INTO public.ai_metrics_daily_rollup (
    date,
    provider,
    model,
    operation,
    total_requests,
    cache_hits,
    cache_misses,
    hit_rate,
    avg_latency_ms,
    p95_latency_ms,
    p99_latency_ms,
    total_tokens,
    estimated_cost_usd
  )
  SELECT
    target_date,
    provider,
    model,
    operation,
    COUNT(*) as total_requests,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
    SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as cache_misses,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 4)
      ELSE 0
    END as hit_rate,
    ROUND(AVG(latency_ms))::integer as avg_latency_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::integer as p95_latency_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::integer as p99_latency_ms,
    SUM(COALESCE(tokens_used, 0)) as total_tokens,
    SUM(COALESCE(estimated_cost_usd, 0)) as estimated_cost_usd
  FROM public.ai_usage_metrics
  WHERE timestamp >= target_date
    AND timestamp < target_date + INTERVAL '1 day'
  GROUP BY provider, model, operation;
  
  RAISE NOTICE 'Aggregated metrics for %', target_date;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_daily_metrics(date) TO service_role;

-- ============================================================
-- CACHE INVALIDATION FUNCTIONS (Admin Control)
-- ============================================================

-- Flush all cache
CREATE OR REPLACE FUNCTION public.admin_flush_all_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_response_cache;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Flushed all AI cache (% entries)', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Invalidate by prompt template/version
CREATE OR REPLACE FUNCTION public.admin_invalidate_by_prompt(
  template_id text,
  version text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF version IS NULL THEN
    -- Invalidate all versions of this template
    DELETE FROM public.ai_response_cache
    WHERE prompt_template_id = template_id;
  ELSE
    -- Invalidate specific version
    DELETE FROM public.ai_response_cache
    WHERE prompt_template_id = template_id
      AND prompt_version = version;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Invalidated % cache entries for prompt %', deleted_count, template_id;
  RETURN deleted_count;
END;
$$;

-- Invalidate by model
CREATE OR REPLACE FUNCTION public.admin_invalidate_by_model(
  model_name text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE model = model_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Invalidated % cache entries for model %', deleted_count, model_name;
  RETURN deleted_count;
END;
$$;

-- Invalidate by cache key
CREATE OR REPLACE FUNCTION public.admin_invalidate_by_key(
  key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE content_hash = key;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_flush_all_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_invalidate_by_prompt(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_invalidate_by_model(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_invalidate_by_key(text) TO service_role;