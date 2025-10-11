-- Create shared_results table for shareable analysis results
CREATE TABLE public.shared_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  CONSTRAINT valid_expiry CHECK (
    (user_id IS NULL AND expires_at IS NOT NULL) OR
    (user_id IS NOT NULL AND expires_at IS NULL)
  )
);

-- Enable RLS
ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view shared results (public access)
CREATE POLICY "Anyone can view shared results"
ON public.shared_results
FOR SELECT
USING (
  expires_at IS NULL OR expires_at > NOW()
);

-- Policy: Authenticated users can create their own shares
CREATE POLICY "Users can create their own shares"
ON public.shared_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Anonymous users can create temporary shares
CREATE POLICY "Anonymous users can create temporary shares"
ON public.shared_results
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL AND 
  expires_at = NOW() + INTERVAL '48 hours'
);

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.shared_results
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update view count
CREATE POLICY "Anyone can update view count"
ON public.shared_results
FOR UPDATE
USING (expires_at IS NULL OR expires_at > NOW())
WITH CHECK (expires_at IS NULL OR expires_at > NOW());

-- Create index for share token lookups
CREATE INDEX idx_shared_results_token ON public.shared_results(share_token);
CREATE INDEX idx_shared_results_expires_at ON public.shared_results(expires_at);

-- Function to cleanup expired shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.shared_results
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % expired shared results', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Trigger to probabilistically run cleanup (1% chance on insert)
CREATE OR REPLACE FUNCTION public.trigger_share_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF random() < 0.01 THEN
    PERFORM public.cleanup_expired_shares();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_shares_on_insert
AFTER INSERT ON public.shared_results
FOR EACH ROW
EXECUTE FUNCTION public.trigger_share_cleanup();