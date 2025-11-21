import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";
import { checkRateLimit } from '../_shared/rate-limiter.ts';
// CHANGE START – quota system upgrade
import { isAnonymousOverLimit, incrementAnonymousUsage } from '../_shared/anonymous-quota.ts';
// CHANGE END

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client for auth and rate limiting
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // CHANGE START – quota system upgrade: Extract IP address for anonymous quota tracking
    const ipAddress = req.headers.get("x-real-ip") ??
                      req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ??
                      "unknown";
    // CHANGE END
    
    // Try to get authenticated user, but allow anonymous access
    const authHeader = req.headers.get("Authorization");
    let userId = 'anonymous';
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
      }
    }

    // Check rate limit (works for both authenticated and anonymous users)
    const rateLimitResult = await checkRateLimit(userId, supabaseClient);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // CHANGE START – quota system upgrade: Enforce anonymous daily quota (10 scans/day/IP)
    if (userId === 'anonymous') {
      const overLimit = await isAnonymousOverLimit(ipAddress, supabaseClient);
      if (overLimit) {
        console.log(`[enrich-description] Anonymous IP ${ipAddress} exceeded daily limit`);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'DAILY_LIMIT_REACHED',
              message: "You've reached the free daily limit. Please log in to continue using the scanner.",
              requiresAuth: true
            }
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Increment anonymous usage immediately (before AI call)
      await incrementAnonymousUsage(ipAddress, supabaseClient);
      console.log(`[enrich-description] Anonymous IP ${ipAddress} scan counted`);
    }
    // CHANGE END
    
    const { description, language = 'en' } = await req.json();

    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Description is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI Function Safety Layer v1: Input sanitization
    if (/[{}[\]]{2,}/.test(description)) {
      return new Response(
        JSON.stringify({ error: 'Suspicious input detected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Load the enrichment prompt from the shared prompt loader
    const systemPrompt = await loadAndProcessPrompt('enrich_description', {});

    // AI Function Safety Layer v1: 25s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Enrich this food description (language: ${language}):\n\n${description}` }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enrichedDescription = data.choices?.[0]?.message?.content?.trim() || description;

    console.log('[enrich-description] ✅ Success');

    return new Response(
      JSON.stringify({ enrichedDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-description function:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Unable to enrich description. Please try again.';
    
    if (errorMessage.includes('AI') || errorMessage.includes('gateway')) {
      safeMessage = 'Description service temporarily unavailable. Please try again later.';
    } else if (errorMessage.includes('LOVABLE_API_KEY')) {
      safeMessage = 'Service configuration error. Please contact support.';
    }
    
    return new Response(
      JSON.stringify({ error: safeMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
