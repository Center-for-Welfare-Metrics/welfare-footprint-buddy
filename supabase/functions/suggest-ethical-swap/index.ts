import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { AIHandler, callAI } from '../_shared/ai-handler.ts';
import { GeminiProvider } from '../_shared/providers/gemini.ts';
import { loadAndProcessPrompt } from '../_shared/prompt-loader.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_TEXT_LENGTH = 5000;
const VALID_ETHICAL_LENS = [1, 2, 3, 4] as const;

interface ValidatedInput {
  productName: string;
  animalIngredients: string;
  ethicalLens: typeof VALID_ETHICAL_LENS[number];
  language: string;
}

function validateInput(body: any): { valid: boolean; data?: ValidatedInput; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { productName, animalIngredients, ethicalLens, language = 'en' } = body;

  // Validate required fields
  if (!productName || typeof productName !== 'string' || productName.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `productName is required and must be less than ${MAX_TEXT_LENGTH} characters` };
  }

  if (!animalIngredients || typeof animalIngredients !== 'string' || animalIngredients.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `animalIngredients is required and must be less than ${MAX_TEXT_LENGTH} characters` };
  }

  // Validate ethicalLens is 1, 2, 3, or 4
  if (!VALID_ETHICAL_LENS.includes(ethicalLens)) {
    return { valid: false, error: 'ethicalLens must be 1, 2, 3, or 4' };
  }

  // Validate language code
  const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'zh', 'hi', 'ar', 'ru'];
  if (language && !validLanguages.includes(language)) {
    return { valid: false, error: `Invalid language code. Must be one of: ${validLanguages.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      productName: productName.trim(),
      animalIngredients: animalIngredients.trim(),
      ethicalLens,
      language,
    }
  };
}

/**
 * Detect fictional blend products in suggestions
 * Returns array of detected blend patterns
 */
function detectFictionalBlends(text: string): string[] {
  const blendPatterns = [
    /\b(\w+)[-–]\s*mushroom\b/i,
    /\b(\w+)[-–]\s*pea\s+protein\b/i,
    /\b(\w+)[-–]\s*cauliflower\b/i,
    /\b(\w+)[-–]\s*pumpkin\b/i,
    /\b(\w+)[-–]\s*potato\b/i,
    /\b(\w+)[-–]\s*plant[-\s]?based\b/i,
    /\b(\w+)[-–]\s*vegetable\b/i,
    /\b(\w+)[-–]\s*seaweed\b/i,
    /\b(\w+)[-–]\s*tofu\b/i,
    /\b(\w+)\s+and\s+(vegetable|plant|mushroom|pea|tofu|seaweed|cauliflower)\s+(protein|mix|blend)/i,
    /\b\d+%\s+\w+\s*\/\s*\d+%\s+\w+\b/i, // e.g., "50% pork / 50% mushroom"
    /\bblend(ed)?\s+(with|of)\s+\w+\s+and\s+\w+/i,
    /\bmix(ed)?\s+(with|of)\s+\w+\s+and\s+\w+/i,
    /\bcombined\s+with\s+(mushroom|pea|cauliflower|pumpkin|potato|plant|vegetable|seaweed|tofu)/i,
    /\bhybrid\s+(burger|ham|cheese|product|protein|mix)/i,
    /\bwith\s+added\s+(mushroom|pea|cauliflower|pumpkin|potato|plant|vegetable|seaweed|tofu)/i,
    /\bincorporat(es?|ing)\s+(mushroom|pea|cauliflower|plant|vegetable|seaweed|tofu)/i,
    /\binfused\s+with\s+(mushroom|pea|cauliflower|plant|vegetable|seaweed|tofu)/i,
  ];
  
  const detected: string[] = [];
  blendPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      detected.push(match[0]);
    }
  });
  
  return detected;
}

/**
 * Validate that AI suggestions respect lens boundaries
 * Returns object with violations array and warnings array
 */
function validateLensBoundaries(response: any, ethicalLens: number): { violations: string[], warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions = response.suggestions || [];
  
  // Fictional blends check removed (Lens 3 no longer exists)
  
  // Define HARD forbidden patterns (fatal violations) for each lens
  const hardForbiddenPatterns: Record<number, RegExp[]> = {
    1: [
      /plant-based/i,
      /vegan/i,
      /vegetarian/i,
      /beyond meat/i,
      /impossible/i,
      /tofu/i,
      /tempeh/i,
      /seitan/i,
      /soy milk/i,
      /almond milk/i,
      /oat milk/i,
      /lab-grown/i,
      /cultured meat/i,
      /reduce.*consumption/i,
      /eliminate.*animal/i,
    ],
    2: [
      // Lens 2: Reducetarian - blocks plant-based alternatives, different products, certifications
      /plant-based/i,
      /vegan/i,
      /vegetarian/i,
      /beyond meat/i,
      /impossible/i,
      /tofu/i,
      /tempeh/i,
      /seitan/i,
      /certified/i,
      /organic/i,
      /humane/i,
      /pasture-raised/i,
      /cage-free/i,
      /lab-grown/i,
      /cultured meat/i,
    ],
    3: [
      // Lens 3: Vegetarian - blocks meat/fish and fully vegan language
      /fully\s+plant[-\s]?based/i,
      /100%\s*(plant-based|vegan)/i,
      /completely\s+plant[-\s]?based/i,
      /entirely\s+plant[-\s]?based/i,
      /all\s+plant[-\s]?based/i,
      /zero animal/i,
      /animal-free/i,
      /no animal.*ingredient/i,
    ],
  };
  
  // Define ALLOWED patterns (these should NOT trigger violations or warnings)
  const allowedPatterns: Record<number, RegExp[]> = {
    3: [
      // Lens 3: Vegetarian allows these phrases
      /mostly\s+plant[-\s]?based/i,
      /primarily\s+plant[-\s]?based/i,
      /plant[-\s]?forward/i,
      /mainly\s+vegetarian/i,
      /non-lethal\s+animal/i,
    ],
  };
  
  const hardPatterns = hardForbiddenPatterns[ethicalLens];
  const allowed = allowedPatterns[ethicalLens] || [];
  
  if (!hardPatterns) return { violations, warnings }; // Lens 4 (Vegan) has no restrictions
  
  // Helper to check if text matches any allowed pattern
  const isAllowedPhrase = (text: string): boolean => {
    return allowed.some(pattern => pattern.test(text));
  };
  
  // Check each suggestion
  suggestions.forEach((suggestion: any, index: number) => {
    const textToCheck = `${suggestion.name} ${suggestion.description} ${suggestion.reasoning}`;
    
    hardPatterns.forEach(pattern => {
      const match = textToCheck.match(pattern);
      if (match && !isAllowedPhrase(textToCheck)) {
        const matchedPhrase = match[0];
        console.error(`🚫 HARD VIOLATION in Suggestion ${index + 1}:`, {
          suggestionName: suggestion.name,
          matchedPhrase,
          pattern: pattern.toString(),
          lens: ethicalLens
        });
        violations.push(
          `Suggestion ${index + 1} ("${suggestion.name}") contains forbidden phrase "${matchedPhrase}" for Lens ${ethicalLens}: matched pattern ${pattern}`
        );
      }
    });
  });
  
  // Check generalNote
  const generalNote = response.generalNote || '';
  hardPatterns.forEach(pattern => {
    const match = generalNote.match(pattern);
    if (match && !isAllowedPhrase(generalNote)) {
      const matchedPhrase = match[0];
      console.error(`🚫 HARD VIOLATION in generalNote:`, {
        matchedPhrase,
        pattern: pattern.toString(),
        lens: ethicalLens,
        generalNotePreview: generalNote.substring(0, 200)
      });
      violations.push(
        `generalNote contains forbidden phrase "${matchedPhrase}" for Lens ${ethicalLens}: matched pattern ${pattern}`
      );
    }
  });
  
  return { violations, warnings };
}

// Initialize AI Handler with Lovable AI (GPT-5)
const initAIHandler = () => {
  if (!(globalThis as any).__aiHandler) {
    console.log('🔧 Initializing AI Handler with Lovable AI (GPT-5)');
    // Lovable AI will be called directly via fetch, no provider registration needed
    (globalThis as any).__aiHandler = true; // Mark as initialized
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: { message: validation.error } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productName, animalIngredients, ethicalLens, language } = validation.data!;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    initAIHandler();

    const ethicalLensNames = {
      1: 'Higher-Welfare Omnivore',
      2: 'Lower Consumption',
      3: 'No Slaughter',
      4: 'No Animal Use'
    };

    console.log(`🎯 Ethical Swap Request:`, {
      productName,
      ethicalLens,
      ethicalLensName: ethicalLensNames[ethicalLens as keyof typeof ethicalLensNames],
      animalIngredients: animalIngredients.substring(0, 100)
    });

    // CRITICAL DEBUG: Verify lens value before prompt
    if (!VALID_ETHICAL_LENS.includes(ethicalLens as any)) {
      console.error('❌ INVALID ETHICAL LENS VALUE:', ethicalLens);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: `Invalid ethical lens value: ${ethicalLens}. Must be 1, 2, 3, or 4.` }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ethical lens definitions are centralized in science_and_ai_prompts/ethical_lens_criteria.md
    // and implemented in the prompt template suggest_ethical_swap.md
    
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

    // Load prompt from centralized prompt repository
    // The ethical lens logic is embedded in the prompt template
    const prompt = await loadAndProcessPrompt('suggest_ethical_swap', {
      PRODUCT_NAME: productName,
      ANIMAL_INGREDIENTS: animalIngredients,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage,
    });

    console.log(`📝 Prompt variables:`, {
      PRODUCT_NAME: productName,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage
    });

    // Call Lovable AI (Gemini) with strict instruction following
    console.log(`🤖 Calling Lovable AI (Gemini 2.5 Flash) for Lens ${ethicalLens}`);
    
    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in animal welfare and food ethics. You MUST follow ALL instructions EXACTLY as written, especially forbidden word lists and product naming rules. Your responses will be validated against strict rules - ANY violation will cause complete rejection. Pay special attention to Lens 3 requirements.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent rule-following
        max_tokens: 4096,
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error(`❌ Lovable AI error:`, lovableResponse.status, errorText);
      
      if (lovableResponse.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Rate limit exceeded',
              details: 'Too many requests. Please try again in a moment.',
            },
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (lovableResponse.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Payment required',
              details: 'Please add credits to your Lovable AI workspace.',
            },
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${lovableResponse.status} ${errorText}`);
    }

    const lovableData = await lovableResponse.json();
    const text = lovableData.choices?.[0]?.message?.content?.trim();
    
    if (!text) {
      console.error('❌ No text response from Lovable AI');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: 'No text response from AI' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanedText = text;
    try {
      cleanedText = text.replace(/```(json)?/gi, '').trim();
      const parsedResponse = JSON.parse(cleanedText);
      
      // CRITICAL VALIDATION: Check if AI returned correct ethical lens
      console.log(`✅ AI Response parsed successfully:`, {
        ethicalLensPosition: parsedResponse.ethicalLensPosition,
        requestedLens: ethicalLens,
        suggestionsCount: parsedResponse.suggestions?.length || 0
      });

      // Validate that response matches requested lens
      const expectedPositions = {
        1: 'Higher-Welfare Omnivore',
        2: 'Lower Consumption',
        3: 'No Slaughter',
        4: 'No Animal Use'
      };

      if (parsedResponse.ethicalLensPosition !== expectedPositions[ethicalLens as keyof typeof expectedPositions]) {
        console.warn(`⚠️ LENS MISMATCH: Requested ${ethicalLens} (${expectedPositions[ethicalLens as keyof typeof expectedPositions]}), got ${parsedResponse.ethicalLensPosition}`);
      }

      
      // CRITICAL VALIDATION: Check for lens boundary violations
      const validationResult = validateLensBoundaries(parsedResponse, ethicalLens);
      
      // Log warnings (soft issues) but don't block
      if (validationResult.warnings.length > 0) {
        console.warn(`⚠️ LENS BOUNDARY WARNINGS FOR LENS ${ethicalLens}:`, validationResult.warnings);
      }
      
      // Hard violations block the response
      if (validationResult.violations.length > 0) {
        console.error(`❌ LENS BOUNDARY VIOLATIONS DETECTED FOR LENS ${ethicalLens}:`, validationResult.violations);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { 
              message: 'Lens boundary violation',
              details: `AI generated suggestions that violate Lens ${ethicalLens} boundaries. Please try again.`,
              violations: validationResult.violations
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI response:', text.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            message: 'JSON Parse error: Invalid AI response',
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Log full error server-side for debugging
    console.error('Error in suggest-ethical-swap function:', error);
    
    // Return safe, user-friendly error message
    const errorStr = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Failed to generate ethical swap suggestions. Please try again.';
    
    // Map known error types to safe messages
    if (errorStr.includes('LOVABLE_API_KEY') || errorStr.includes('AI')) {
      safeMessage = 'AI service temporarily unavailable. Please try again later.';
    } else if (errorStr.includes('auth') || errorStr.includes('token')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    } else if (errorStr.includes('Rate limit')) {
      safeMessage = 'Too many requests. Please try again in a moment.';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: { message: safeMessage }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});