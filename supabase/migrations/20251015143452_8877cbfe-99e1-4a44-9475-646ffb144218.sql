-- Enable public read access to non-expired shared results
CREATE POLICY "Public can view non-expired shared results"
ON public.shared_results
FOR SELECT
USING (
  (expires_at IS NULL OR expires_at > now())
);

-- Allow anonymous users to increment view count
CREATE POLICY "Public can update view count"
ON public.shared_results
FOR UPDATE
USING (
  (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  (expires_at IS NULL OR expires_at > now())
);