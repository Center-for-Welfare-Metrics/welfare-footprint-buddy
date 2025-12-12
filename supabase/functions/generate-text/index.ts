import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { getClientIp, checkIpRateLimit, rateLimitResponse } from "../_shared/ip-rate-limiter.ts";
import { AIHandler, callAI } from '../_shared/ai-handler.ts';
import { GeminiProvider } from '../_shared/providers/gemini.ts';

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

// Initialize AI Handler once (consistent with other AI edge functions)
const initAIHandler = (apiKey: string) => {
  if (!(globalThis as any).__aiHandler) {
    const handler = new AIHandler();
    
    // Note: Cache not initialized for generate-text as it's a general-purpose endpoint
    // and caching arbitrary prompts may not be appropriate
    
    const geminiProvider = new GeminiProvider(apiKey, 'gemini-2.0-flash-exp');
    handler.registerProvider(geminiProvider);
    handler.setDefaultProvider('gemini');
    (globalThis as any).__aiHandler = handler;
    console.log('[generate-text] AI Handler initialized with Gemini provider');
  }
};

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

    // Initialize the shared AI Handler
    initAIHandler(GEMINI_API_KEY);

    // Call AI using the shared handler (consistent with analyze-image, suggest-ethical-swap, etc.)
    const aiResponse = await callAI({
      prompt,
      timeout: 25000, // 25s timeout (slightly less than edge function timeout)
      cache: 'bypass', // Don't cache general-purpose text generation
    });

    if (!aiResponse.success) {
      console.error('[generate-text] AI Handler error:', aiResponse.error);
      throw new Error(aiResponse.error?.message || 'AI request failed');
    }

    const text = aiResponse.data?.text;
    if (!text) {
      throw new Error('No text response from AI');
    }

    // Return response in the same format as the original Gemini API response
    // to maintain backward compatibility with existing clients
    const data = {
      candidates: [{
        content: {
          parts: [{ text }]
        }
      }],
      // Include original raw response if available
      ...(aiResponse.data?.raw || {}),
      _metadata: {
        provider: aiResponse.metadata.provider,
        model: aiResponse.metadata.model,
        latencyMs: aiResponse.metadata.latencyMs,
      }
    };

    console.log('✅ Text generation completed via AI Handler');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-text function:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Text generation failed. Please try again.';
    
    if (errorMessage.includes('GEMINI_API_KEY')) {
      safeMessage = 'Service configuration error. Please contact support.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      safeMessage = 'Request timed out. Please try again.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT')) {
      safeMessage = 'AI service busy. Please try again later.';
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
