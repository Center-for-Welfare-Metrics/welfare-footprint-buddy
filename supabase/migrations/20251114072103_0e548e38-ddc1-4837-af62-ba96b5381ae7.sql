-- Drop all existing policies on shared_results
DROP POLICY IF EXISTS "Allow public read access to shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Users can create shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Only allow viewing valid shares" ON public.shared_results;

-- Create comprehensive RLS policies for shared_results

-- 1. Allow anyone (authenticated or anonymous) to INSERT shared results
CREATE POLICY "Anyone can create shared results"
ON public.shared_results
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Allow anyone (authenticated or anonymous) to SELECT/read shared results
CREATE POLICY "Anyone can view shared results"
ON public.shared_results
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Only allow users to update/delete their own shared results (authenticated only)
CREATE POLICY "Users can update their own shared results"
ON public.shared_results
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared results"
ON public.shared_results
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);