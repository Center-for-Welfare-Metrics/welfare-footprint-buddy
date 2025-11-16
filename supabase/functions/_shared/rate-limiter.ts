import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

interface RateLimitConfig {
  free: number;
  basic: number;
  pro: number;
}

// Rate limits per hour by tier
const DEFAULT_LIMITS: RateLimitConfig = {
  free: 10,
  basic: 50,
  pro: 200,
};

export async function checkRateLimit(
  userId: string,
  supabaseClient: any,
  customLimits?: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limits = customLimits || DEFAULT_LIMITS;
  
  // Get current hour timestamp
  const hourTimestamp = new Date();
  hourTimestamp.setMinutes(0, 0, 0);
  
  // Get user subscription
  const { data: subscription } = await supabaseClient
    .from('user_subscriptions')
    .select('product_id, status')
    .eq('user_id', userId)
    .single();
  
  // Determine tier
  let tier: 'free' | 'basic' | 'pro' = 'free';
  if (subscription?.status === 'active') {
    if (subscription.product_id === 'prod_TFUNPU55PGdYSt') tier = 'basic';
    else if (subscription.product_id === 'prod_TFUNP2Cp1fIeun') tier = 'pro';
  }
  
  const limit = limits[tier];
  
  // Get or create rate limit record
  const { data: existing } = await supabaseClient
    .from('api_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('hour_timestamp', hourTimestamp.toISOString())
    .single();
  
  const currentCount = existing?.request_count || 0;
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit };
  }
  
  // Increment count
  if (existing) {
    await supabaseClient
      .from('api_rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('user_id', userId)
      .eq('hour_timestamp', hourTimestamp.toISOString());
  } else {
    await supabaseClient
      .from('api_rate_limits')
      .insert({
        user_id: userId,
        hour_timestamp: hourTimestamp.toISOString(),
        request_count: 1,
      });
  }
  
  return { allowed: true, remaining: limit - currentCount - 1, limit };
}
