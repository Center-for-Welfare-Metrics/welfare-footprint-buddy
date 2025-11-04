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
  1: { // Welfarist (Higher-Welfare Omnivore)
    focus: "Choose the same product, but from higher-welfare sources.",
    examples: [
      "Look for labels such as Certified Humane, RSPCA Assured, Global Animal Partnership, or pasture-raised certifications.",
      "Prefer suppliers that provide outdoor access, enrichments, and avoid painful procedures like debeaking or tail docking.",
      "For meat or eggs, prioritize smaller-scale or transparent farms with clear welfare documentation."
    ],
    tone: "Practical and compassionate — encourages improvement without moral judgment.",
    uiHint: "Display welfare labels or trusted certification logos near this section."
  },
  2: { // Reducetarian (Lower Consumption)
    focus: "Actively reduce animal product consumption — e.g., halve meat intake or skip it several days a week.",
    examples: [
      "Focus first on high-suffering or high-volume products (e.g., industrial chicken, pork, or farmed fish).",
      "Reduce frequency and quantity rather than blending animal and non-animal products.",
      "Lowering demand means fewer animals bred into suffering conditions."
    ],
    tone: "Confident and informative — emphasizes measurable welfare progress.",
    uiHint: "Highlight reduction strategies and impact metrics."
  },
  3: { // Flexitarian (Mostly Plant-Based)
    focus: "Adopt a primarily plant-based diet while allowing occasional humane-source animal products.",
    examples: [
      "Make plant foods the default; include limited dairy, eggs, or fish from certified sources.",
      "Recognize that even 'humane' systems involve harm (e.g., calf separation, slaughter).",
      "Emphasize practicality and continuous harm reduction rather than strict elimination."
    ],
    tone: "Encouraging and progress-oriented — emphasizes balanced steps rather than elimination.",
    uiHint: "Include sliders or visual indicators showing reduced animal content."
  },
  4: { // Vegetarian (No Slaughter)
    focus: "Eliminate all meat, fish, and slaughter byproducts while continuing non-lethal animal products.",
    examples: [
      "Continue consuming dairy and eggs — ideally from higher-welfare farms.",
      "Remove the most direct source of suffering (killing) while supporting gentler systems.",
      "Explore vegetarian versions of common meals (e.g., veggie burgers, lentil stews, vegetable lasagna)."
    ],
    tone: "Empathetic and educational — recognizes continuity while promoting reduced harm.",
    uiHint: "Suggest vegetarian alternatives of the detected product."
  },
  5: { // Vegan (No Animal Use)
    focus: "Avoid all animal-derived products in food, clothing, and daily life.",
    examples: [
      "No funding of breeding, confinement, or animal use — the most consistent stance.",
      "Choose plant-based milks, yogurts, cheeses, and meats made from soy, oats, or nuts.",
      "Verify vegan certifications (e.g., Vegan Society, Certified Plant-Based) to ensure no hidden animal derivatives."
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
