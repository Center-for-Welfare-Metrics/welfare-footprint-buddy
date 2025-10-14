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

// Prompt versions (update these when prompts change to auto-invalidate cache)
const PROMPT_VERSIONS = {
  detect_items: 'v1.1', // Updated: Fixed food-related terminology for non-food items
  analyze_focused_item: 'v2.0', // Updated: Added authoritative user-provided context handling
  analyze_product: 'v2.0', // Updated: Added authoritative user-provided context handling
};

// Initialize AI Handler once
const initAIHandler = (apiKey: string) => {
  if (!(globalThis as any).__aiHandler) {
    const handler = new AIHandler();
    
    // Initialize cache service
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
    const { imageData, additionalInfo, language = 'en', mode = 'detect', focusItem, userCorrection } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Initialize AI Handler
    initAIHandler(GEMINI_API_KEY);

    // Map language codes to full language names
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
    
    // Load the appropriate prompt based on mode
    let prompt = '';
    
    console.log('=== PROMPT GENERATION START ===');
    console.log('Mode:', mode);
    console.log('FocusItem:', focusItem);
    console.log('AdditionalInfo provided:', !!additionalInfo);
    console.log('AdditionalInfo value:', additionalInfo);
    console.log('AdditionalInfo length:', additionalInfo?.length || 0);
    
    if (mode === 'detect') {
      // Multi-item detection mode
      prompt = await loadAndProcessPrompt('detect_items', {
        LANGUAGE: outputLanguage,
        USER_CORRECTION: userCorrection
      });
    } else if (mode === 'analyze' && focusItem) {
      // Focused item analysis mode
      prompt = await loadAndProcessPrompt('analyze_focused_item', {
        LANGUAGE: outputLanguage,
        FOCUS_ITEM: focusItem,
        ADDITIONAL_INFO: additionalInfo || ''
      });
    } else {
      // Standard product analysis mode
      prompt = await loadAndProcessPrompt('analyze_product', {
        LANGUAGE: outputLanguage,
        ADDITIONAL_INFO: additionalInfo || ''
      });
    }
    
    // CRITICAL FIX: Direct injection of user context at the VERY TOP of the prompt
    // This ensures the model cannot miss it and must treat it as primary context
    if (additionalInfo && additionalInfo.trim() && mode !== 'detect') {
      console.log('🔥🔥🔥 INJECTING USER CONTEXT DIRECTLY INTO PROMPT 🔥🔥🔥');
      
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
      
      console.log('✅ User context injected successfully');
      console.log('New prompt length:', prompt.length);
      console.log('First 1000 chars of final prompt:');
      console.log(prompt.substring(0, 1000));
      console.log('Verification - contains user text:', prompt.includes(additionalInfo));
    } else {
      console.log('ℹ️ No additionalInfo - using standard prompt only');
    }
    
    console.log('=== FINAL PROMPT READY ===');
    console.log('Total prompt length:', prompt.length);

    // Prepare cache options
    const cacheOptions: CacheOptions = {
      strategy: 'prefer', // Can be overridden to 'bypass' for debugging
      promptTemplateId: mode === 'detect' ? 'detect_items' : 
                        (mode === 'analyze' && focusItem ? 'analyze_focused_item' : 'analyze_product'),
      promptVersion: mode === 'detect' ? PROMPT_VERSIONS.detect_items : 
                     (mode === 'analyze' && focusItem ? PROMPT_VERSIONS.analyze_focused_item : PROMPT_VERSIONS.analyze_product),
      mode,
      focusItem: focusItem || undefined,
    };

    // Call AI using the new handler with caching
    console.log('=== CALLING AI ===');
    console.log('Prompt length being sent:', prompt.length);
    console.log('Has image data:', !!imageData);
    console.log('Cache strategy:', cacheOptions.strategy);
    
    const aiResponse = await callAI({
      prompt,
      imageData,
      language,
      timeout: 30000,
    }, cacheOptions);
    
    console.log('=== AI RESPONSE RECEIVED ===');
    console.log('Success:', aiResponse.success);
    console.log('Cache hit:', aiResponse.metadata?.cacheHit);
    console.log('Response text length:', aiResponse.data?.text?.length || 0);

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
      
      // Don't save invalid responses to cache - they would be useless
      // Skip cache write by not calling any cache service methods here
      
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

    // Return in the original format expected by the frontend, with cache metadata
    const data = {
      candidates: [{
        content: {
          parts: [{
            text: cleanedText
          }]
        }
      }],
      // Add cache metadata for UI display
      _metadata: {
        cacheHit: aiResponse.metadata.cacheHit,
        latencyMs: aiResponse.metadata.latencyMs,
        provider: aiResponse.metadata.provider,
        model: aiResponse.metadata.model,
      }
    };

    console.log('Analysis completed successfully via AI Handler');
    console.log('Metadata:', aiResponse.metadata);

    // Add cache header for observability
    const cacheHeader = aiResponse.metadata.cacheHit ? 'HIT' : 'MISS';

    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache': cacheHeader, // Observability header
      },
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
