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
}

const ETHICAL_LENS_GUIDANCE: Record<number, EthicalLensGuidance> = {
  1: { // Concerned Omnivore
    focus: "Choose the same product, but from higher-welfare sources.",
    examples: [
      "Look for labels such as Certified Humane, RSPCA Assured, Global Animal Partnership, or pasture-raised certifications.",
      "Prefer suppliers that provide outdoor access, enrichments, and avoid painful procedures like debeaking or tail docking.",
      "For meat or eggs, prioritize smaller-scale or transparent farms with clear welfare documentation."
    ],
    tone: "Practical and compassionate — encourages improvement without moral judgment.",
    uiHint: "Display welfare labels or trusted certification logos near this section."
  },
  2: { // Strong Welfare Standards
    focus: "Support producers with transparent and science-based welfare programs.",
    examples: [
      "Seek producers who perform independent audits and publish measurable welfare outcomes (e.g., mortality, space allowance).",
      "Choose suppliers that improve slaughter methods, reduce transport stress, and follow recognized welfare standards.",
      "When buying processed foods, prefer brands sourcing from certified high-welfare systems."
    ],
    tone: "Confident and informative — emphasizes measurable welfare progress.",
    uiHint: "Highlight animal welfare metrics and certification summaries."
  },
  3: { // Reducitarian
    focus: "Reduce total animal use while maintaining food enjoyment.",
    examples: [
      "Look for hybrid or blended products that combine animal and plant ingredients (e.g., 50% dairy and 50% oat-based cheese).",
      "Choose smaller portion sizes of animal-based products and complement with plant proteins like legumes, tofu, or nuts.",
      "Try meat or dairy alternatives a few times a week to gradually reduce demand for animal products."
    ],
    tone: "Encouraging and progress-oriented — emphasizes balanced steps rather than elimination.",
    uiHint: "Include sliders or visual indicators showing reduced animal content."
  },
  4: { // Vegetarian - Minimal Animal Use
    focus: "Avoid meat and fish while maintaining foods with minimal animal byproducts (e.g., dairy or eggs).",
    examples: [
      "Replace meat with eggs, cheese, or plant-based protein sources.",
      "When using dairy, prefer organic or pasture-based milk and cheese certified for higher welfare.",
      "Explore vegetarian versions of common meals (e.g., veggie burgers, lentil stews, vegetable lasagna)."
    ],
    tone: "Empathetic and educational — recognizes continuity while promoting reduced harm.",
    uiHint: "Suggest vegetarian alternatives of the detected product."
  },
  5: { // Vegan
    focus: "Eliminate all animal ingredients by selecting plant-based or cultured alternatives.",
    examples: [
      "Choose plant-based milks, yogurts, cheeses, and meats made from soy, oats, or nuts.",
      "Verify vegan certifications (e.g., Vegan Society, Certified Plant-Based) to ensure no hidden animal derivatives.",
      "Explore cultured or fermentation-based foods that avoid animal farming entirely."
    ],
    tone: "Inspiring and future-focused — celebrates innovation and compassion.",
    uiHint: "Show plant-based brands or product swaps directly beneath the explanation."
  }
};

/**
 * Gets the focus message for a specific ethical lens level
 * @param level - Ethical lens level (1-5)
 * @returns Focus message for the lens
 */
export function getEthicalLensFocus(level: number): string {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.focus || "Choose products aligned with your values.";
}

/**
 * Gets the examples for a specific ethical lens level
 * @param level - Ethical lens level (1-5)
 * @returns Array of example guidelines
 */
export function getEthicalLensExamples(level: number): string[] {
  const guidance = ETHICAL_LENS_GUIDANCE[level];
  return guidance?.examples || [];
}

/**
 * Gets complete guidance for a specific ethical lens level
 * @param level - Ethical lens level (1-5)
 * @returns Complete guidance object
 */
export function getEthicalLensGuidance(level: number): EthicalLensGuidance | null {
  return ETHICAL_LENS_GUIDANCE[level] || null;
}

/**
 * Returns a human-readable name for the ethical lens level
 * @param level - Ethical lens level (1-5)
 * @returns Descriptive name for the lens
 */
export function getEthicalLensName(level: number): string {
  const names: Record<number, string> = {
    1: "Concerned Omnivore",
    2: "Strong Welfare Standards",
    3: "Reducitarian",
    4: "Vegetarian – Minimal Animal Use",
    5: "Vegan – No Animal Use"
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
