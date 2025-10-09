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
    const { imageData, additionalInfo, language = 'en' } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'ru': 'Russian'
    };
    
    const outputLanguage = languageNames[language] || 'English';
    
    let prompt = `You are an AI assistant specializing in animal welfare analysis. Your task is to analyze the provided product image and provide a structured JSON response.

**CRITICAL - ANALYSIS AND LANGUAGE SEPARATION:**
STEP 1: First, analyze the image content ACCURATELY and OBJECTIVELY, regardless of language. Identify what the product actually is, what ingredients it contains, and read any visible text on labels.
STEP 2: Then, translate your findings into ${outputLanguage} for the JSON response.

IMPORTANT: The language setting (${outputLanguage}) affects ONLY the output text, NOT your ability to recognize and identify the product. You must identify the product correctly based on visual content, regardless of what language the output will be in.

**Instructions:**
1. FIRST, determine if the image contains food or a food product. If it does NOT contain food (e.g., landscape, person, non-edible object), set isFood to false and return early.
2. Identify the product name and brand from the image.
3. Determine if it contains animal-derived ingredients.
4. If it contains animal-derived ingredients:
   - List them.
   - Infer the likely production system with detailed brand-specific information.
   - Provide potential welfare concerns STRICTLY LIMITED TO ANIMAL WELFARE (sentience, suffering, living conditions, physical/mental well-being of the animals).
   - Estimate data confidence for each field (Low, Medium, High).
5. If it does NOT contain animal-derived ingredients, only return the product name, set hasAnimalIngredients to false, and set isFood to true.
6. If the image does NOT contain food at all, set isFood to false, hasAnimalIngredients to false, and you may set productName to describe what the image shows (e.g., "Landscape photo", "Person", "Non-food object").

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
  "isFood": true|false,
  "animalIngredients": {"value": "string", "confidence": "Low|Medium|High"},
  "productionSystem": {"value": "string (detailed, multi-sentence description)", "confidence": "Low|Medium|High", "assumption": "string (optional)"},
  "welfareConcerns": {"value": "string (multi-line allowed, ANIMAL WELFARE ONLY)", "confidence": "Low|Medium|High"},
  "disclaimer": "This analysis was generated using AI and may contain errors or inaccuracies. It is a preliminary estimate and has not been scientifically validated by the Welfare Footprint Institute. Please verify information independently before making decisions."
}

Analyze the image and return ONLY valid JSON matching this schema.`;

    // Add additional context if provided by user
    if (additionalInfo) {
      prompt += `\n\n**CRITICAL - USER-PROVIDED INFORMATION:** 
The user has provided the following verified information: ${additionalInfo}

When incorporating this information:
- Treat user-provided details as FACTS, not speculation
- Use "High" confidence for fields directly addressed by the user's information
- Remove speculative language (like "likely", "possibly", "appears to be") for facts the user has confirmed
- State the information definitively (e.g., "Beef, Cheese (cow's milk)" NOT "Meat (likely beef or pork), Cheese (likely cow's milk)")
- Only use speculative language for aspects NOT covered by the user's information`;
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
