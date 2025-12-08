/**
 * Ethical Lens Messaging System
 * Provides practical guidance for each ethical lens level
 * Based on the Welfare Footprint Institute's ethical framework
 */

interface MessageContext {
  product?: string;
  animal?: string;
  alternativeType?: string;
}

interface EthicalLensGuidance {
  focus: string;
  examples: string[];
  tone: string;
  uiHint: string;
  /** What this lens explicitly permits */
  permits: string;
  /** Optional guidance for users who want stricter standards */
  furtherGuidance?: string;
}

const ETHICAL_LENS_GUIDANCE: Record<number, EthicalLensGuidance> = {
  1: { // Welfarist (Higher-Welfare Omnivore)
    focus: "Choose the same product, but from higher-welfare sources.",
    examples: [
      "Look for labels such as Certified Humane, RSPCA Assured, Global Animal Partnership, or pasture-raised certifications.",
      "Prefer suppliers that provide outdoor access, enrichments, and avoid painful procedures like debeaking or tail docking.",
      "For meat or eggs, prioritize smaller-scale or transparent farms with clear welfare documentation."
    ],
    tone: "Practical and compassionate — encourages improvement without moral judgment.",
    uiHint: "Display welfare labels or trusted certification logos near this section.",
    permits: "This lens allows all animal products (meat, fish, dairy, eggs, honey) as long as they come from higher-welfare, certified sources.",
    furtherGuidance: "For even greater welfare improvements, consider reducing consumption frequency or choosing pasture-raised and slow-growing breeds."
  },
  2: { // Reducetarian (Lower Consumption)
    focus: "Reduce frequency (e.g., fewer meals per week) while choosing higher-welfare sources for remaining use. Partial plant-based substitution allowed when reduction context is explicit.",
    examples: [
      "Focus on reducing high-suffering or high-volume products (e.g., industrial chicken, pork, farmed fish) first.",
      "Choose certified humane or pasture-raised sources for animal products you continue consuming.",
      "Consider partial plant-based substitution (25-50% of meals) alongside high-welfare sourcing.",
      "Lowering frequency means fewer animals bred into intensive systems."
    ],
    tone: "Practical and progress-oriented — emphasizes both reduction and welfare improvement.",
    uiHint: "Highlight reduction strategies, welfare certifications, and partial substitution options.",
    permits: "This lens allows all animal products, but prioritizes eating them less often while choosing higher-welfare sources when you do.",
    furtherGuidance: "To further reduce animal suffering, aim for meatless days several times per week, or explore fully plant-based meals for greater impact."
  },
  3: { // No Slaughter (Vegetarian)
    focus: "Avoid products that require animal slaughter. Dairy, eggs, and honey are acceptable.",
    examples: [
      "Choose plant-based proteins like tofu, tempeh, seitan, legumes, or mushrooms as primary protein sources.",
      "Dairy, eggs, and honey are acceptable — preferably from humane-certified or pasture-raised sources.",
      "Avoid all meat, poultry, fish, and seafood, as these require slaughter."
    ],
    tone: "Encouraging and inclusive — celebrates the choice to avoid slaughter while remaining practical.",
    uiHint: "Highlight vegetarian alternatives and certified humane dairy/egg options.",
    permits: "This lens allows dairy, eggs, and honey, as long as no slaughter is involved. Meat, fish, and seafood are excluded.",
    furtherGuidance: "For even greater welfare improvements, choose humane-certified, organic, or pasture-raised dairy and eggs — or explore fully plant-based alternatives when convenient."
  },
  4: { // No Animal Use (Vegan)
    focus: "This option is for people who want to avoid using animals altogether in their food choices. It focuses on meals and products that do not contain meat, fish, eggs, dairy, honey, gelatin, or any other animal-derived ingredients.",
    examples: [
      "Replace all animal-derived ingredients with plant- or fungi-based options (and, where available, cultivated products).",
      "Prioritize foods with no animal ingredients, including hidden ones such as gelatin, whey, casein, fish sauce, or animal-based stocks.",
      "Use this lens to explore recipes and products that are fully compatible with a vegan pattern of consumption, while still aiming for practicality, taste, and good nutrition."
    ],
    tone: "Inspiring and future-focused — celebrates innovation and compassion.",
    uiHint: "Show plant-based brands or product swaps directly beneath the explanation.",
    permits: "This lens excludes all animal-derived products: no meat, fish, dairy, eggs, honey, gelatin, or any animal by-products.",
    furtherGuidance: "You're already at the highest level of animal-product avoidance. To go further, consider supporting animal sanctuaries or advocating for plant-based options in your community."
  },
  5: { // Legacy - Vegan (No Animal Use)
    focus: "Avoid all animal-derived products in food, clothing, and daily life.",
    examples: [
      "No funding of breeding, confinement, or animal use — the most consistent stance.",
      "Choose plant-based milks, yogurts, cheeses, and meats made from soy, oats, or nuts.",
      "Verify vegan certifications (e.g., Vegan Society, Certified Plant-Based) to ensure no hidden animal derivatives."
    ],
    tone: "Inspiring and future-focused — celebrates innovation and compassion.",
    uiHint: "Show plant-based brands or product swaps directly beneath the explanation.",
    permits: "This lens excludes all animal-derived products.",
    furtherGuidance: "Consider extending your ethical choices to non-food products like clothing and cosmetics."
  }
};

/**
 * Gets the focus message for a specific ethical lens level
 * @param level - Ethical lens level (1-4)
 * @returns Focus message for the lens
 */
export function getEthicalLensFocus(level: number): string {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.focus || "Choose products aligned with your values.";
}

/**
 * Gets the examples for a specific ethical lens level
 * @param level - Ethical lens level (1-4)
 * @returns Array of example guidelines
 */
export function getEthicalLensExamples(level: number): string[] {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.examples || [];
}

/**
 * Gets what a specific ethical lens permits
 * @param level - Ethical lens level (1-4)
 * @returns Description of what the lens permits
 */
export function getEthicalLensPermits(level: number): string {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.permits || "";
}

/**
 * Gets optional further guidance for users who want stricter standards
 * @param level - Ethical lens level (1-4)
 * @returns Optional further guidance string
 */
export function getEthicalLensFurtherGuidance(level: number): string | undefined {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.furtherGuidance;
}

/**
 * Gets complete guidance for a specific ethical lens level
 * @param level - Ethical lens level (1-4)
 * @returns Complete guidance object
 */
export function getEthicalLensGuidance(level: number): EthicalLensGuidance | null {
  return ETHICAL_LENS_GUIDANCE[level] || null;
}

/**
 * Returns a human-readable name for the ethical lens level
 * @param level - Ethical lens level (1-4)
 * @returns Descriptive name for the lens
 */
export function getEthicalLensName(level: number): string {
  const names: Record<number, string> = {
    1: "Higher-Welfare Omnivore",
    2: "Lower Consumption",
    3: "No Slaughter",
    4: "No Animal Use"
  };
  return names[level] || "Unknown";
}

/**
 * DEPRECATED: Use getEthicalLensFocus() and getEthicalLensExamples() instead.
 * This function is kept for backward compatibility but now returns practical guidance.
 * 
 * Generates varied ethical lens messages
 * @param level - Ethical lens level (1-5)
 * @param context - Optional context for variable replacement
 * @param variant - Variation number (ignored in new implementation)
 * @returns Practical guidance message
 */
export function generateVariedEthicalLensMessage(
  level: number,
  context: MessageContext = {},
  variant: number = 0
): string {
  // Return focus message for backward compatibility
  return getEthicalLensFocus(level);
}
