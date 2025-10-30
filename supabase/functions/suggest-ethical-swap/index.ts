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
const VALID_ETHICAL_LENS = [1, 2, 3, 4, 5] as const;

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

  // Validate ethicalLens is 1-5
  if (!VALID_ETHICAL_LENS.includes(ethicalLens)) {
    return { valid: false, error: 'ethicalLens must be a number between 1 and 5' };
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
  
  // Check for fictional blends in Lens 3
  if (ethicalLens === 3) {
    suggestions.forEach((suggestion: any, index: number) => {
      const textToCheck = `${suggestion.name} ${suggestion.description} ${suggestion.reasoning}`;
      const blends = detectFictionalBlends(textToCheck);
      
      if (blends.length > 0) {
        blends.forEach(blend => {
          console.error(`🚫 FICTIONAL BLEND DETECTED in Suggestion ${index + 1}:`, {
            suggestionName: suggestion.name,
            blendPhrase: blend,
            lens: ethicalLens
          });
          violations.push(
            `Suggestion ${index + 1} ("${suggestion.name}") contains fictional blend pattern "${blend}" which is forbidden for Lens 3`
          );
        });
      }
    });
    
    // Check generalNote for blends
    const generalNote = response.generalNote || '';
    const generalBlends = detectFictionalBlends(generalNote);
    if (generalBlends.length > 0) {
      generalBlends.forEach(blend => {
        console.error(`🚫 FICTIONAL BLEND in generalNote:`, {
          blendPhrase: blend,
          lens: ethicalLens
        });
        violations.push(
          `generalNote contains fictional blend pattern "${blend}" which is forbidden for Lens 3`
        );
      });
    }
  }
  
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
      // Lens 2 only blocks FULL replacement with plant-based/vegan options
      // Complementary mentions (e.g., "add plant-based sides") are allowed
      /\bfully\s+plant[-\s]?based\b/i,
      /\b100%\s+plant[-\s]?based\b/i,
      /\bcompletely\s+plant[-\s]?based\b/i,
      /\bentirely\s+plant[-\s]?based\b/i,
      /\bswitch\s+to\s+plant[-\s]?based\b/i,
      /\breplace\s+with\s+plant[-\s]?based\b/i,
      /\bstrictly\s+vegan\b/i,
      /\bgo\s+vegan\b/i,
      /\bbecome\s+vegan\b/i,
      /beyond meat/i,
      /impossible/i,
      /lab-grown/i,
      /cultured meat/i,
    ],
    3: [
      /fully\s+plant[-\s]?based/i,
      /100%\s*(plant-based|vegan)/i,
      /completely\s+plant[-\s]?based/i,
      /entirely\s+plant[-\s]?based/i,
      /all\s+plant[-\s]?based/i,
      /beyond meat/i,
      /impossible burger/i,
      /no animal.*ingredient/i,
      /zero animal/i,
      /animal-free/i,
    ],
    4: [
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
    2: [
      // Lens 2 allows complementary plant-based mentions
      /\bmostly\s+plant[-\s]?based\b/i,
      /\bmore\s+plant[-\s]?based\b/i,
      /\badd\s+(more\s+)?plant[-\s]?based/i,
      /\binclude\s+plant[-\s]?based/i,
      /\bplant[-\s]?forward\b/i,
      /\bplant[-\s]?based\s+(sides|options|meals|dishes)\b/i,
      /\bcomplement\s+with\s+plant/i,
    ],
    3: [
      /mostly\s+plant[-\s]?based/i,
      /primarily\s+plant[-\s]?based/i,
      /plant[-\s]?forward/i,
      /mainly\s+vegetarian/i,
      /plant[-\s]?animal\s+blend/i,
      /reduced[-\s]?animal/i,
    ],
    4: [
      /mostly\s+plant[-\s]?based/i,
      /primarily\s+plant[-\s]?based/i,
      /plant[-\s]?forward/i,
      /mainly\s+vegetarian/i,
      /non-lethal\s+animal/i,
    ],
  };
  
  const hardPatterns = hardForbiddenPatterns[ethicalLens];
  const allowed = allowedPatterns[ethicalLens] || [];
  
  if (!hardPatterns) return { violations, warnings }; // Lens 5 has no restrictions
  
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    initAIHandler(GEMINI_API_KEY);

    const ethicalLensNames = {
      1: 'Concerned Omnivore (Same Product, High Welfare)',
      2: 'Strong Welfare Standards',
      3: 'Reducitarian',
      4: 'Vegetarian',
      5: 'Vegan (Plant-Based/Cultured Only)'
    };

    console.log(`🎯 Ethical Swap Request:`, {
      productName,
      ethicalLens,
      ethicalLensName: ethicalLensNames[ethicalLens as keyof typeof ethicalLensNames],
      animalIngredients: animalIngredients.substring(0, 100)
    });

    // CRITICAL DEBUG: Verify lens value before prompt
    if (ethicalLens < 1 || ethicalLens > 5) {
      console.error('❌ INVALID ETHICAL LENS VALUE:', ethicalLens);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: `Invalid ethical lens value: ${ethicalLens}` }
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

    const aiResponse = await callAI({
      prompt,
      language,
      timeout: 30000,
    });

    if (!aiResponse.success) {
      console.error('AI Handler error:', aiResponse.error);
      throw new Error(aiResponse.error?.message || 'AI request failed');
    }

    const text = aiResponse.data?.text?.trim();
    if (!text) {
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
        1: 'Prioritize Big Welfare Gains',
        2: 'Strong Welfare Standards',
        3: 'Minimal Animal Suffering',
        4: 'Minimal Animal Use',
        5: 'Vegan Option Selected'
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
    console.error('Error in suggest-ethical-swap function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});