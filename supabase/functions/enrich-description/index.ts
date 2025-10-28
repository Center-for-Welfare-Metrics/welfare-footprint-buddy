import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a food description enrichment expert. Your task is to transform brief user inputs into informative, natural-language summaries.

CRITICAL RULES:
1. Create a SHORT, NATURAL summary (1-2 sentences maximum)
2. Include notable ingredients or components when known
3. Mention cultural, regional, or culinary context when applicable
4. PRESERVE any welfare-related information (e.g., "free-range", "wild-caught", "cage-free", "organic", "pasture-raised")
5. For well-known dishes, briefly mention typical ingredients or origin
6. NEVER invent unrelated information
7. If the input is already descriptive, enhance it slightly without changing the meaning
8. Keep the tone informative but concise

EXAMPLES:

Input: "moqueca"
Output: "Moqueca is a Brazilian fish stew traditionally made with coconut milk, tomatoes, peppers, and served over rice with lime and cilantro."

Input: "omelet with cage-free eggs"
Output: "An omelet made with eggs from a certified cage-free producer."

Input: "wild salmon sushi"
Output: "Wild-caught salmon sushi with rice, typically served with soy sauce and wasabi."

Input: "chicken curry"
Output: "Chicken curry with coconut milk and spices, a common South Asian dish."

Input: "cheese pizza"
Output: "Pizza with tomato sauce and mozzarella cheese."

Input: "free-range chicken roast"
Output: "Roast chicken from free-range producers, typically served with vegetables or potatoes."

Return ONLY the enriched description as plain text (not JSON).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Enrich this food description (language: ${language}):\n\n${description}` }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    });

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

    console.log('[enrich-description] Success:', { original: description, enriched: enrichedDescription });

    return new Response(
      JSON.stringify({ enrichedDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-description function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
