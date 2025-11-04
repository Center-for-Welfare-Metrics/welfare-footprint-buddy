// supabase/functions/suggest-ethical-swap/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { AIHandler, callAI } from '../_shared/ai-handler.ts'; // kept for compatibility (not used)
import { GeminiProvider } from '../_shared/providers/gemini.ts'; // kept for compatibility (not used)
import { loadAndProcessPrompt } from '../_shared/prompt-loader.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// -------- Input validation ----------------------------------------------------

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

  if (!productName || typeof productName !== 'string' || productName.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `productName is required and must be less than ${MAX_TEXT_LENGTH} characters` };
  }

  if (!animalIngredients || typeof animalIngredients !== 'string' || animalIngredients.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `animalIngredients is required and must be less than ${MAX_TEXT_LENGTH} characters` };
  }

  if (!VALID_ETHICAL_LENS.includes(ethicalLens)) {
    return { valid: false, error: 'ethicalLens must be 1, 2, 3, or 4' };
  }

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

// -------- Lens boundary validator (aligned to 4 lenses) -----------------------

/**
 * Validates the AI output against hard “lens boundary” rules.
 * - Lens 1 ("Higher-Welfare Omnivore"): NO plant-based/cultured or reduction language.
 * - Lens 2 ("Lower Consumption"): ONLY reduction language; NO certifications / plant-based / substitutions.
 * - Lens 3 ("No Slaughter"): NO meat/fish/poultry/gelatin; vegetarian only. Vegan language allowed but not required.
 * - Lens 4 ("No Animal Use"): No hard restrictions here (prompt enforces plant-only).
 *
 * Returns violations (fatal) and warnings (soft).
 */
function validateLensBoundaries(
  response: any,
  ethicalLens: number
): { violations: string[], warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
  const generalNote = String(response?.generalNote ?? '');

  // Helper to scan arbitrary text with a list of regexes
  const scan = (txt: string, rules: RegExp[]): string[] => {
    const hits: string[] = [];
    for (const rx of rules) {
      const m = txt.match(rx);
      if (m) hits.push(m[0]);
    }
    return hits;
  };

  // Common pattern lists
  const plantBasedTerms = [
    /plant[-\s]?based/i, /\bvegan\b/i, /\bvegetarian\b/i, /\btofu\b/i, /\btempeh\b/i, /\bseitan\b/i,
    /\boat milk\b/i, /\bsoy milk\b/i, /\balmond milk\b/i, /\bcashew\b/i, /\bmycoprotein\b/i,
    /\bimpossible\b/i, /\bbeyond meat\b/i, /\bjackfruit\b/i
  ];
  const culturedTerms = [/lab[-\s]?grown/i, /cultured\s+(meat|dairy|protein)/i, /precision\s+fermentation/i];
  const certificationTerms = [
    /certified/i, /humane/i, /pasture[-\s]?raised/i, /cage[-\s]?free/i, /organic/i, /GAP/i,
    /animal\s+welfare\s+approved/i, /\bMSC\b/i, /friend\s+of\s+the\s+sea/i, /\bRWS\b/i
  ];
  const reductionTerms = [
    /\bportion\b/i, /\bsmaller\b/i, /\breeduce(d|r|)\b/i, /\bless\b/i, /\blower\b/i, /\bhalve\b/i,
    /\bfrequency\b/i, /\bonce (a|per)\s+week\b/i, /\btwice (a|per)\s+week\b/i
  ];
  const meatFishPoultryWords = [
    /\b(beef|pork|chicken|turkey|lamb|mutton|veal|duck|fish|tuna|salmon|anchov(y|ies)|shrimp|prawn|octopus|squid)\b/i,
    /\bgelatin\b/i, /\bbroth\b/i, /\bfish sauce\b/i, /\banchovy\b/i
  ];

  // Build per-lens rule sets
  if (ethicalLens === 1) {
    // LENS 1: forbid plant-based/cultured/reduction language
    const hard = [...plantBasedTerms, ...culturedTerms, ...reductionTerms];
    const checkText = (label: string, txt: string) => {
      const hits = scan(txt, hard);
      if (hits.length) {
        violations.push(`${label} contains forbidden language for Lens 1: ${hits.join(', ')}`);
      }
    };

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const txt = `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`;
      checkText(`Suggestion ${i + 1} ("${s?.name ?? 'unnamed'}")`, txt);
    }
    checkText('generalNote', generalNote);
  }

  if (ethicalLens === 2) {
    // LENS 2: reduction ONLY. Forbid plant-based/cultured/certification/substitution language.
    const hard = [
      ...plantBasedTerms, ...culturedTerms, ...certificationTerms,
      /\bsubstitute\b/i, /\bswap\b/i, /\breplace\b/i, /\balternative\b/i
    ];
    const mustContain = reductionTerms; // at least some reduction language should appear

    const requiresReductionPhrase = (txt: string) => scan(txt, mustContain).length > 0;

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const txt = `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`;

      const hardHits = scan(txt, hard);
      if (hardHits.length) {
        violations.push(`Suggestion ${i + 1} ("${s?.name ?? 'unnamed'}") contains non-reduction language forbidden for Lens 2: ${hardHits.join(', ')}`);
      }
      if (!requiresReductionPhrase(txt)) {
        violations.push(`Suggestion ${i + 1} ("${s?.name ?? 'unnamed'}") does not clearly state a portion/frequency reduction as required for Lens 2.`);
      }
    }

    // General note may talk about reduction; still forbid plant/certification talk
    const gnHits = scan(generalNote, [...plantBasedTerms, ...culturedTerms, ...certificationTerms]);
    if (gnHits.length) {
      violations.push(`generalNote contains forbidden non-reduction language for Lens 2: ${gnHits.join(', ')}`);
    }
  }

  if (ethicalLens === 3) {
    // LENS 3: vegetarian — forbid meat/fish/poultry/gelatin
    const hard = meatFishPoultryWords;

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const txt = `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`;
      const hits = scan(txt, hard);
      if (hits.length) {
        violations.push(`Suggestion ${i + 1} ("${s?.name ?? 'unnamed'}") includes slaughtered-animal terms forbidden for Lens 3: ${hits.join(', ')}`);
      }
    }

    const gnHits = scan(generalNote, hard);
    if (gnHits.length) {
      violations.push(`generalNote includes slaughtered-animal terms forbidden for Lens 3: ${gnHits.join(', ')}`);
    }

    // Soft warning: blends/hybrids language tends to sneak in
    const softBlend = [/\bblend(ed)?\b/i, /\bmix(ed)?\b/i, /\bhybrid\b/i, /\bwith added\b/i, /\bincorporat(es?|ing)\b/i, /\b\d+%\b/];
    const warnIf = (label: string, txt: string) => {
      const hits = scan(txt, softBlend);
      if (hits.length) warnings.push(`${label} contains discouraged “blend/mix/hybrid/%” language (Lens 3): ${hits.join(', ')}`);
    };
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      warnIf(`Suggestion ${i + 1}`, `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`);
    }
    warnIf('generalNote', generalNote);
  }

  // LENS 4: Vegan — validator remains permissive; the prompt enforces animal-free.
  // (We intentionally do not block here to avoid false positives.)

  return { violations, warnings };
}

// -------- Initialization ------------------------------------------------------

const initAIHandler = () => {
  if (!(globalThis as any).__aiHandler) {
    console.log('🔧 Initializing AI Handler with Lovable AI (GPT-5)');
    (globalThis as any).__aiHandler = true;
  }
};

// -------- HTTP handler --------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse & validate
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
    } as const;

    console.log('🎯 Ethical Swap Request', {
      productName,
      ethicalLens,
      ethicalLensName: ethicalLensNames[ethicalLens as 1 | 2 | 3 | 4],
      animalIngredients_preview: animalIngredients.slice(0, 100)
    });

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

    const languageNames: Record<string, string> = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
      'zh': 'Chinese', 'hi': 'Hindi', 'ar': 'Arabic', 'ru': 'Russian'
    };
    const outputLanguage = languageNames[language] || 'English';

    // Load the runtime prompt
    const prompt = await loadAndProcessPrompt('suggest_ethical_swap', {
      PRODUCT_NAME: productName,
      ANIMAL_INGREDIENTS: animalIngredients,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage,
    });

    console.log('📝 Prompt variables', {
      PRODUCT_NAME: productName,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage
    });

    // Call Lovable AI (Gemini)
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
            content:
              'You are an expert in animal welfare and food ethics. You MUST follow ALL instructions EXACTLY as written, especially forbidden word lists and product naming rules. Your responses will be validated against strict rules — ANY violation will cause rejection. Respect the 4-lens mapping.'
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 8192,
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error('❌ Lovable AI error:', lovableResponse.status, errorText);

      if (lovableResponse.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Rate limit exceeded', details: 'Too many requests. Please try again in a moment.' },
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (lovableResponse.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Payment required', details: 'Please add credits to your Lovable AI workspace.' },
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
        JSON.stringify({ success: false, error: { message: 'No text response from AI' } }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanedText = text;

    try {
      // Strip optional markdown fences
      cleanedText = text.replace(/```(?:json)?/gi, '').trim();

      const parsedResponse = JSON.parse(cleanedText);

      console.log('✅ AI response parsed', {
        ethicalLensPosition: parsedResponse.ethicalLensPosition,
        requestedLens: ethicalLens,
        suggestionsCount: parsedResponse?.suggestions?.length ?? 0
      });

      // Sanity check lens title (do not block; just warn)
      const expectedPositions = {
        1: 'Higher-Welfare Omnivore',
        2: 'Lower Consumption',
        3: 'No Slaughter',
        4: 'No Animal Use'
      } as const;

      if (parsedResponse.ethicalLensPosition !== expectedPositions[ethicalLens as 1 | 2 | 3 | 4]) {
        console.warn('⚠️ LENS TITLE MISMATCH', {
          expected: expectedPositions[ethicalLens as 1 | 2 | 3 | 4],
          got: parsedResponse.ethicalLensPosition
        });
      }

      // Hard validation: lens boundaries
      const boundary = validateLensBoundaries(parsedResponse, ethicalLens);

      if (boundary.warnings.length) {
        console.warn(`⚠️ Lens ${ethicalLens} warnings:`, boundary.warnings);
      }

      if (boundary.violations.length) {
        console.error(`❌ Lens ${ethicalLens} violations:`, boundary.violations);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Lens boundary violation',
              details: `AI generated suggestions that violate Lens ${ethicalLens} boundaries.`,
              violations: boundary.violations,
            },
          }),
          // IMPORTANT: validation failure is NOT a server error
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI response (first 500 chars):', text.substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'JSON Parse error: Invalid AI response',
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Keep the existing success payload shape for compatibility
    const data = {
      candidates: [{
        content: {
          parts: [{ text: cleanedText }]
        }
      }]
    };

    console.log('🎉 Ethical swap suggestions generated successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-ethical-swap function:', error);

    const errorStr = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Failed to generate ethical swap suggestions. Please try again.';

    if (errorStr.includes('LOVABLE_API_KEY') || errorStr.includes('AI')) {
      safeMessage = 'AI service temporarily unavailable. Please try again later.';
    } else if (errorStr.includes('auth') || errorStr.includes('token')) {
      safeMessage = 'Authentication required. Please sign in and try again.';
    } else if (errorStr.includes('Rate limit')) {
      safeMessage = 'Too many requests. Please try again in a moment.';
    }

    return new Response(
      JSON.stringify({ success: false, error: { message: safeMessage } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});