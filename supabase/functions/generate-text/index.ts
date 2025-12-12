import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { getClientIp, checkIpRateLimit, rateLimitResponse } from "../_shared/ip-rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_PROMPT_LENGTH = 10000;

function validateInput(body: any): { valid: boolean; data?: { prompt: string }; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string' };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` };
  }

  // AI Function Safety Layer v1: Input sanitization
  if (/[{}[\]]{2,}/.test(prompt)) {
    return { valid: false, error: 'Suspicious input detected.' };
  }

  return {
    valid: true,
    data: { prompt: prompt.trim() }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // IP-based rate limiting: 20 requests per minute
  const clientIp = getClientIp(req);
  const rateLimit = checkIpRateLimit(clientIp, 20, 60000);
  if (!rateLimit.allowed) {
    console.warn(`[generate-text] Rate limit exceeded for IP: ${clientIp.substring(0, 8)}...`);
    return rateLimitResponse(rateLimit.retryAfter);
  }

  try {
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt } = validation.data!;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    // AI Function Safety Layer v1: 25s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      }
    ).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Text generation completed');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-text function:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Text generation failed. Please try again.';
    
    if (errorMessage.includes('Gemini') || errorMessage.includes('API')) {
      safeMessage = 'AI service temporarily unavailable. Please try again later.';
    } else if (errorMessage.includes('GEMINI_API_KEY')) {
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