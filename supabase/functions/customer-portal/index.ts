import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'customer-portal' });

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

  try {
    reqLogger.info('Request started');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      reqLogger.error('Configuration error: STRIPE_SECRET_KEY not set');
      return jsonErrorResponse(500, 'Service configuration error. Please contact support.');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
    if (!user?.email) {
      reqLogger.warn('User not found or email missing');
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }
    reqLogger.info('User authenticated', { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      reqLogger.warn('No Stripe customer found');
      return jsonErrorResponse(404, 'No billing account found. Please subscribe first.');
    }
    const customerId = customers.data[0].id;
    reqLogger.info('Stripe customer found');

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile?tab=subscription`,
    });
    reqLogger.info('Customer portal session created successfully');

    return jsonSuccessResponse({ url: portalSession.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Unable to access billing portal. Please try again.';
    
    if (errorMessage.includes('Stripe') || errorMessage.includes('customer')) {
      safeMessage = 'Billing service temporarily unavailable. Please try again later.';
    } else if (errorMessage.includes('auth') || errorMessage.includes('User not authenticated')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
