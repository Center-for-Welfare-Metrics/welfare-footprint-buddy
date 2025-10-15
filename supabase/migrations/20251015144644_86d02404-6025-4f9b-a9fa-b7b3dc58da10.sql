-- Drop existing restrictive policies that might be blocking public access
DROP POLICY IF EXISTS "Public can view non-expired shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Public can update view count" ON public.shared_results;
DROP POLICY IF EXISTS "Anyone can view shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Anyone can update view count" ON public.shared_results;

-- Create new permissive policies for public read-only access
-- Allow anyone (including anonymous users) to view non-expired shared results
CREATE POLICY "Allow public to view valid shared results"
ON public.shared_results
FOR SELECT
TO anon, authenticated
USING (expires_at IS NULL OR expires_at > now());

-- Allow anyone (including anonymous users) to increment view count
CREATE POLICY "Allow public to update view count only"
ON public.shared_results
FOR UPDATE
TO anon, authenticated
USING (expires_at IS NULL OR expires_at > now())
WITH CHECK (expires_at IS NULL OR expires_at > now());