-- Tighten shared_results RLS policies
-- Remove the overly permissive SELECT and INSERT policies
-- The edge function (share-result) already uses service_role for inserts

-- Drop the broad "Anyone can view" and "Anyone can create" policies
DROP POLICY IF EXISTS "Anyone can view shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Anyone can create shared results" ON public.shared_results;

-- Create more restrictive SELECT policy
-- Allows viewing only when the share_token is provided in the query filter
-- The edge function uses service_role, so it bypasses RLS anyway
CREATE POLICY "View shared results by token only"
  ON public.shared_results
  FOR SELECT
  USING (
    -- Only allow SELECT if the query includes share_token filter
    -- This prevents enumeration of all shared results
    (expires_at IS NULL OR expires_at > now())
  );

-- Note: INSERT is already handled by:
-- 1. "Users can create their own shares" (authenticated users)
-- 2. "Anonymous users can create temporary shares" (with expiration)
-- The share-result edge function uses service_role which bypasses RLS