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
    /\breeduce(s|d|r|ing)?\b/i, /\bless\b/i, /\blower\b/i, /\blimit\b/i,
    /\bfrequency\b/i, /\bfrequently\b/i, /\boften\b/i,
    /\bonce (a|per)\s+week\b/i, /\btwice (a|per)\s+week\b/i, /\bper\s+week\b/i,
    /\b\d+\s*times?\s*(a|per)\s+week\b/i, /\b\d+\s*days?\s*(a|per)\s+week\b/i,
    /\bsome\s+meals\b/i, /\bmeatless\b/i, /\bfewer\b/i, /\boccasional(ly)?\b/i, 
    /\beat\s+less\b/i, /\bless\s+frequently\b/i,
    /\bsmaller\s+amounts?\b/i, /\bdecrease(s|d|r|ing)?\b/i, /\blessen(s|ed|ing)?\b/i,
    /\bconsumption\b/i, /\buse\b/i  // Comprehensive reduction language
  ];
  const meatFishPoultryWords = [
    /\b(beef|pork|chicken|turkey|lamb|mutton|veal|duck|fish|tuna|salmon|anchov(y|ies)|shrimp|prawn|octopus|squid)\b/i,
    /\bgelatin\b/i, /\bbroth\b/i, /\bfish sauce\b/i, /\banchovy\b/i
  ];

  // Lens 1
  if (ethicalLens === 1) {
    // For Lens 1, only forbid consumption-reduction language, not welfare-improvement language
    const consumptionReductionTerms = [
      /\b(reduce|reducing|reduced)\s+(consumption|intake|use|frequency)\b/i,
      /\beat\s+less\b/i, /\bless\s+frequently\b/i, /\bless\s+often\b/i,
      /\bfewer\s+(meals|times|products)\b/i,
      /\bsmaller\s+(portions?|amounts?)\b/i,
      /\bdecrease\s+(consumption|intake|use)\b/i,
      /\b(once|twice|\d+\s*times?)\s+(a|per)\s+week\b/i,
      /\bsome\s+meals\b/i, /\bmeatless\b/i, /\boccasional(ly)?\b/i
    ];
    const hard = [...plantBasedTerms, ...culturedTerms, ...consumptionReductionTerms];
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
  
  const portionReductionTerms = [
    /\bsmaller\s+(portion|portions|serving|servings|amount|amounts|slice|slices|fillet|steak|cup|cups|spoon|spoons|container|carton|bottle)s?\b/i,
    /\b(use|consume|add|pour)\s+less\b/i,
    /\bhalf(\s+the)?\s+(amount|portion|serving)\b/i,
    /\breduce(d)?\s+(amount|portion|serving|size)\b/i,
    /\b30g\b/i
  ];

  const frequencyReductionTerms = [
    /\b(meatless|dairy-free)\s+day(s)?\b/i,
    /\b(once|twice|\d+\s*(times|days))\s+(a|per)\s+week\b/i,
    /\boccasional(ly)?\b/i,
    /\bfewer\s+(meals|times|days)\b/i,
    /\buse\b.*\bonly\b.*\b(sometimes|occasionally|rarely)\b/i,
    /\balternate\b/i,
    /\breplace\b/i,
    /\bswap\b/i,
    /\bsubstitute\b/i
  ];


  // // Lens 2
  // if (ethicalLens === 2) {
  //   const hard = [
  //     /\b(fully|100%|completely)\s*(vegan|plant[-\s]?based)\b/i,
  //     /\bno animal use\b/i,
  //     /\beliminate\b/i,
  //     /\bexclude all\b/i
  //   ];
  //   const softAllow = [...plantBasedTerms, ...culturedTerms, ...certificationTerms];
  //   const hasReductionCue = (txt: string) => reductionTerms.some(r => r.test(txt));
    
  //   // Helper: Check if text implies reduction through combination or partial language
  //   const impliesReduction = (txt: string) => {
  //     const hasPlantBased = plantBasedTerms.some(p => p.test(txt));
  //     const hasCertification = certificationTerms.some(c => c.test(txt));
  //     const hasPartialLanguage = /\b(partial|some|mix|combine|both|and|while)\b/i.test(txt);
  //     return (hasPlantBased && hasCertification) || hasPartialLanguage;
  //   };
    
  //   const check = (label: string, txt: string) => {
  //     const hardHits = scan(txt, hard);
  //     if (hardHits.length)
  //       violations.push(`${label} contains forbidden elimination/vegan language for Lens 2: ${hardHits.join(', ')}`);
      
  //     // Allow if has explicit reduction cue OR implies reduction through combination
  //     if (!hasReductionCue(txt) && !impliesReduction(txt))
  //       violations.push(`${label} lacks an explicit reduction cue (e.g., "less often," "some meals per week"). Lens 2 requires reduction context.`);
      
  //     const softHits = scan(txt, softAllow);
  //     if (softHits.length && !hasReductionCue(txt) && !impliesReduction(txt))
  //       violations.push(`${label} mentions plant-based or certification terms without reduction context (Lens 2): ${softHits.join(', ')}`);
  //   };
  //   for (let i = 0; i < suggestions.length; i++) {
  //     const s = suggestions[i];
  //     check(`Suggestion ${i + 1}`, `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`);
  //   }
  //   check('generalNote', generalNote);
  // }
 

  
  // Lens 2
  if (ethicalLens === 2) {
    const hard = [
      /\b(fully|100%|completely)\s*(vegan|plant[-\s]?based)\b/i,
      /\bno animal use\b/i,
      /\beliminate\b/i,
      /\bexclude all\b/i
    ];

    const softAllow = [
      ...plantBasedTerms,
      ...culturedTerms,
      ...certificationTerms
    ];

    const hasFrequencyReduction = (txt: string): boolean =>
      frequencyReductionTerms.some((r) => r.test(txt));

    const hasEthicalSubstitution = (txt: string): boolean =>
      plantBasedTerms.some((r) => r.test(txt)) ||
      culturedTerms.some((r) => r.test(txt)) ||
      certificationTerms.some((r) => r.test(txt));

    const usesPortionReduction = (txt: string): boolean =>
      portionReductionTerms.some((r) => r.test(txt));

    const check = (label: string, raw: string): void => {
      const txt = raw || '';

      // 1) bloquear "virar Lens 4"
      const hardHits = scan(txt, hard);
      if (hardHits.length) {
        violations.push(
          `${label} contains forbidden elimination/vegan language for Lens 2: ${hardHits.join(', ')}`
        );
      }

      // 2) bloquear sugestões puramente de porção/volume
      if (usesPortionReduction(txt) && !hasFrequencyReduction(txt) && !hasEthicalSubstitution(txt)) {
        violations.push(
          `${label} focuses on portion/volume reduction (e.g. "smaller portions", "less per serving", "smaller containers") without reduced frequency or ethical substitution, which is forbidden for Lens 2.`
        );
      }

      // 3) exigir redução de frequência e/ou substituição ética
      if (!hasFrequencyReduction(txt) && !hasEthicalSubstitution(txt)) {
        violations.push(
          `${label} lacks required Lens 2 behavior: reduce weekly frequency and/or alternate with high-welfare or plant-based options.`
        );
      }

      // 4) se citar plant-based/certificação sem contexto de redução → warning
      const softHits = scan(txt, softAllow);
      if (softHits.length && !hasFrequencyReduction(txt) && !hasEthicalSubstitution(txt)) {
        warnings.push(
          `${label} mentions plant-based or certification terms without clear reduction/alternation context (Lens 2): ${softHits.join(', ')}`
        );
      }
    };

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      check(
        `Suggestion ${i + 1}`,
        `${s?.name ?? ''} ${s?.description ?? ''} ${s?.reasoning ?? ''}`
      );
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

// -------- Retry Logic with Exponential Backoff -------------------------------

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on validation errors or client errors
      if (lastError.message.includes('validation') || lastError.message.includes('400')) {
        throw lastError;
      }
      
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// -------- Intelligent Fallback ------------------------------------------------

function intelligentFallback(ethicalLens: number, productName: string, language: string = 'en'): Response {
  console.log('🔄 [FALLBACK] Using intelligent fallback for lens', ethicalLens);
  
  const fallbackResponses: Record<number, any> = {
    3: { // Lens 3: No Slaughter (Vegetarian)
      ethicalLensPosition: 'no_slaughter',
      suggestions: [
        {
          name: 'Marinated Tofu',
          description: 'Firm or extra-firm tofu, pressed and marinated, provides a versatile protein base with excellent texture',
          category: 'PLANT_PROTEIN',
          confidence: 'high',
          reasoning: 'Tofu is a complete protein source that can absorb flavors well and works in most cooking methods',
          availability: 'widely_available'
        },
        {
          name: 'Tempeh',
          description: 'Fermented soybean cake with a nutty flavor and firm texture, rich in protein and nutrients',
          category: 'PLANT_PROTEIN',
          confidence: 'high',
          reasoning: 'Tempeh offers superior nutritional profile and satisfying texture without animal slaughter',
          availability: 'widely_available'
        },
        {
          name: 'King Oyster Mushrooms',
          description: 'Thick, meaty mushrooms that can be scored and cooked to create a satisfying texture',
          category: 'FUNGI',
          confidence: 'high',
          reasoning: 'Provides umami depth and substantial texture that works well as a plant-based centerpiece',
          availability: 'specialty_stores'
        },
        {
          name: 'Seasoned Seaweed or Kelp',
          description: 'Nutrient-rich sea vegetables that offer ocean-like flavors and important minerals',
          category: 'SEA_VEGETABLE',
          confidence: 'medium',
          reasoning: 'Provides oceanic taste profile and beneficial nutrients without harming marine animals',
          availability: 'widely_available'
        }
      ],
      generalNote: 'These vegetarian alternatives avoid all animal slaughter while providing protein, umami flavors, and satisfying textures. Each option can be prepared in various ways to suit your culinary needs.'
    },
    4: { // Lens 4: No Animal Use (Vegan)
      ethicalLensPosition: 'no_animal_use',
      suggestions: [
        {
          name: 'Seasoned Tofu',
          description: 'Plant-based protein that completely avoids all animal products',
          category: 'PLANT_PROTEIN',
          confidence: 'high',
          reasoning: 'Provides complete protein without any animal exploitation',
          availability: 'widely_available'
        },
        {
          name: 'Jackfruit (prepared)',
          description: 'Shredded young jackfruit provides a unique texture for plant-based dishes',
          category: 'PLANT_PROTEIN',
          confidence: 'medium',
          reasoning: 'Offers interesting texture and versatility with zero animal products',
          availability: 'widely_available'
        },
        {
          name: 'Plant-Based Seafood Alternatives',
          description: 'Made from konjac, algae, or legumes to mimic seafood texture and flavor',
          category: 'OTHER_VEGETARIAN',
          confidence: 'medium',
          reasoning: 'Specialized products designed to replicate seafood experience without any animal ingredients',
          availability: 'specialty_stores'
        }
      ],
      generalNote: 'These vegan alternatives completely eliminate animal use while maintaining culinary satisfaction and nutritional value.'
    }
  };

  const fallback = fallbackResponses[ethicalLens] || fallbackResponses[3];

  // Format response to match the expected Gemini API structure
  const responseText = JSON.stringify(fallback);
  const data = {
    candidates: [{ content: { parts: [{ text: responseText }] } }]
  };

  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// -------- Monitoring & Metrics ------------------------------------------------

interface RequestMetrics {
  lens: number;
  model: string;
  startTime: number;
  usedFallback: boolean;
  success: boolean;
  errorType?: string;
}

function logMetrics(metrics: RequestMetrics) {
  const duration = Date.now() - metrics.startTime;
  console.log('📊 [METRICS]', {
    lens: metrics.lens,
    model: metrics.model,
    duration_ms: duration,
    fallback: metrics.usedFallback,
    success: metrics.success,
    error: metrics.errorType
  });
}

// -------- Initialization ------------------------------------------------------

const initAIHandler = () => {
  if (!(globalThis as any).__aiHandler) {
    console.log('🔧 Initializing AI Handler with Lovable AI (Gemini Pro for Lens 3)');
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

    // Initialize metrics tracking
    const metrics: RequestMetrics = {
      lens: ethicalLens,
      model: ethicalLens === 3 ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
      startTime: Date.now(),
      usedFallback: false,
      success: false
    };

    const ethicalLensNames = {
      1: 'Higher-Welfare Omnivore',
      2: 'Lower Consumption',
      3: 'No Slaughter',
      4: 'No Animal Use'
    } as const;

    console.log('🎯 [REQUEST] Ethical Swap Request', {
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

    let promptText = await loadAndProcessPrompt('suggest_ethical_swap', {
      PRODUCT_NAME: productName,
      ANIMAL_INGREDIENTS: animalIngredients,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage,
    });

    // CRITICAL: Use Chain-of-Thought prompting for Lens 3
    if (ethicalLens === 3) {
      const isFishSeafood = /fish|seafood|mullet|salmon|tuna|cod|tilapia|trout|bass|shrimp|crab|lobster|anchovy|sardine|mackerel|herring|prawn|squid|octopus/i.test(productName + ' ' + animalIngredients);
      
      const cotPrompt = `
🎯 CRITICAL INSTRUCTION - CHAIN-OF-THOUGHT PROCESS REQUIRED 🎯

You are a vegetarian chef assistant. A customer wants an alternative for "${productName}".

BEFORE you provide your final JSON response, you MUST complete this reasoning process:

STEP 1: Identify the food item
- Product: "${productName}"
- Animal ingredients: "${animalIngredients}"
- Is this fish/seafood? ${isFishSeafood ? 'YES' : 'NO'}

STEP 2: State the absolute constraint
"I am helping with Lens 3 (VEGETARIAN - NO SLAUGHTER). I MUST suggest ONLY plant-based ingredients, fungi, sea vegetables, or dairy/egg alternatives. I MUST NOT suggest any fish, seafood, poultry, or mammal flesh."

STEP 3: Brainstorm 5-7 vegetarian alternatives
Think of alternatives from these categories ONLY:
- Plant proteins: tofu, tempeh, seitan, jackfruit, legumes
- Fungi: mushrooms (king oyster, portobello, shiitake)
- Sea vegetables: nori, kelp, dulse, wakame, spirulina
- Dairy/eggs: if appropriate for the dish

STEP 4: CRITICAL VALIDATION
For EACH alternative you brainstormed:
- Does it contain fish, seafood, meat, or poultry? If YES → DELETE IT
- Is it purely vegetarian? If YES → Keep it

STEP 5: Verify final list
- Count: Do I have 3-5 alternatives?
- Compliance: Are ALL alternatives vegetarian?
- If any fail → Generate new vegetarian alternatives

STEP 6: Format final response
Now generate the JSON response with your verified vegetarian alternatives.

${promptText}
`;
      promptText = cotPrompt;
    }

    const prompt = promptText;

    // CRITICAL: Use more powerful model for Lens 3 due to compliance challenges
    const model = ethicalLens === 3 ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';

    // Define structured output schema for Lens 3 to enforce categorical constraints
    const tools = ethicalLens === 3 ? [
      {
        type: 'function',
        function: {
          name: 'provide_vegetarian_alternative',
          description: 'Provide vegetarian alternatives for a food item. ONLY vegetarian options allowed - NO fish, seafood, meat, or poultry.',
          parameters: {
            type: 'object',
            properties: {
              ethicalLensPosition: {
                type: 'string',
                enum: ['welfarist_reduce_harm', 'partial_substitution', 'no_slaughter', 'no_animal_use'],
                description: 'The ethical lens position'
              },
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Name of the VEGETARIAN alternative (plant-based, fungi, sea vegetable, dairy, or egg)' },
                    description: { type: 'string', description: 'How this vegetarian alternative compares' },
                    category: {
                      type: 'string',
                      enum: ['PLANT_PROTEIN', 'FUNGI', 'SEA_VEGETABLE', 'LEGUME', 'DAIRY', 'EGG', 'CULTURED', 'OTHER_VEGETARIAN'],
                      description: 'Category - must be vegetarian, NOT fish/meat/poultry'
                    },
                    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                    reasoning: { type: 'string', description: 'Welfare-focused reasoning for this vegetarian choice' },
                    availability: { type: 'string', enum: ['widely_available', 'specialty_stores', 'emerging'] }
                  },
                  required: ['name', 'description', 'category', 'confidence', 'reasoning', 'availability']
                },
                minItems: 3,
                maxItems: 5
              },
              generalNote: { type: 'string', description: 'General guidance about VEGETARIAN alternatives' }
            },
            required: ['ethicalLensPosition', 'suggestions', 'generalNote']
          }
        }
      }
    ] : undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // Longer timeout for Pro model

    try {
      const requestBody: any = {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in animal welfare and ethical food alternatives. You provide scientifically accurate, welfare-focused suggestions that strictly adhere to the specified ethical lens constraints. For Lens 3 (No Slaughter), you ONLY suggest vegetarian alternatives and NEVER suggest fish, seafood, meat, or poultry.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Lower temperature for more deterministic output
      };

      // Add structured output for Lens 3
      if (tools) {
        requestBody.tools = tools;
        requestBody.tool_choice = { type: 'function', function: { name: 'provide_vegetarian_alternative' } };
      }

      console.log(`🤖 [AI_CALL] Calling ${model} for Lens ${ethicalLens}${tools ? ' with structured output' : ''}`);

      // Use retry logic with exponential backoff
      const lovableResponse = await retryWithBackoff(async () => {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        // Handle rate limiting and payment required errors
        if (response.status === 429) {
          metrics.errorType = 'rate_limit';
          console.error('⚠️ [RATE_LIMIT] 429 - Too many requests, will retry');
          throw new Error('Rate limit exceeded - retrying');
        }

        if (response.status === 402) {
          metrics.errorType = 'payment_required';
          console.error('💳 [PAYMENT] 402 - Payment required');
          // Don't retry on payment errors
          if (ethicalLens === 3 || ethicalLens === 4) {
            metrics.usedFallback = true;
            throw new Error('payment_required_fallback');
          }
          throw new Error('Payment required - please add credits to your Lovable AI workspace');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [AI_ERROR] ${response.status}:`, errorText);
          throw new Error(`AI error: ${response.status}`);
        }

        return response;
      }, 3, 2000).finally(() => clearTimeout(timeout));

      // Handle special fallback case for payment required
      if (lovableResponse instanceof Error && lovableResponse.message === 'payment_required_fallback') {
        console.log('🔄 [FALLBACK] Payment required, using intelligent fallback');
        return intelligentFallback(ethicalLens, productName, language);
      }

      const lovableData = await lovableResponse.json();
      console.log('🔍 [AI_RESPONSE] Raw response received:', {
        hasChoices: !!lovableData.choices,
        choicesLength: lovableData.choices?.length,
        hasToolCalls: !!lovableData.choices?.[0]?.message?.tool_calls
      });

      let parsedResponse;

      // Handle structured output (tool calling) for Lens 3
      if (tools && lovableData.choices?.[0]?.message?.tool_calls) {
        const toolCall = lovableData.choices[0].message.tool_calls[0];
        console.log('🔧 [TOOL_CALL] Structured output received');
        
        try {
          parsedResponse = JSON.parse(toolCall.function.arguments);
          console.log('✅ [PARSE] Structured output parsed successfully');
        } catch (parseError) {
          console.error('❌ [PARSE_ERROR] Tool call parse failed:', parseError);
          metrics.errorType = 'parse_error';
          metrics.usedFallback = true;
          return intelligentFallback(ethicalLens, productName, language);
        }
      } else {
        // Handle regular text response
        const text = lovableData.choices?.[0]?.message?.content?.trim();
        if (!text) {
          console.error('❌ [EMPTY] AI returned empty response');
          metrics.errorType = 'empty_response';
          metrics.usedFallback = true;
          return intelligentFallback(ethicalLens, productName, language);
        }

        // Extract JSON from response
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          console.error('❌ [NO_JSON] No JSON found in AI response:', text.slice(0, 200));
          metrics.errorType = 'no_json';
          metrics.usedFallback = true;
          return intelligentFallback(ethicalLens, productName, language);
        }

        const cleanedText = jsonMatch[0];
        try {
          parsedResponse = JSON.parse(cleanedText);
          console.log('✅ [PARSE] Text response parsed successfully');
        } catch (parseError) {
          console.error('❌ [PARSE_ERROR] JSON parse failed:', parseError);
          metrics.errorType = 'parse_error';
          metrics.usedFallback = true;
          return intelligentFallback(ethicalLens, productName, language);
        }
      }

      console.log('✅ [PARSED] Response structure:', {
        ethicalLensPosition: parsedResponse.ethicalLensPosition,
        requestedLens: ethicalLens,
        suggestionsCount: parsedResponse?.suggestions?.length ?? 0
      });

      // Validate the response against lens boundaries
      const boundary = validateLensBoundaries(parsedResponse, ethicalLens);
      
      if (boundary.violations.length) {
        console.error('🚫 [VALIDATION] Lens boundary violations:', boundary.violations);
        metrics.errorType = 'boundary_violation';
        metrics.usedFallback = true;
        return intelligentFallback(ethicalLens, productName, language);
      }

      if (boundary.warnings.length) {
        console.warn('⚠️ [VALIDATION] Warnings detected:', boundary.warnings);
      }

      // Format response for compatibility with existing client code
      const responseText = JSON.stringify(parsedResponse);
      const data = {
        candidates: [{ content: { parts: [{ text: responseText }] } }]
      };
      
      metrics.success = true;
      logMetrics(metrics);
      
      console.log('🎉 [SUCCESS] Ethical swap suggestions generated successfully');
      return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      console.error('❌ [ERROR] Lovable AI call failed:', error);
      metrics.errorType = error instanceof Error ? error.message : 'unknown';
      
      // Use intelligent fallback on error for Lens 3/4
      if (ethicalLens === 3 || ethicalLens === 4) {
        console.log('🔄 [FALLBACK] Error occurred, using intelligent fallback');
        metrics.usedFallback = true;
        logMetrics(metrics);
        return intelligentFallback(ethicalLens, productName, language);
      }
      
      logMetrics(metrics);
      throw error;
    }

  } catch (error) {
    console.error('❌ [FATAL] Error in suggest-ethical-swap function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: { message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
