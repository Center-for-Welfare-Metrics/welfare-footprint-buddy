import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'check-subscription' });

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      reqLogger.error('Configuration error: STRIPE_SECRET_KEY not set');
      return jsonErrorResponse(500, 'Service configuration error. Please contact support.');
    }

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
      reqLogger.info('No Stripe customer found, setting free tier');
      
      // Upsert subscription record for free tier
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          product_id: 'free',
          status: 'free',
        }, { onConflict: 'user_id' });
      
      return jsonSuccessResponse({ 
        subscribed: false,
        product_id: 'free',
        tier: 'free',
        scans_limit: 10
      });
    }

    const customerId = customers.data[0].id;
    reqLogger.info('Stripe customer found', { hasCustomer: true });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = 'free';
    let tier = 'free';
    let scansLimit = 10;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      productId = subscription.items.data[0].price.product as string;
      
      // Determine tier and limits based on product
      if (productId === 'prod_TFUNPU55PGdYSt') {
        tier = 'basic';
        scansLimit = 200;
      } else if (productId === 'prod_TFUNP2Cp1fIeun') {
        tier = 'pro';
        scansLimit = 1000;
      }
      
      reqLogger.info('Active subscription found', { tier, productId });

      // Update subscription record in database
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          product_id: productId,
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: subscriptionEnd,
        }, { onConflict: 'user_id' });
    } else {
      reqLogger.info('No active subscription, setting free tier');
      
      // Update to free tier
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          product_id: 'free',
          status: 'free',
        }, { onConflict: 'user_id' });
    }

    return jsonSuccessResponse({
      subscribed: hasActiveSub,
      product_id: productId,
      tier,
      scans_limit: scansLimit,
      subscription_end: subscriptionEnd
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Unable to check subscription status. Please try again.';
    if (errorMessage.includes('auth') || errorMessage.includes('JWT')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    } else if (errorMessage.includes('Stripe') || errorMessage.includes('subscription')) {
      safeMessage = 'Subscription service temporarily unavailable. Please try again later.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
