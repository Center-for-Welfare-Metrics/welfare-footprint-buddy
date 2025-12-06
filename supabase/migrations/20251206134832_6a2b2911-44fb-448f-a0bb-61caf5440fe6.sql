-- Create user_events table for lightweight analytics
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  ip_hash text,
  event_type text NOT NULL,
  event_properties jsonb,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- RLS: allow inserts from authenticated users
CREATE POLICY "Allow insert for authenticated users"
ON public.user_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS: allow inserts from anon as well
CREATE POLICY "Allow insert for anon"
ON public.user_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Create index on timestamp for efficient querying
CREATE INDEX idx_user_events_timestamp ON public.user_events(timestamp DESC);

-- Create index on event_type for filtering
CREATE INDEX idx_user_events_event_type ON public.user_events(event_type);