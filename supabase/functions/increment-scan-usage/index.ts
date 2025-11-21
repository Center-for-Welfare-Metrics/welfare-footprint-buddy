import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'increment-scan-usage' });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const reqLogger = logger.withRequest({ requestId, ip });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    reqLogger.info('Request started');

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      reqLogger.warn('No authorization header');
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      reqLogger.warn('Authentication failed', { error: userError.message });
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }
    const user = userData.user;
    if (!user) {
      reqLogger.warn('User not found');
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }
    reqLogger.info('User authenticated', { userId: user.id });

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

      if (updateError) {
        reqLogger.error('Usage update failed', { errorCode: updateError.code });
        return jsonErrorResponse(500, 'Unable to update scan usage. Please try again.');
      }
      reqLogger.info('Usage incremented', { newCount: existing.scans_used + 1 });
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

      if (insertError) {
        reqLogger.error('Usage insert failed', { errorCode: insertError.code });
        return jsonErrorResponse(500, 'Unable to update scan usage. Please try again.');
      }
      reqLogger.info('Usage record created', { scansUsed: 1 });
    }

    return jsonSuccessResponse({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Unable to update scan usage. Please try again.';
    if (errorMessage.includes('auth') || errorMessage.includes('JWT')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
