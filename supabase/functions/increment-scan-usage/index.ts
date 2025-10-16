import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INCREMENT-SCAN-USAGE] ${step}${detailsStr}`);
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

    // Upsert usage record
    const { data: existing } = await supabaseClient
      .from('scan_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    if (existing) {
      // Increment existing record
      const { error: updateError } = await supabaseClient
        .from('scan_usage')
        .update({ scans_used: existing.scans_used + 1 })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      logStep("Usage incremented", { newCount: existing.scans_used + 1 });
    } else {
      // Create new record
      const { error: insertError } = await supabaseClient
        .from('scan_usage')
        .insert({
          user_id: user.id,
          month_year: monthYear,
          scans_used: 1,
          additional_scans_purchased: 0
        });

      if (insertError) throw insertError;
      logStep("Usage record created", { scansUsed: 1 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in increment-scan-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
