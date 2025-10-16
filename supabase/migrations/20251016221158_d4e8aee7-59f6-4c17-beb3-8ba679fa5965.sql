-- Create subscription tiers tracking table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scan usage tracking table
CREATE TABLE public.scan_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  scans_used INTEGER NOT NULL DEFAULT 0,
  additional_scans_purchased INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Create API rate limiting table
CREATE TABLE public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hour_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, hour_timestamp)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for scan_usage
CREATE POLICY "Users can view their own usage"
  ON public.scan_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON public.scan_usage FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for api_rate_limits
CREATE POLICY "Users can view their own rate limits"
  ON public.api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits"
  ON public.api_rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_scan_usage_updated_at
  BEFORE UPDATE ON public.scan_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();