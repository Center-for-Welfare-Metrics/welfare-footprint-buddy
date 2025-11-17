// CHANGE START – quota system upgrade: Anonymous daily quota helper
// This module handles daily scan quotas for anonymous users based on IP address
// Each anonymous IP gets 10 free scans per day (UTC), then must log in to continue

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Configurable limit: 10 scans per day per IP for anonymous users
const ANONYMOUS_DAILY_LIMIT = 10;

/**
 * Get current UTC date in YYYY-MM-DD format
 */
export function getTodayDateUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // "2025-01-17"
}

/**
 * Get current scan usage for an anonymous IP address today
 * @returns Current scans_used count, or 0 if no record exists
 */
export async function getAnonymousUsage(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<number> {
  const today = getTodayDateUTC();
  
  const { data, error } = await supabaseClient
    .from('anonymous_daily_usage')
    .select('scans_used')
    .eq('ip_address', ipAddress)
    .eq('date', today)
    .single();
  
  if (error) {
    // No record exists yet for today
    if (error.code === 'PGRST116') {
      return 0;
    }
    console.error('[anonymous-quota] Error fetching usage:', error);
    return 0;
  }
  
  return data?.scans_used ?? 0;
}

/**
 * Increment scan usage for an anonymous IP address
 * Uses UPSERT to handle both new and existing records
 */
export async function incrementAnonymousUsage(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const today = getTodayDateUTC();
  
  // First, try to get existing record
  const { data: existing } = await supabaseClient
    .from('anonymous_daily_usage')
    .select('scans_used')
    .eq('ip_address', ipAddress)
    .eq('date', today)
    .single();
  
  if (existing) {
    // Update existing record
    const { error } = await supabaseClient
      .from('anonymous_daily_usage')
      .update({
        scans_used: existing.scans_used + 1,
        last_updated: new Date().toISOString()
      })
      .eq('ip_address', ipAddress)
      .eq('date', today);
    
    if (error) {
      console.error('[anonymous-quota] Error updating usage:', error);
    }
  } else {
    // Insert new record
    const { error } = await supabaseClient
      .from('anonymous_daily_usage')
      .insert({
        ip_address: ipAddress,
        date: today,
        scans_used: 1,
        last_updated: new Date().toISOString()
      });
    
    if (error) {
      console.error('[anonymous-quota] Error inserting usage:', error);
    }
  }
}

/**
 * Check if an anonymous IP has exceeded the daily limit
 * @returns true if over limit, false if still has quota remaining
 */
export async function isAnonymousOverLimit(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<boolean> {
  const currentUsage = await getAnonymousUsage(ipAddress, supabaseClient);
  return currentUsage >= ANONYMOUS_DAILY_LIMIT;
}

/**
 * Get remaining scans for an anonymous IP today
 */
export async function getAnonymousRemaining(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<number> {
  const currentUsage = await getAnonymousUsage(ipAddress, supabaseClient);
  return Math.max(0, ANONYMOUS_DAILY_LIMIT - currentUsage);
}

// CHANGE END
