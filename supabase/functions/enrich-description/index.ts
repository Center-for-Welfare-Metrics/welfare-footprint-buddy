import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
