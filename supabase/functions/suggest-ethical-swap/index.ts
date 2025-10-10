import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { AIHandler, callAI } from '../_shared/ai-handler.ts';
import { GeminiProvider } from '../_shared/providers/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize AI Handler once
const initAIHandler = (apiKey: string) => {
  if (!(globalThis as any).__aiHandler) {
    const handler = new AIHandler();
    const geminiProvider = new GeminiProvider(apiKey);
    handler.registerProvider(geminiProvider);
    handler.setDefaultProvider('gemini');
    (globalThis as any).__aiHandler = handler;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, animalIngredients, ethicalLens, language = 'en' } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Initialize AI Handler
    initAIHandler(GEMINI_API_KEY);

    console.log(`Generating ethical swap suggestions for: ${productName}, ethical lens: ${ethicalLens}`);

    // Define the ethical lens positions
    const lensDescriptions = {
      1: {
        title: "Prioritize Big Welfare Gains",
        instruction: `Keep the same type of product but recommend HIGH-WELFARE versions (${productName}) such as cage-free, enriched, pasture-raised, or certified humane options.

If NO such high-welfare version exists in the market:
1. Inform the user that no verified high-welfare alternative is currently available for this specific product.
2. Briefly describe what such a system would look like (e.g., slower-growing breeds, no mutilations, better housing, outdoor access, enriched environments).
3. Suggest similar products in the same category that DO have high-welfare certifications available.

Tone: Practical and encouraging - "This version improves conditions for animals while keeping similar products."
Always include confidence level (High/Medium/Low) and brief reasoning summary.`
      },
      2: {
        title: "Strong Welfare Standards",
        instruction: `Recommend certified or verifiably higher-welfare animal products that meet multiple welfare criteria. Look for:
- Products with recognized certifications (e.g., Animal Welfare Approved, Certified Humane, Global Animal Partnership Step 3+)
- Products with documented welfare improvements (reduced stocking density, enrichment, better slaughter practices)
- Products from regenerative or high-welfare farming systems

Provide short explanations of the specific welfare improvements.
Tone: Informative and reassuring.
Always include confidence level (High/Medium/Low) and brief reasoning summary.`
      },
      3: {
        title: "Minimal Animal Suffering",
        instruction: `Suggest hybrid or blended options (plant-animal mixes, reduced animal input) that reduce overall welfare impact. Look for:
- Plant-meat blend products
- Products with significantly reduced animal content compared to traditional versions
- Innovative products using fermentation or novel proteins alongside reduced animal ingredients

Emphasize that this reduces overall welfare impact while keeping familiar choices.
Tone: Neutral and pragmatic.
Always include confidence level (High/Medium/Low) and brief reasoning summary.`
      },
      4: {
        title: "Minimal Animal Use",
        instruction: `Recommend mostly plant-based options with only trace or secondary animal ingredients. Look for:
- Plant-forward products with minimal animal content
- Products where animal ingredients are secondary or trace elements
- Options that significantly reduce animal use (e.g., 90%+ plant-based)

Clarify that these still have minor welfare costs but are far less than typical products.
Tone: Transparent and gently aspirational.
Always include confidence level (High/Medium/Low) and brief reasoning summary.`
      },
      5: {
        title: "Aim for Zero Animal Harm",
        instruction: `Recommend FULLY animal-free products ONLY. EXCLUDE any item involving live-animal use. Suggest:
- Plant-based alternatives (e.g., Beyond Meat, Impossible Foods, plant-based dairy)
- Cultured/cultivated alternatives (e.g., lab-grown meat, precision fermentation products)
- Fully synthetic alternatives that replicate the function without animal use

Tone: Positive, future-oriented, and harm-free.
Frame these as: "These options align with your goal of avoiding harm to animals."
Highlight innovative products that don't require the use of sentient animals.
Always include confidence level (High/Medium/Low) and brief reasoning summary.`
      }
    };

    const selectedLens = lensDescriptions[ethicalLens as keyof typeof lensDescriptions];

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

    const prompt = `You are an AI assistant specializing in animal welfare and ethical food alternatives.

**CRITICAL - OUTPUT LANGUAGE:**
You MUST respond in ${outputLanguage}. ALL text fields in your JSON response must be written in ${outputLanguage}, including ethicalLensPosition, suggestions (name, description, reasoning, availability), and generalNote.

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

    // Call AI using the new handler
    const aiResponse = await callAI({
      prompt,
      language,
      timeout: 30000,
    });

    if (!aiResponse.success) {
      console.error('AI Handler error:', aiResponse.error);
      throw new Error(aiResponse.error?.message || 'AI request failed');
    }

    // Parse the AI response
    const text = aiResponse.data?.text?.trim();
    if (!text) {
      console.error('No text response from AI');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: 'No text response from AI' },
          rawOutput: text 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Clean the AI output by removing markdown code blocks
    let cleanedText = text;
    try {
      cleanedText = text.replace(/```(json)?/gi, '').trim();
      
      // Validate it's valid JSON by parsing it
      JSON.parse(cleanedText);
      
      console.log('AI output successfully cleaned and validated');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI output:', text);
      console.error('Cleaned output:', cleanedText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            message: 'JSON Parse error: Invalid AI response',
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
          },
          rawOutput: text 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return in the original format expected by the frontend
    const data = {
      candidates: [{
        content: {
          parts: [{
            text: cleanedText
          }]
        }
      }]
    };

    console.log('Ethical swap suggestions generated successfully via AI Handler');
    console.log('Metadata:', aiResponse.metadata);

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
