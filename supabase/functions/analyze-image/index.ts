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
1. Identify the product name and brand from the image.
2. Determine if it contains animal-derived ingredients.
3. If it contains animal-derived ingredients:
   - List them.
   - Infer the likely production system with detailed brand-specific information.
   - Provide potential welfare concerns STRICTLY LIMITED TO ANIMAL WELFARE (sentience, suffering, living conditions, physical/mental well-being of the animals).
   - Estimate data confidence for each field (Low, Medium, High).
4. If it does NOT contain animal-derived ingredients, only return the product name and set hasAnimalIngredients to false.

**CRITICAL - Animal Welfare Focus:**
ONLY discuss animal welfare concerns related to:
- Physical suffering (pain, injury, disease, mutilations)
- Mental suffering (stress, fear, frustration, boredom)
- Living conditions (confinement, crowding, barren environments)
- Natural behaviors (ability to express species-typical behaviors)
- Slaughter and handling practices
- Selective breeding effects on animal health

DO NOT INCLUDE:
- Environmental concerns (habitat destruction, pollution, deforestation)
- Sustainability issues (carbon footprint, water usage)
- Human health concerns (antibiotics resistance, food safety)
- Ecological impacts (biodiversity, ecosystem disruption)

**IMPORTANT - Production System Field:**
When you identify a known brand or product line:
- Research and include specific welfare certifications (e.g., "USDA Organic", "Certified Humane", "Animal Welfare Approved")
- Explain what those certifications mean in practice FOR ANIMAL WELFARE SPECIFICALLY (e.g., "USDA Organic implies some welfare standards but focuses more on organic feed and avoiding synthetic pesticides rather than guaranteeing high animal welfare")
- Note any limitations or gaps in available welfare information (e.g., "specific detailed information about pasture access is not readily available")
- Mention welfare-relevant factors like use of antibiotics or growth hormones (only as they relate to animal health and welfare)
- Provide context about industry-standard practices if brand-specific information is limited
- Be informative but honest about what is and isn't known

Example: "Kirkland Signature Organic Ground Beef meets certain animal welfare standards by being USDA Organic and raised without antibiotics or growth hormones, but specific detailed information about its animal welfare practices, such as pasture access, is not readily available. While 'USDA Organic' implies some welfare standards, it doesn't guarantee high animal welfare, focusing more on organic feed and avoiding synthetic pesticides."

**JSON Schema:**
{
  "productName": {"value": "string", "confidence": "Low|Medium|High"},
  "hasAnimalIngredients": true|false,
  "animalIngredients": {"value": "string", "confidence": "Low|Medium|High"},
  "productionSystem": {"value": "string (detailed, multi-sentence description)", "confidence": "Low|Medium|High", "assumption": "string (optional)"},
  "welfareConcerns": {"value": "string (multi-line allowed, ANIMAL WELFARE ONLY)", "confidence": "Low|Medium|High"},
  "disclaimer": "This analysis was generated using AI and may contain errors or inaccuracies. It is a preliminary estimate and has not been scientifically validated by the Welfare Footprint Institute. Please verify information independently before making decisions."
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
