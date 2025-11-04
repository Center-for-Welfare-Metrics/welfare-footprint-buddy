// supabase/functions/suggest-ethical-swap/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { loadAndProcessPrompt } from '../_shared/prompt-loader.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Basic injection guard
  if (/[{}[\]]{2,}/.test(productName) || /[{}[\]]{2,}/.test(animalIngredients)) {
    return { valid: false, error: 'Suspicious input detected.' };
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

// -------- Lens boundary validator --------------------------------------------

function validateLensBoundaries(response: any, ethicalLens: number): { violations: string[], warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
  const generalNote = String(response?.generalNote ?? '');

  const scan = (txt: string, rules: RegExp[]): string[] => {
    const hits: string[] = [];
    for (const rx of rules) {
      const m = txt.match(rx);
      if (m) hits.push(m[0]);
    }
    return hits;
  };

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
    /\bportion\b/i, /\bsmaller\b/i, /\breeduce(s|d|r|ing)?\b/i, /\bless\b/i, /\blower\b/i, /\bhalve\b/i,
    /\bfrequency\b/i, /\bonce (a|per)\s+week\b/i, /\btwice (a|per)\s+week\b/i, /\bper\s+week\b/i,
    /\bsome\s+meals\b/i, /\bmeatless\b/i, /\bfewer\b/i, /\boccasional(ly)?\b/i, /\beat\s+less\b/i
  ];
  const meatFishPoultryWords = [
    /\b(beef|pork|chicken|turkey|lamb|mutton|veal|duck|fish|tuna|salmon|anchov(y|ies)|shrimp|prawn|octopus|squid)\b/i,
    /\bgelatin\b/i, /\bbroth\b/i, /\bfish sauce\b/i, /\banchovy\b/i
  ];

  // Lens 1
  if (ethicalLens === 1) {
    const hard = [...plantBasedTerms, ...culturedTerms, ...reductionTerms];
    const checkText = (label: string, txt: string) => {
      const hits = scan(txt, hard);
      if (hits.length) violations.push(`${label} contains forbidden language for Lens 1: ${hits.join(', ')}`);
    };
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      checkText(`Suggestion ${i + 1}`, `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`);
    }
    checkText('generalNote', generalNote);
  }

  // Lens 2
  if (ethicalLens === 2) {
    const hard = [
      /\b(fully|100%|completely)\s*(vegan|plant[-\s]?based)\b/i,
      /\bno animal use\b/i,
      /\beliminate\b/i,
      /\bexclude all\b/i
    ];
    const softAllow = [...plantBasedTerms, ...culturedTerms, ...certificationTerms];
    const hasReductionCue = (txt: string) => reductionTerms.some(r => r.test(txt));
    const check = (label: string, txt: string) => {
      const hardHits = scan(txt, hard);
      if (hardHits.length)
        violations.push(`${label} contains forbidden elimination/vegan language for Lens 2: ${hardHits.join(', ')}`);
      if (!hasReductionCue(txt))
        violations.push(`${label} lacks an explicit reduction cue (e.g., “less often,” “some meals per week”). Lens 2 requires reduction context.`);
      const softHits = scan(txt, softAllow);
      if (softHits.length && !hasReductionCue(txt))
        violations.push(`${label} mentions plant-based or certification terms without reduction context (Lens 2): ${softHits.join(', ')}`);
    };
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      check(`Suggestion ${i + 1}`, `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`);
    }
    check('generalNote', generalNote);
  }

  // Lens 3
  if (ethicalLens === 3) {
    const hard = meatFishPoultryWords;
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const hits = scan(`${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`, hard);
      if (hits.length)
        violations.push(`Suggestion ${i + 1} includes slaughtered-animal terms forbidden for Lens 3: ${hits.join(', ')}`);
    }
    const gnHits = scan(generalNote, hard);
    if (gnHits.length)
      violations.push(`generalNote includes slaughtered-animal terms forbidden for Lens 3: ${gnHits.join(', ')}`);
  }

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
    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, error: { message: validation.error } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { productName, animalIngredients, ethicalLens, language } = validation.data!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
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

    const languageNames: Record<string, string> = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
      zh: 'Chinese', hi: 'Hindi', ar: 'Arabic', ru: 'Russian'
    };
    const outputLanguage = languageNames[language] ?? 'English';

    const prompt = await loadAndProcessPrompt('suggest_ethical_swap', {
      PRODUCT_NAME: productName,
      ANIMAL_INGREDIENTS: animalIngredients,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in animal welfare and food ethics. Follow ALL instructions exactly. Respect the 4-lens mapping.'
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 8192,
      }),
    }).finally(() => clearTimeout(timeout));

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error('❌ Lovable AI error:', lovableResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: { message: `Lovable AI error: ${lovableResponse.status}` } }),
        { status: lovableResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableData = await lovableResponse.json();
    const text = lovableData.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error('❌ AI returned empty response');
      return new Response(JSON.stringify({ 
        success: false, 
        error: { message: 'AI returned empty response. Please try again.' } 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract JSON from response
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in AI response:', text.slice(0, 200));
      return new Response(JSON.stringify({ 
        success: false, 
        error: { message: 'AI returned invalid format. Please try again.' } 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cleanedText = jsonMatch[0];
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Attempted to parse:', cleanedText.slice(0, 200));
      return new Response(JSON.stringify({ 
        success: false, 
        error: { message: 'AI returned malformed data. Please try again.' } 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ AI response parsed', {
      ethicalLensPosition: parsedResponse.ethicalLensPosition,
      requestedLens: ethicalLens,
      suggestionsCount: parsedResponse?.suggestions?.length ?? 0
    });

    const boundary = validateLensBoundaries(parsedResponse, ethicalLens);
    if (boundary.violations.length) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Lens boundary violation', violations: boundary.violations }
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = {
      candidates: [{ content: { parts: [{ text: cleanedText }] } }]
    };
    console.log('🎉 Ethical swap suggestions generated successfully');
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in suggest-ethical-swap function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: { message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});