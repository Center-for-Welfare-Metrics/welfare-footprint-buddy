-- Enable RLS on shared_results if not already enabled
ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to shared results" ON public.shared_results;

-- Create policy to allow anyone (even anonymous users) to read shared results
CREATE POLICY "Allow public read access to shared results"
ON public.shared_results
FOR SELECT
TO anon, authenticated
USING (true);

-- Users can insert their own shared results (authenticated only)
DROP POLICY IF EXISTS "Users can create shared results" ON public.shared_results;
CREATE POLICY "Users can create shared results"
ON public.shared_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only allow viewing non-expired shares (optional protection)
DROP POLICY IF EXISTS "Only allow viewing valid shares" ON public.shared_results;
CREATE POLICY "Only allow viewing valid shares"
ON public.shared_results
FOR SELECT
TO anon, authenticated
USING (expires_at IS NULL OR expires_at > NOW());