-- Create function to delete scans older than 30 days
CREATE OR REPLACE FUNCTION public.delete_old_scans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.scans
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Log the cleanup (optional - can be removed if logging is not needed)
  RAISE NOTICE 'Deleted scans older than 30 days';
END;
$$;

-- Grant execute permission to authenticated users (if needed for manual trigger)
GRANT EXECUTE ON FUNCTION public.delete_old_scans() TO authenticated;

-- Create a trigger function that runs cleanup on scan inserts (piggyback approach)
-- This ensures cleanup runs periodically without requiring external cron
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_scans()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run cleanup probabilistically (1% of inserts) to avoid overhead
  IF random() < 0.01 THEN
    PERFORM public.delete_old_scans();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on scans table to piggyback cleanup
CREATE TRIGGER cleanup_old_scans_trigger
AFTER INSERT ON public.scans
FOR EACH ROW
EXECUTE FUNCTION public.trigger_cleanup_old_scans();

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_old_scans() IS 'Deletes scans older than 30 days for data retention policy';
COMMENT ON FUNCTION public.trigger_cleanup_old_scans() IS 'Trigger function that probabilistically runs cleanup on scan inserts';
COMMENT ON TRIGGER cleanup_old_scans_trigger ON public.scans IS 'Automatically triggers cleanup of old scans with 1% probability on each insert';