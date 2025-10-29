import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";
import { AIHandler, callAI } from '../_shared/ai-handler.ts';
import { GeminiProvider } from '../_shared/providers/gemini.ts';
import type { CacheOptions } from '../_shared/cache-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB in bytes (base64 is ~33% larger)
const MAX_TEXT_LENGTH = 5000;
const ALLOWED_MODES = ['detect', 'analyze', 'refine'] as const;

interface ValidatedInput {
  imageData?: { base64: string; mimeType: string };
  additionalInfo?: string;
  language: string;
  mode: typeof ALLOWED_MODES[number];
  focusItem?: string;
  userCorrection?: string;
  originalDetectionResults?: string; // JSON string of original detection for refine mode
}

function validateInput(body: any): { valid: boolean; data?: ValidatedInput; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { imageData, additionalInfo, language = 'en', mode = 'detect', focusItem, userCorrection, originalDetectionResults } = body;

  // Validate mode
  if (!ALLOWED_MODES.includes(mode)) {
    return { valid: false, error: `Invalid mode. Must be one of: ${ALLOWED_MODES.join(', ')}` };
  }

  // Validate imageData size and structure
  if (imageData) {
    if (typeof imageData !== 'object' || !imageData.base64 || !imageData.mimeType) {
      return { valid: false, error: 'imageData must be an object with base64 and mimeType properties' };
    }
    if (typeof imageData.base64 !== 'string' || typeof imageData.mimeType !== 'string') {
      return { valid: false, error: 'imageData.base64 and imageData.mimeType must be strings' };
    }
    const estimatedSize = imageData.base64.length * 0.75; // Estimate decoded size from base64
    if (estimatedSize > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image data exceeds maximum size of 10MB' };
    }
  }

  // Validate text field lengths
  if (additionalInfo && (typeof additionalInfo !== 'string' || additionalInfo.length > MAX_TEXT_LENGTH)) {
    return { valid: false, error: `additionalInfo exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
  }

  if (focusItem && (typeof focusItem !== 'string' || focusItem.length > MAX_TEXT_LENGTH)) {
    return { valid: false, error: `focusItem exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
  }

  if (userCorrection && (typeof userCorrection !== 'string' || userCorrection.length > MAX_TEXT_LENGTH)) {
    return { valid: false, error: `userCorrection exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
  }

  if (originalDetectionResults && typeof originalDetectionResults !== 'string') {
    return { valid: false, error: 'originalDetectionResults must be a JSON string' };
  }

  // Validate refine mode requirements
  if (mode === 'refine' && (!userCorrection || !originalDetectionResults)) {
    return { valid: false, error: 'refine mode requires both userCorrection and originalDetectionResults' };
  }

  // Validate language code - extract base language code (e.g., 'en-US' -> 'en')
  const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'zh', 'hi', 'ar', 'ru'];
  const baseLanguage = language ? language.split('-')[0] : 'en';
  if (!validLanguages.includes(baseLanguage)) {
    return { valid: false, error: `Invalid language code. Must be one of: ${validLanguages.join(', ')}` };
  }

  return {
    valid: true,
    data: {
      imageData,
      additionalInfo: additionalInfo?.trim(),
      language: baseLanguage,
      mode,
      focusItem: focusItem?.trim(),
      userCorrection: userCorrection?.trim(),
      originalDetectionResults: originalDetectionResults?.trim(),
    }
  };
}

// Prompt versions (update these when prompts change to auto-invalidate cache)
const PROMPT_VERSIONS = {
  analyze_user_material: 'v1.9',  // Updated to v1.9: Added metadata fields (brand, labelText, welfareClaim) and label/brand filtering rules
  confirm_refine_items: 'v1.1',   // Updated to v1.1: Added metadata fields support
  analyze_focused_item: 'v2.0',
  analyze_product: 'v2.0',
};

// Initialize AI Handler once
const initAIHandler = (apiKey: string) => {
  if (!(globalThis as any).__aiHandler) {
    const handler = new AIHandler();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      handler.initializeCache(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      console.log('Cache service initialized');
    } else {
      console.warn('Cache service not initialized (missing env vars)');
    }
    
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
    console.log('[analyze-image] Received language:', body.language);
    
    const validation = validateInput(body);
    
    if (!validation.valid) {
      console.error('[analyze-image] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ success: false, error: { message: validation.error } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, additionalInfo, language, mode, focusItem, userCorrection, originalDetectionResults } = validation.data!;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    initAIHandler(GEMINI_API_KEY);

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
    
    let prompt = '';
    let isTextOnlyMode = false; // Track if this is a text-only request (no image required)
    
    if (mode === 'detect') {
      // Step 1: Pure visual/OCR detection - but can be guided by user description
      prompt = await loadAndProcessPrompt('analyze_user_material', {
        LANGUAGE: outputLanguage
      });
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🔍 PROMPT DEBUG - DETECT MODE');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('Prompt template loaded: analyze_user_material');
      console.log('Output language:', outputLanguage);
      console.log('Additional info provided:', !!additionalInfo);
      console.log('Prompt length (chars):', prompt.length);
      console.log('Prompt preview (first 500 chars):', prompt.substring(0, 500));
      console.log('═══════════════════════════════════════════════════════════════════');
      
      // If user provided additional context (edited description), inject it
      if (additionalInfo && additionalInfo.trim()) {
        const userDescriptionContext = `
═══════════════════════════════════════════════════════════════════
🚨 USER-PROVIDED DESCRIPTION (USE AS AUTHORITATIVE CONTEXT) 🚨
═══════════════════════════════════════════════════════════════════

The user has provided this description of the image:

"${additionalInfo}"

⚠️ CRITICAL INSTRUCTIONS:

1. ✅ Use this description as GROUND TRUTH for what's in the image
2. ✅ If the user mentions specific dishes (e.g., "feijoada", "paella"), decompose those dishes according to their traditional recipes
3. ✅ If the user mentions specific ingredients, ensure those are included in the items list
4. ✅ Combine this description with your visual analysis for complete accuracy
5. ❌ Do NOT contradict this user-provided information

═══════════════════════════════════════════════════════════════════
NOW ANALYZE THE IMAGE USING THIS CONTEXT:
═══════════════════════════════════════════════════════════════════

`;
        prompt = userDescriptionContext + prompt;
        console.log('[analyze-image] Step 1: Detection mode with user-provided description context');
      } else {
        console.log('[analyze-image] Step 1: Detection mode (visual/OCR only)');
      }
      
    } else if (mode === 'refine') {
      // Step 2: Apply user corrections to original detection results
      prompt = await loadAndProcessPrompt('confirm_refine_items', {
        LANGUAGE: outputLanguage
      });
      
      // Inject original detection results and user correction into the prompt
      const refinementContext = `
ORIGINAL DETECTION RESULTS:
${originalDetectionResults}

USER CORRECTION:
${userCorrection}

Apply the user correction to the original detection results following the rules in the prompt.
`;
      
      prompt = refinementContext + '\n\n' + prompt;
      isTextOnlyMode = true; // No image needed for refinement
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🔍 PROMPT DEBUG - REFINE MODE');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('Prompt template loaded: confirm_refine_items');
      console.log('Output language:', outputLanguage);
      console.log('Original detection results length:', originalDetectionResults?.length || 0);
      console.log('User correction:', userCorrection);
      console.log('Final prompt length (chars):', prompt.length);
      console.log('Prompt preview (first 500 chars):', prompt.substring(0, 500));
      console.log('═══════════════════════════════════════════════════════════════════');
      
    } else if (mode === 'analyze' && focusItem) {
      prompt = await loadAndProcessPrompt('analyze_focused_item', {
        LANGUAGE: outputLanguage,
        FOCUS_ITEM: focusItem,
        ADDITIONAL_INFO: additionalInfo || ''
      });
      
      // Inject user context for analyze mode
      if (additionalInfo && additionalInfo.trim()) {
        const userContextPrefix = `
═══════════════════════════════════════════════════════════════════
🚨 CRITICAL - USER-PROVIDED FACTUAL INFORMATION (HIGHEST PRIORITY) 🚨
═══════════════════════════════════════════════════════════════════

The user has provided the following VERIFIED, AUTHORITATIVE information:

"${additionalInfo}"

⚠️ MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. ✅ This user-provided text is GROUND TRUTH - it is 100% factual and authoritative
2. ✅ This information TAKES ABSOLUTE PRECEDENCE over any visual analysis
3. ✅ If the user mentions ANY animal ingredients (examples: "soup with sausage", "contains eggs", "made with chicken", "has meat", "fish dish"):
   → Set hasAnimalIngredients = true
   → List those specific ingredients in animalIngredients with HIGH confidence
   → Provide detailed welfare analysis for those specific animals
4. ✅ If the user mentions production methods (e.g., "cage-free", "organic"), incorporate them into productionSystem with HIGH confidence
5. ✅ If the user provides cultural/regional context (e.g., "Polish Żurek soup traditionally contains sausage"), USE THIS KNOWLEDGE to inform your analysis
6. ❌ NEVER contradict this user-provided information
7. ❌ NEVER ignore this context in favor of only visual analysis
8. ✅ COMBINE this authoritative user context WITH your visual analysis for a complete assessment

═══════════════════════════════════════════════════════════════════
NOW PROCEED WITH YOUR ANALYSIS USING THE ABOVE USER CONTEXT:
═══════════════════════════════════════════════════════════════════

`;
        
        prompt = userContextPrefix + prompt;
      }
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🔍 PROMPT DEBUG - ANALYZE FOCUSED MODE');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('Prompt template loaded: analyze_focused_item');
      console.log('Output language:', outputLanguage);
      console.log('Focus item:', focusItem);
      console.log('Additional info provided:', !!additionalInfo);
      console.log('Final prompt length (chars):', prompt.length);
      console.log('Prompt preview (first 500 chars):', prompt.substring(0, 500));
      console.log('═══════════════════════════════════════════════════════════════════');
    } else {
      prompt = await loadAndProcessPrompt('analyze_product', {
        LANGUAGE: outputLanguage,
        ADDITIONAL_INFO: additionalInfo || ''
      });
      
      // Inject user context for general analyze mode
      if (additionalInfo && additionalInfo.trim()) {
        const userContextPrefix = `
═══════════════════════════════════════════════════════════════════
🚨 CRITICAL - USER-PROVIDED FACTUAL INFORMATION (HIGHEST PRIORITY) 🚨
═══════════════════════════════════════════════════════════════════

The user has provided the following VERIFIED, AUTHORITATIVE information:

"${additionalInfo}"

⚠️ MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. ✅ This user-provided text is GROUND TRUTH - it is 100% factual and authoritative
2. ✅ This information TAKES ABSOLUTE PRECEDENCE over any visual analysis
3. ✅ If the user mentions ANY animal ingredients (examples: "soup with sausage", "contains eggs", "made with chicken", "has meat", "fish dish"):
   → Set hasAnimalIngredients = true
   → List those specific ingredients in animalIngredients with HIGH confidence
   → Provide detailed welfare analysis for those specific animals
4. ✅ If the user mentions production methods (e.g., "cage-free", "organic"), incorporate them into productionSystem with HIGH confidence
5. ✅ If the user provides cultural/regional context (e.g., "Polish Żurek soup traditionally contains sausage"), USE THIS KNOWLEDGE to inform your analysis
6. ❌ NEVER contradict this user-provided information
7. ❌ NEVER ignore this context in favor of only visual analysis
8. ✅ COMBINE this authoritative user context WITH your visual analysis for a complete assessment

═══════════════════════════════════════════════════════════════════
NOW PROCEED WITH YOUR ANALYSIS USING THE ABOVE USER CONTEXT:
═══════════════════════════════════════════════════════════════════

`;
        
        prompt = userContextPrefix + prompt;
      }
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🔍 PROMPT DEBUG - ANALYZE PRODUCT MODE');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('Prompt template loaded: analyze_product');
      console.log('Output language:', outputLanguage);
      console.log('Additional info provided:', !!additionalInfo);
      console.log('Final prompt length (chars):', prompt.length);
      console.log('Prompt preview (first 500 chars):', prompt.substring(0, 500));
      console.log('═══════════════════════════════════════════════════════════════════');
    }

    // CRITICAL: Always bypass cache to ensure fresh AI calls for each upload
    // This prevents cross-user/cross-session caching and ensures analysis reflects current prompts
    const promptTemplateId = mode === 'detect' ? 'analyze_user_material' : 
                             mode === 'refine' ? 'confirm_refine_items' :
                             (mode === 'analyze' && focusItem ? 'analyze_focused_item' : 'analyze_product');
    
    const promptVersion = mode === 'detect' ? PROMPT_VERSIONS.analyze_user_material : 
                          mode === 'refine' ? PROMPT_VERSIONS.confirm_refine_items :
                          (mode === 'analyze' && focusItem ? PROMPT_VERSIONS.analyze_focused_item : PROMPT_VERSIONS.analyze_product);
    
    const cacheOptions: CacheOptions = {
      strategy: 'bypass',
      promptTemplateId,
      promptVersion,
      mode,
      focusItem: focusItem || undefined,
    };

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🚀 FULL PROMPT BEING SENT TO AI MODEL');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Mode:', mode);
    console.log('Language:', language);
    console.log('Has image data:', !isTextOnlyMode && !!imageData);
    console.log('Cache strategy:', cacheOptions.strategy);
    console.log('Prompt template ID:', cacheOptions.promptTemplateId);
    console.log('Prompt version:', cacheOptions.promptVersion);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('FULL PROMPT TEXT:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(prompt);
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const aiResponse = await callAI({
      prompt,
      imageData: isTextOnlyMode ? undefined : imageData, // Skip image for text-only modes like refine
      language,
      timeout: 30000,
      cache: 'bypass', // Always bypass cache for fresh results
    }, cacheOptions);

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
      JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
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
      }],
      _metadata: {
        cacheHit: aiResponse.metadata.cacheHit,
        latencyMs: aiResponse.metadata.latencyMs,
        provider: aiResponse.metadata.provider,
        model: aiResponse.metadata.model,
      }
    };

    const cacheHeader = aiResponse.metadata.cacheHit ? 'HIT' : 'MISS';

    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache': cacheHeader,
      },
    });

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});