-- Drop the overly permissive SELECT policies on shared_results
DROP POLICY IF EXISTS "Anyone can view shared results" ON public.shared_results;
DROP POLICY IF EXISTS "View shared results by token only" ON public.shared_results;
DROP POLICY IF EXISTS "Allow public to view valid shared results" ON public.shared_results;

-- Create strict service_role-only SELECT policy
CREATE POLICY "Service role can select shared results"
ON public.shared_results FOR SELECT
USING (auth.role() = 'service_role');