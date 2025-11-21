// supabase/functions/suggest-ethical-swap/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// -------- Input validation ----------------------------------------------------

const MAX_TEXT_LENGTH = 5000;
const VALID_ETHICAL_LENS = [1, 2, 3, 4] as const;

interface ValidatedInput {
  productName: string;
  animalIngredients: string;
  ethicalLens: (typeof VALID_ETHICAL_LENS)[number];
  language: string;
}

function validateInput(body: any): {
  valid: boolean;
  data?: ValidatedInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { productName, animalIngredients, ethicalLens, language = "en" } = body;

  if (!productName || typeof productName !== "string" || productName.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `productName is required and must be less than ${MAX_TEXT_LENGTH} characters`,
    };
  }

  if (!animalIngredients || typeof animalIngredients !== "string" || animalIngredients.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `animalIngredients is required and must be less than ${MAX_TEXT_LENGTH} characters`,
    };
  }

  if (!VALID_ETHICAL_LENS.includes(ethicalLens)) {
    return {
      valid: false,
      error: "ethicalLens must be 1, 2, 3, or 4",
    };
  }

  const validLanguages = ["en", "es", "fr", "de", "pt", "zh", "hi", "ar", "ru"];
  if (language && !validLanguages.includes(language)) {
    return {
      valid: false,
      error: `Invalid language code. Must be one of: ${validLanguages.join(", ")}`,
    };
  }

  // Basic injection guard
  if (/[{}[\]]{2,}/.test(productName) || /[{}[\]]{2,}/.test(animalIngredients)) {
    return { valid: false, error: "Suspicious input detected." };
  }

  return {
    valid: true,
    data: {
      productName: productName.trim(),
      animalIngredients: animalIngredients.trim(),
      ethicalLens,
      language,
    },
  };
}

// -------- Lens boundary validator --------------------------------------------
// (Mantém só checagens essenciais; Lens 2 validator detalhado está desativado)

function validateLensBoundaries(response: any, ethicalLens: number): { violations: string[]; warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
  const generalNote = String(response?.generalNote ?? "");

  const scan = (txt: string, rules: RegExp[]): string[] => {
    const hits: string[] = [];
    for (const rx of rules) {
      const m = txt.match(rx);
      if (m) hits.push(m[0]);
    }
    return hits;
  };

  const plantBasedTerms = [
    /plant[-\s]?based/i,
    /\bvegan\b/i,
    /\bvegetarian\b/i,
    /\btofu\b/i,
    /\btempeh\b/i,
    /\bseitan\b/i,
    /\boat milk\b/i,
    /\bsoy milk\b/i,
    /\balmond milk\b/i,
    /\bcashew\b/i,
    /\bmycoprotein\b/i,
    /\bimpossible\b/i,
    /\bbeyond meat\b/i,
    /\bjackfruit\b/i,
  ];
  const culturedTerms = [/lab[-\s]?grown/i, /cultured\s+(meat|dairy|protein)/i, /precision\s+fermentation/i];
  const certificationTerms = [
    /certified/i,
    /humane/i,
    /pasture[-\s]?raised/i,
    /cage[-\s]?free/i,
    /organic/i,
    /GAP/i,
    /animal\s+welfare\s+approved/i,
    /\bMSC\b/i,
    /friend\s+of\s+the\s+sea/i,
    /\bRWS\b/i,
  ];
  const meatFishPoultryWords = [
    /\b(beef|pork|chicken|turkey|lamb|mutton|veal|duck|fish|tuna|salmon|anchov(y|ies)|shrimp|prawn|octopus|squid)\b/i,
    /\bgelatin\b/i,
    /\bbroth\b/i,
    /\bfish sauce\b/i,
    /\banchovy\b/i,
  ];

  // Lens 1: não pode virar reducetarian/vegano
  if (ethicalLens === 1) {
    const consumptionReductionTerms = [
      /\b(reduce|reducing|reduced)\s+(consumption|intake|use|frequency)\b/i,
      /\beat\s+less\b/i,
      /\bless\s+frequently\b/i,
      /\bless\s+often\b/i,
      /\bfewer\s+(meals|times|products)\b/i,
      /\bsmaller\s+(portions?|amounts?)\b/i,
      /\bdecrease\s+(consumption|intake|use)\b/i,
      /\b(once|twice|\d+\s*times?)\s+(a|per)\s+week\b/i,
      /\bsome\s+meals\b/i,
      /\bmeatless\b/i,
      /\boccasional(ly)?\b/i,
    ];
    const hard = [...plantBasedTerms, ...culturedTerms, ...consumptionReductionTerms];

    const checkText = (label: string, txt: string) => {
      const hits = scan(txt, hard);
      if (hits.length) {
        violations.push(`${label} contains forbidden language for Lens 1: ${hits.join(", ")}`);
      }
    };

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      checkText(`Suggestion ${i + 1}`, `${s?.name ?? ""} ${s?.description ?? ""} ${s?.reasoning ?? ""}`);
    }

    checkText("generalNote", generalNote);
  }

  // Lens 3: não pode aparecer carne/peixe/ave
  if (ethicalLens === 3) {
    const hard = meatFishPoultryWords;

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const hits = scan(`${s?.name ?? ""} ${s?.description ?? ""} ${s?.reasoning ?? ""}`, hard);
      if (hits.length) {
        violations.push(
          `Suggestion ${i + 1} includes slaughtered-animal terms forbidden for Lens 3: ${hits.join(", ")}`,
        );
      }
    }

    const gnHits = scan(generalNote, hard);
    if (gnHits.length) {
      violations.push(`generalNote includes slaughtered-animal terms forbidden for Lens 3: ${gnHits.join(", ")}`);
    }
  }

  return { violations, warnings };
}

// -------- Intelligent Fallback ------------------------------------------------

function intelligentFallback(ethicalLens: number, productName: string, language: string = "en"): Response {
  console.log("[suggest-ethical-swap] Using intelligent fallback for lens", ethicalLens);

  const fallbackResponses: Record<number, any> = {
    2: {
      // Lens 2: Lower Consumption
      ethicalLensPosition: "Lower Consumption",
      suggestions: [
        {
          name: "Alternate certified dairy milk and plant-based milk",
          description: "Use certified higher-welfare dairy milk on some days and oat/soy milk on others.",
          confidence: "high",
          reasoning: "Alternating reduces total dairy demand while prioritizing better systems when dairy is used.",
          availability: "widely_available",
        },
        {
          name: "Limit dairy milk to a few times per week",
          description:
            "Enjoy milk on fewer days and prioritize uses where it matters most (e.g., coffee) with certified sources.",
          confidence: "high",
          reasoning: "Fewer weekly uses directly reduce the number of animals kept in intensive conditions.",
          availability: "widely_available",
        },
        {
          name: "Plant-based versions for some recipes",
          description: "Use plant-based milks in smoothies, cereals or baking for part of the week.",
          confidence: "medium",
          reasoning: "Partial substitution reduces demand while keeping familiar uses possible.",
          availability: "widely_available",
        },
      ],
      generalNote:
        "Lower Consumption means enjoying animal products less often while prioritizing certified higher-welfare options and using plant-based alternatives in some meals to reduce overall demand.",
    },

    3: {
      // Lens 3: No Slaughter (Vegetarian)
      ethicalLensPosition: "no_slaughter",
      suggestions: [
        {
          name: "Marinated Tofu",
          description:
            "Firm or extra-firm tofu, pressed and marinated, provides a versatile protein base with excellent texture",
          category: "PLANT_PROTEIN",
          confidence: "high",
          reasoning: "Tofu is a complete protein source that can absorb flavors well and works in most cooking methods",
          availability: "widely_available",
        },
        {
          name: "Tempeh",
          description: "Fermented soybean cake with a nutty flavor and firm texture, rich in protein and nutrients",
          category: "PLANT_PROTEIN",
          confidence: "high",
          reasoning: "Tempeh offers superior nutritional profile and satisfying texture without animal slaughter",
          availability: "widely_available",
        },
        {
          name: "King Oyster Mushrooms",
          description: "Thick, meaty mushrooms that can be scored and cooked to create a satisfying texture",
          category: "FUNGI",
          confidence: "high",
          reasoning: "Provides umami depth and substantial texture that works well as a plant-based centerpiece",
          availability: "specialty_stores",
        },
        {
          name: "Seasoned Seaweed or Kelp",
          description: "Nutrient-rich sea vegetables that offer ocean-like flavors and important minerals",
          category: "SEA_VEGETABLE",
          confidence: "medium",
          reasoning: "Provides oceanic taste profile and beneficial nutrients without harming marine animals",
          availability: "widely_available",
        },
      ],
      generalNote:
        "These vegetarian alternatives avoid all animal slaughter while providing protein, umami flavors, and satisfying textures. Each option can be prepared in various ways to suit your culinary needs.",
    },

    4: {
      // Lens 4: No Animal Use (Vegan)
      ethicalLensPosition: "no_animal_use",
      suggestions: [
        {
          name: "Seasoned Tofu",
          description: "Plant-based protein that completely avoids all animal products",
          category: "PLANT_PROTEIN",
          confidence: "high",
          reasoning: "Provides complete protein without any animal exploitation",
          availability: "widely_available",
        },
        {
          name: "Jackfruit (prepared)",
          description: "Shredded young jackfruit provides a unique texture for plant-based dishes",
          category: "PLANT_PROTEIN",
          confidence: "medium",
          reasoning: "Offers interesting texture and versatility with zero animal products",
          availability: "widely_available",
        },
        {
          name: "Plant-Based Seafood Alternatives",
          description: "Made from konjac, algae, or legumes to mimic seafood texture and flavor",
          category: "OTHER_VEGETARIAN",
          confidence: "medium",
          reasoning: "Specialized products designed to replicate seafood experience without any animal ingredients",
          availability: "specialty_stores",
        },
      ],
      generalNote:
        "These vegan alternatives completely eliminate animal use while maintaining culinary satisfaction and nutritional value.",
    },
  };

  const fallback = fallbackResponses[ethicalLens] || fallbackResponses[3];

  const responseText = JSON.stringify(fallback);
  const data = {
    candidates: [{ content: { parts: [{ text: responseText }] } }],
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// -------- Initialization ------------------------------------------------------

const initAIHandler = () => {
  if (!(globalThis as any).__aiHandler) {
    console.log("🔧 Initializing AI Handler with Lovable AI (Gemini Pro for Lens 3)");
    (globalThis as any).__aiHandler = true;
  }
};

// -------- HTTP handler --------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validation = validateInput(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: validation.error },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { productName, animalIngredients, ethicalLens, language } = validation.data!;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    initAIHandler();

    const ethicalLensNames = {
      1: "Higher-Welfare Omnivore",
      2: "Lower Consumption",
      3: "No Slaughter",
      4: "No Animal Use",
    } as const;

    console.log("🎯 Ethical Swap Request", {
      productName,
      ethicalLens,
      ethicalLensName: ethicalLensNames[ethicalLens as 1 | 2 | 3 | 4],
      animalIngredients_preview: animalIngredients.slice(0, 100),
    });

    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
      zh: "Chinese",
      hi: "Hindi",
      ar: "Arabic",
      ru: "Russian",
    };
    const outputLanguage = languageNames[language] ?? "English";

    let promptText = await loadAndProcessPrompt("suggest_ethical_swap", {
      PRODUCT_NAME: productName,
      ANIMAL_INGREDIENTS: animalIngredients,
      ETHICAL_LENS: ethicalLens.toString(),
      OUTPUT_LANGUAGE: outputLanguage,
    });

    // Extra CoT apenas para Lens 3
    if (ethicalLens === 3) {
      const isFishSeafood =
        /fish|seafood|mullet|salmon|tuna|cod|tilapia|trout|bass|shrimp|crab|lobster|anchovy|sardine|mackerel|herring|prawn|squid|octopus/i.test(
          productName + " " + animalIngredients,
        );

      const cotPrompt = `
🎯 CRITICAL INSTRUCTION - CHAIN-OF-THOUGHT PROCESS REQUIRED 🎯

You are a vegetarian chef assistant. A customer wants an alternative for "${productName}".

BEFORE you provide your final JSON response, you MUST complete this reasoning process:

STEP 1: Identify the food item
- Product: "${productName}"
- Animal ingredients: "${animalIngredients}"
- Is this fish/seafood? ${isFishSeafood ? "YES" : "NO"}

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

    // Model selection
    const model = ethicalLens === 3 ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    // Structured output para Lens 3
    const tools =
      ethicalLens === 3
        ? [
            {
              type: "function",
              function: {
                name: "provide_vegetarian_alternative",
                description:
                  "Provide vegetarian alternatives for a food item. ONLY vegetarian options allowed - NO fish, seafood, meat, or poultry.",
                parameters: {
                  type: "object",
                  properties: {
                    ethicalLensPosition: {
                      type: "string",
                      enum: ["welfarist_reduce_harm", "partial_substitution", "no_slaughter", "no_animal_use"],
                      description: "The ethical lens position",
                    },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          category: {
                            type: "string",
                            enum: [
                              "PLANT_PROTEIN",
                              "FUNGI",
                              "SEA_VEGETABLE",
                              "LEGUME",
                              "DAIRY",
                              "EGG",
                              "CULTURED",
                              "OTHER_VEGETARIAN",
                            ],
                          },
                          confidence: {
                            type: "string",
                            enum: ["low", "medium", "high"],
                          },
                          reasoning: { type: "string" },
                          availability: {
                            type: "string",
                            enum: ["widely_available", "specialty_stores", "emerging"],
                          },
                        },
                        required: ["name", "description", "category", "confidence", "reasoning", "availability"],
                      },
                      minItems: 3,
                      maxItems: 5,
                    },
                    generalNote: { type: "string" },
                  },
                  required: ["ethicalLensPosition", "suggestions", "generalNote"],
                },
              },
            },
          ]
        : undefined;

    // ---------- System message com regras por lente ----------

    let systemMessage = `
You are an expert in animal welfare and ethical food alternatives.
You must follow the requested ethical lens strictly.
Focus ONLY on direct animal welfare and harm reduction.
Do NOT base arguments on environment, climate, health, or price.
`;

    if (ethicalLens === 2) {
      systemMessage += `
STRICT LENS 2 RULES (OVERRIDE ANYTHING ELSE IF CONFLICT):

1. You MUST NOT suggest strategies based primarily or exclusively on PORTION SIZE or VOLUME.
   Forbidden as main framing: "smaller portion", "use less", "half the amount",
   "smaller containers", "less per serving", "30g per day", etc.

2. EVERY suggestion and the generalNote MUST clearly:
   - reduce how OFTEN the product is consumed (less often, fewer times per week, limit to X times/week, occasionally, etc.),
   OR
   - use ALTERNATION / PARTIAL SUBSTITUTION that reduces demand:
     some meals with plant-based or cultured alternatives,
     and/or higher-welfare certified sources for the remaining uses.

3. If you write a suggestion that only shrinks volume (portion/grams/ml) without
   frequency reduction or substitution, you MUST REWRITE it before output.

4. BEFORE returning JSON, re-scan all suggestions:
   - If any suggestion is portion-only → fix to include reduced frequency and/or alternation.
   - If any suggestion lacks explicit reduction/alternation context → fix it.
Do NOT mention this validation process in the output.
`;
    }

    if (ethicalLens === 3) {
      systemMessage += `
LENS 3 (NO SLAUGHTER) HARD RULE:
All suggestions MUST be vegetarian. NEVER suggest fish, seafood, meat, or poultry,
even if certified or "sustainable". This is absolute.`;
    }

    if (ethicalLens === 4) {
      systemMessage += `
LENS 4 (NO ANIMAL USE) HARD RULE:
All suggestions MUST be 100% free from animal-derived products. Only plant-based or cultured options.`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const requestBody: any = {
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      };

      if (tools) {
        requestBody.tools = tools;
        requestBody.tool_choice = {
          type: "function",
          function: { name: "provide_vegetarian_alternative" },
        };
      }

      console.log(`🤖 Calling ${model} for Lens ${ethicalLens}${tools ? " with structured output" : ""}`);

      const lovableResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error("❌ Lovable AI error:", lovableResponse.status, errorText);

        if (ethicalLens === 2 || ethicalLens === 3 || ethicalLens === 4) {
          console.log("⚠️ AI error, using intelligent fallback");
          return intelligentFallback(ethicalLens, productName, language);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: `Lovable AI error: ${lovableResponse.status}`,
            },
          }),
          {
            status: lovableResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const lovableData = await lovableResponse.json();
      console.log("[suggest-ethical-swap] Raw AI response:", JSON.stringify(lovableData));

      let parsedResponse: any;

      if (tools && lovableData.choices?.[0]?.message?.tool_calls) {
        const toolCall = lovableData.choices[0].message.tool_calls[0];
        console.log("[suggest-ethical-swap] Tool call response:", JSON.stringify(toolCall));

        try {
          parsedResponse = JSON.parse(toolCall.function.arguments);
          console.log("✅ Structured output parsed successfully");
        } catch (err) {
          console.error("[suggest-ethical-swap] Tool call parse error:", err);
          return intelligentFallback(ethicalLens, productName, language);
        }
      } else {
        const text = lovableData.choices?.[0]?.message?.content?.trim();
        if (!text) {
          console.error("❌ AI returned empty response");
          return intelligentFallback(ethicalLens, productName, language);
        }

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          console.error("❌ No JSON found in AI response:", text.slice(0, 200));
          return intelligentFallback(ethicalLens, productName, language);
        }

        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (err) {
          console.error("❌ JSON parse error:", err);
          return intelligentFallback(ethicalLens, productName, language);
        }
      }

      console.log("✅ AI response parsed", {
        ethicalLensPosition: parsedResponse.ethicalLensPosition,
        requestedLens: ethicalLens,
        suggestionsCount: parsedResponse?.suggestions?.length ?? 0,
      });

      console.log("📝 Generated suggestions:", JSON.stringify(parsedResponse.suggestions, null, 2));
      console.log("📝 General note:", parsedResponse.generalNote);

      const boundary = validateLensBoundaries(parsedResponse, ethicalLens);

      if (boundary.violations.length) {
        console.error("❌ Lens boundary violations detected:", boundary.violations);
        console.log("⚠️ Using intelligent fallback due to validation failure");
        return intelligentFallback(ethicalLens, productName, language);
      }

      if (boundary.warnings.length) {
        console.warn("⚠️ Lens boundary warnings:", boundary.warnings);
      }

      const responseText = JSON.stringify(parsedResponse);
      const data = {
        candidates: [{ content: { parts: [{ text: responseText }] } }],
      };

      console.log("🎉 Ethical swap suggestions generated successfully");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error calling Lovable AI:", error);

      if (ethicalLens === 2 || ethicalLens === 3 || ethicalLens === 4) {
        console.log("⚠️ Error occurred, using intelligent fallback");
        return intelligentFallback(ethicalLens, productName, language);
      }

      throw error;
    }
  } catch (error) {
    console.error("Error in suggest-ethical-swap function:", error);
    
    // Return safe, user-friendly error message
    const errorStr = error instanceof Error ? error.message : String(error);
    let safeMessage = 'Unable to generate ethical alternatives. Please try again.';
    
    if (errorStr.includes('auth') || errorStr.includes('JWT')) {
      safeMessage = 'Authentication failed. Please sign in again.';
    } else if (errorStr.includes('rate limit')) {
      safeMessage = 'Too many requests. Please try again later.';
    } else if (errorStr.includes('API') || errorStr.includes('AI')) {
      safeMessage = 'AI service temporarily unavailable. Please try again later.';
    }

    return new Response(JSON.stringify({ success: false, error: { message: safeMessage } }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Edge function updated
