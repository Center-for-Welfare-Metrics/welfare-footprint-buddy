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
  analyze_focused_item: 'v1.0',
  analyze_product: 'v1.0',
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
        FOCUS_ITEM: focusItem
      });
      
      // Add user-provided additional information if available
      if (additionalInfo) {
        prompt += `\n\n**CRITICAL - USER-PROVIDED INFORMATION:**
The user has provided the following verified information about this product: ${additionalInfo}

IMPORTANT INSTRUCTIONS FOR USING THIS INFORMATION:
- This is ADDITIONAL CONTEXT that ENHANCES your analysis - it does NOT replace what you see in the image
- If the user mentions specific ingredients (e.g., "eggs", "milk", "chicken"), you MUST recognize these as animal-derived ingredients
- If the user mentions production methods (e.g., "cage-free", "free-range", "organic"), incorporate this into the productionSystem field
- The user is CORRECTING or CLARIFYING your analysis, not providing an entirely new product description
- Update hasAnimalIngredients and animalIngredients fields based on what ingredients the user mentions
- Use "High" confidence for fields directly addressed by the user's information
- State the information definitively (e.g., "Eggs (from cage-free laying hens)" NOT "No animal ingredients")
- NEVER say "no animal ingredients" if the user has mentioned any animal-derived ingredients like eggs, milk, meat, cheese, etc.`;
      }
    } else {
      // Standard product analysis mode
      prompt = await loadAndProcessPrompt('analyze_product', {
        LANGUAGE: outputLanguage
      });
      
      // Add user-provided additional information if available
      if (additionalInfo) {
        prompt += `\n\n**CRITICAL - USER-PROVIDED INFORMATION:**
The user has provided the following verified information about this product: ${additionalInfo}

IMPORTANT INSTRUCTIONS FOR USING THIS INFORMATION:
- This is ADDITIONAL CONTEXT that ENHANCES your analysis - it does NOT replace what you see in the image
- If the user mentions specific ingredients (e.g., "eggs", "milk", "chicken"), you MUST recognize these as animal-derived ingredients
- If the user mentions production methods (e.g., "cage-free", "free-range", "organic"), incorporate this into the productionSystem field
- The user is CORRECTING or CLARIFYING your analysis, not providing an entirely new product description
- Update hasAnimalIngredients and animalIngredients fields based on what ingredients the user mentions
- Use "High" confidence for fields directly addressed by the user's information
- State the information definitively (e.g., "Eggs (from cage-free laying hens)" NOT "No animal ingredients")
- NEVER say "no animal ingredients" if the user has mentioned any animal-derived ingredients like eggs, milk, meat, cheese, etc.`;
      }
    }

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
    const aiResponse = await callAI({
      prompt,
      imageData,
      language,
      timeout: 30000,
    }, cacheOptions);

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
