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
    const { productName, animalIngredients, ethicalLens } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log(`Generating ethical swap suggestions for: ${productName}, ethical lens: ${ethicalLens}`);

    // Define the ethical lens positions
    const lensDescriptions = {
      1: {
        title: "Prioritize Big Welfare Gains",
        instruction: `Recommend THE SAME PRODUCT (${productName}), but sourced from animals raised under high-welfare conditions (e.g., certified enriched, pasture-based, cage-free, or certified humane systems).
        
If NO such high-welfare version exists in the market:
1. Inform the user that no verified high-welfare alternative is currently available for this specific product.
2. Describe what a higher-welfare version would involve (e.g., better housing, elimination of painful mutilations, slower-growing breeds, outdoor access, enriched environments).
3. Suggest similar products in the same category that DO have high-welfare certifications available.`
      },
      2: {
        title: "Moderate Harm Reduction",
        instruction: `Suggest products that minimize suffering in the most intensive systems. Look for:
- Products with basic welfare improvements (e.g., cage-free eggs, antibiotic-free meat)
- Products from systems that eliminate the most severe practices
- Products with moderate welfare certifications

Explain why each recommendation fits this moderate harm reduction approach.`
      },
      3: {
        title: "Strong Harm Reduction",
        instruction: `Suggest products meeting multiple high-welfare criteria. Look for:
- Products with multiple welfare certifications (e.g., Animal Welfare Approved, Certified Humane, Global Animal Partnership Step 4+)
- Products from regenerative or high-welfare farming systems
- Products where animals have outdoor access, natural behaviors, and species-appropriate living conditions

Explain how each recommendation achieves strong harm reduction.`
      },
      4: {
        title: "Minimal Animal Use",
        instruction: `Suggest hybrid or trace-animal content products that significantly reduce reliance on animals. Look for:
- Plant-forward products with minimal animal ingredients
- Blended products (e.g., plant-meat blends)
- Products using novel proteins or fermentation-derived ingredients alongside trace animal content
- Products that reduce overall animal product consumption while maintaining some traditional elements

Explain how each option minimizes animal use while still meeting similar culinary needs.`
      },
      5: {
        title: "Aim for Zero Animal Harm",
        instruction: `EXCLUDE any product derived from animals. Suggest only:
- Plant-based alternatives (e.g., Beyond Meat, Impossible Foods, plant-based dairy)
- Cultured/cultivated alternatives (e.g., lab-grown meat, precision fermentation products)
- Fully synthetic alternatives that replicate the function without animal use

Frame these positively: "These options align with your goal of avoiding harm to animals."
Highlight innovative products that don't require the use of sentient animals.`
      }
    };

    const selectedLens = lensDescriptions[ethicalLens as keyof typeof lensDescriptions];

    const prompt = `You are an AI assistant specializing in animal welfare and ethical food alternatives.

PRODUCT DETAILS:
- Product Name: ${productName}
- Animal Ingredients: ${animalIngredients}

USER'S ETHICAL PREFERENCE: ${selectedLens.title}

${selectedLens.instruction}

**IMPORTANT REQUIREMENTS:**
1. Provide 3-5 specific, actionable suggestions with real product names or categories when possible
2. For EACH suggestion, include:
   - Product name/brand or category
   - Brief description (why it fits this ethical lens position)
   - Confidence level (Low/Medium/High) based on data availability
   - Reasoning summary explaining the welfare improvement or harm reduction
3. Use transparent language acknowledging uncertainty: "based on available data", "estimated comparison", "not yet a certified Welfare Footprint"
4. Be scientifically informed but honest about limitations in available welfare data

Return ONLY valid JSON matching this schema:
{
  "ethicalLensPosition": "${selectedLens.title}",
  "suggestions": [
    {
      "name": "string (product name or category)",
      "description": "string (why this fits the ethical lens)",
      "confidence": "Low|Medium|High",
      "reasoning": "string (short welfare/harm reduction explanation)",
      "availability": "string (e.g., 'Widely available', 'Specialty stores', 'Limited availability')"
    }
  ],
  "generalNote": "string (overall context about this ethical lens position and welfare science limitations)"
}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
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
    console.log('Ethical swap suggestions generated successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-ethical-swap function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
