import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'create-checkout' });

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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    reqLogger.info('Request started');

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      reqLogger.warn('No authorization header');
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      reqLogger.warn('User not authenticated');
      return jsonErrorResponse(401, 'Authentication required. Please sign in and try again.');
    }
    reqLogger.info('User authenticated', { userId: user.id });

    const { priceId } = await req.json();
    if (!priceId) {
      reqLogger.warn('Missing priceId in request');
      return jsonErrorResponse(400, 'Invalid subscription plan. Please select a valid plan.');
    }
    reqLogger.info('Creating checkout session', { priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      reqLogger.info('Found existing Stripe customer');
    } else {
      reqLogger.info('Creating new Stripe customer');
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/profile?tab=subscription&success=true`,
      cancel_url: `${req.headers.get("origin")}/profile?tab=subscription&canceled=true`,
    });

    reqLogger.info('Checkout session created successfully');

    return jsonSuccessResponse({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Failed to create checkout session. Please try again.';
    
    if (errorMessage.includes('STRIPE') || errorMessage.includes('stripe')) {
      safeMessage = 'Payment service temporarily unavailable. Please try again later.';
    } else if (errorMessage.includes('auth') || errorMessage.includes('User not authenticated')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    } else if (errorMessage.includes('Price ID')) {
      safeMessage = 'Invalid subscription plan. Please select a valid plan.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
