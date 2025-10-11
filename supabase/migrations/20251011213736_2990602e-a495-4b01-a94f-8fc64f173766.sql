-- Fix RLS policy for anonymous share creation
DROP POLICY IF EXISTS "Anonymous users can create temporary shares" ON public.shared_results;

CREATE POLICY "Anonymous users can create temporary shares"
ON public.shared_results
FOR INSERT
WITH CHECK (
  user_id IS NULL 
  AND expires_at IS NOT NULL 
  AND expires_at > now() 
  AND expires_at <= (now() + INTERVAL '48 hours')
);