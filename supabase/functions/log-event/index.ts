/**
 * Event Logging Edge Function
 * 
 * PURPOSE:
 * Logs analytics events from the frontend to the user_events table.
 * Supports optional study tracking fields for enrolled participants.
 * 
 * CALLED BY:
 * - Frontend: trackEvent() in src/integrations/analytics.ts
 * 
 * AUTHENTICATION:
 * - Public endpoint (no auth required)
 * - If user JWT is present, user_id is extracted and stored
 * 
 * REQUEST BODY:
 * {
 *   "eventType": "scan_completed",      // Required
 *   "properties": { ... },               // Optional event properties
 *   // Optional study fields (only for enrolled active participants):
 *   "participant_id": "uuid",
 *   "participant_code": "AB12-CD34",
 *   "treatment_group": "treatment_a",
 *   "study_version": "1.0"
 * }
 * 
 * RESPONSE:
 * - 200: { success: true }
 * - 400: Invalid eventType
 * - 500: Database or configuration error
 * 
 * PRIVACY:
 * - IP addresses are hashed (SHA-256) before storage
 * - No cookies or fingerprinting
 * - Study fields only stored when participant_id is provided
 * 
 * SIDE EFFECTS:
 * - Inserts record into user_events table
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getClientIp as getClientIpFromRateLimiter, checkIpRateLimit, rateLimitResponse } from "../_shared/ip-rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Hash IP address using SHA-256 (never store raw IP)
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Extract client IP from request headers
function getClientIp(req: Request): string | null {
  return req.headers.get('x-real-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         null;
}

// Extract user ID from JWT if present
function getUserIdFromAuth(req: Request): string | null {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // IP-based rate limiting: 120 requests per minute (analytics is high-volume)
  const clientIpForRateLimit = getClientIpFromRateLimiter(req);
  const rateLimit = checkIpRateLimit(clientIpForRateLimit, 120, 60000);
  if (!rateLimit.allowed) {
    console.warn(`[log-event] Rate limit exceeded for IP: ${clientIpForRateLimit.substring(0, 8)}...`);
    return rateLimitResponse(rateLimit.retryAfter);
  }

  try {
    const body = await req.json();
    const { 
      eventType, 
      properties,
      // Study fields (only for enrolled participants)
      participant_id,
      participant_code,
      treatment_group,
      study_version,
    } = body;

    // Validate eventType
    if (!eventType || typeof eventType !== 'string') {
      console.error('[log-event] Invalid eventType:', eventType);
      return new Response(
        JSON.stringify({ success: false, error: 'eventType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract context from request
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);
    const userId = getUserIdFromAuth(req);
    const userAgent = req.headers.get('user-agent') || null;

    // Initialize Supabase client with service role for insert
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[log-event] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build event record
    const eventRecord: Record<string, unknown> = {
      user_id: userId,
      ip_hash: ipHash,
      event_type: eventType,
      event_properties: properties ?? null,
      user_agent: userAgent,
    };

    // Add study fields only if participant_id is provided (enrolled active participant)
    if (participant_id) {
      eventRecord.participant_id = participant_id;
      eventRecord.participant_code = participant_code;
      eventRecord.treatment_group = treatment_group;
      eventRecord.study_version = study_version;
    }

    // Insert event into user_events table
    const { error } = await supabase
      .from('user_events')
      .insert(eventRecord);

    if (error) {
      console.error('[log-event] Database insert error:', error.message);
      return new Response(
        JSON.stringify({ success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[log-event] Event logged:', { eventType, userId: userId ?? 'anonymous', hasProperties: !!properties });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[log-event] Request failed:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
