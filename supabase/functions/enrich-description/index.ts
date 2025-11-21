import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'enrich-description' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const reqLogger = logger.withRequest({ requestId, ip });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    reqLogger.info('Request started', { method: req.method });

    const { description, language = 'en' } = await req.json();

    if (!description || typeof description !== 'string') {
      reqLogger.warn('Invalid request: missing or invalid description');
      return jsonErrorResponse(400, 'Description is required and must be a string');
    }

    // AI Function Safety Layer v1: Input sanitization
    if (/[{}[\]]{2,}/.test(description)) {
      reqLogger.warn('Suspicious input detected', { descriptionPreview: description.slice(0, 50) });
      return jsonErrorResponse(400, 'Suspicious input detected.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      reqLogger.error('Configuration error: LOVABLE_API_KEY not set');
      return jsonErrorResponse(500, 'Service configuration error. Please contact support.');
    }

    // Load the enrichment prompt from the shared prompt loader
    const systemPrompt = await loadAndProcessPrompt('enrich_description', {});

    reqLogger.info('Calling AI service', { 
      language, 
      descriptionLength: description.length,
      descriptionPreview: description.slice(0, 50)
    });

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
        reqLogger.warn('Rate limit exceeded');
        return jsonErrorResponse(429, 'Rate limits exceeded, please try again later.');
      }
      if (response.status === 402) {
        reqLogger.error('Payment required for AI service');
        return jsonErrorResponse(402, 'Payment required, please add funds to your Lovable AI workspace.');
      }
      const errorText = await response.text();
      reqLogger.error('AI gateway error', { status: response.status, errorPreview: errorText.slice(0, 200) });
      return jsonErrorResponse(500, 'Description service temporarily unavailable. Please try again later.');
    }

    const data = await response.json();
    const enrichedDescription = data.choices?.[0]?.message?.content?.trim() || description;

    reqLogger.info('Request completed successfully', { 
      originalLength: description.length,
      enrichedLength: enrichedDescription.length
    });

    return jsonSuccessResponse({ enrichedDescription });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Unable to enrich description. Please try again.';
    
    if (errorMessage.includes('AI') || errorMessage.includes('gateway')) {
      safeMessage = 'Description service temporarily unavailable. Please try again later.';
    } else if (errorMessage.includes('LOVABLE_API_KEY')) {
      safeMessage = 'Service configuration error. Please contact support.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
