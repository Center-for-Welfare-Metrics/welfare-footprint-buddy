import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";
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
The user has provided the following verified information: ${additionalInfo}

When incorporating this information:
- Treat user-provided details as FACTS, not speculation
- Use "High" confidence for fields directly addressed by the user's information
- Remove speculative language (like "likely", "possibly", "appears to be") for facts the user has confirmed
- State the information definitively (e.g., "Beef, Cheese (cow's milk)" NOT "Meat (likely beef or pork), Cheese (likely cow's milk)")
- Only use speculative language for aspects NOT covered by the user's information`;
      }
    } else {
      // Standard product analysis mode
      prompt = await loadAndProcessPrompt('analyze_product', {
        LANGUAGE: outputLanguage
      });
      
      // Add user-provided additional information if available
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
    }

    // Call AI using the new handler
    const aiResponse = await callAI({
      prompt,
      imageData,
      language,
      timeout: 30000,
    });

    if (!aiResponse.success) {
      console.error('AI Handler error:', aiResponse.error);
      throw new Error(aiResponse.error?.message || 'AI request failed');
    }

    // Parse the AI response
    const text = aiResponse.data?.text;
    if (!text) {
      throw new Error('No text response from AI');
    }

    // Return in the original format expected by the frontend
    const data = {
      candidates: [{
        content: {
          parts: [{
            text: text
          }]
        }
      }]
    };

    console.log('Analysis completed successfully via AI Handler');
    console.log('Metadata:', aiResponse.metadata);

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
