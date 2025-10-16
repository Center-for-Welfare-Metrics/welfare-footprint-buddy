import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SCAN-QUOTA] ${step}${detailsStr}`);
};

// Tier limits
const TIER_LIMITS = {
  free: 10,
  basic: 200,
  pro: 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get user subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw new Error(`Subscription lookup error: ${subError.message}`);
    }

    const tier = subscription?.status === 'active' 
      ? (subscription.product_id === 'prod_TFUNPU55PGdYSt' ? 'basic' : 
         subscription.product_id === 'prod_TFUNP2Cp1fIeun' ? 'pro' : 'free')
      : 'free';
    
    const scansLimit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    logStep("User tier determined", { tier, scansLimit });

    // Get or create usage record for current month
    const { data: usage, error: usageError } = await supabaseClient
      .from('scan_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    let scansUsed = 0;
    let additionalScans = 0;

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error(`Usage lookup error: ${usageError.message}`);
    }

    if (usage) {
      scansUsed = usage.scans_used || 0;
      additionalScans = usage.additional_scans_purchased || 0;
    }

    const totalLimit = scansLimit + additionalScans;
    const remaining = totalLimit - scansUsed;
    const canScan = remaining > 0;
    const usagePercent = totalLimit > 0 ? (scansUsed / totalLimit) * 100 : 0;
    const warningThreshold = usagePercent >= 80;

    logStep("Quota check complete", {
      scansUsed,
      totalLimit,
      remaining,
      canScan,
      usagePercent,
      warningThreshold
    });

    return new Response(JSON.stringify({
      can_scan: canScan,
      scans_used: scansUsed,
      scans_limit: scansLimit,
      additional_scans: additionalScans,
      total_limit: totalLimit,
      remaining,
      usage_percent: Math.round(usagePercent),
      warning: warningThreshold,
      tier
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-scan-quota", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
