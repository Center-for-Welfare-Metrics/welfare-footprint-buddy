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
    const { imageData, additionalIngredients, additionalDescription } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    let prompt = `You are an AI assistant specializing in animal welfare analysis. Your task is to analyze the provided product image and provide a structured JSON response. 

**Instructions:**
1. Identify the product name from the image.
2. Determine if it contains animal-derived ingredients.
3. If it contains animal-derived ingredients:
   - List them.
   - Infer the likely production system.
   - Provide potential welfare concerns.
   - Estimate data confidence for each field (Low, Medium, High).
4. If it does NOT contain animal-derived ingredients, only return the product name and set hasAnimalIngredients to false.

**JSON Schema:**
{
  "productName": {"value": "string", "confidence": "Low|Medium|High"},
  "hasAnimalIngredients": true|false,
  "animalIngredients": {"value": "string", "confidence": "Low|Medium|High"},
  "productionSystem": {"value": "string", "confidence": "Low|Medium|High", "assumption": "string (optional)"},
  "welfareConcerns": {"value": "string (multi-line allowed)", "confidence": "Low|Medium|High"},
  "disclaimer": "This is a Preliminary AI Estimate and has not been scientifically validated by the Welfare Footprint Institute."
}

Analyze the image and return ONLY valid JSON matching this schema.`;

    // Add additional context if provided by user
    if (additionalIngredients || additionalDescription) {
      prompt += `\n\nADDITIONAL INFORMATION PROVIDED BY USER:`;
      if (additionalIngredients) {
        prompt += `\nAdditional Ingredients: ${additionalIngredients}`;
      }
      if (additionalDescription) {
        prompt += `\nAdditional Description: ${additionalDescription}`;
      }
      prompt += `\n\nPlease incorporate this additional information into your analysis and update the confidence levels accordingly.`;
    }

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: imageData.mimeType,
              data: imageData.base64
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
