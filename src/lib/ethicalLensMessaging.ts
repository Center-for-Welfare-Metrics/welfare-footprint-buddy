/**
 * Ethical Lens Messaging System
 * Generates contextual, empathetic messages for each ethical lens level
 * Based on the Welfare Footprint Institute's ethical framework
 */

interface MessageContext {
  product?: string;
  animal?: string;
  alternativeType?: string;
}

interface EthicalLensMessage {
  template: string;
  notes: string;
}

const ETHICAL_LENS_SCHEMA: Record<number, EthicalLensMessage> = {
  1: {
    template: "You've chosen to care about how life is lived — not just how food tastes. By selecting {{product}} from farms with stronger welfare practices, you're helping animals experience less pain, more space, and moments of calm before the end. Each step toward higher welfare matters.",
    notes: "Focus on conscious improvement within meat consumption. Avoid judgment. Highlight empathy, welfare awareness, and incremental change."
  },
  2: {
    template: "This choice supports producers raising animals with dignity — not as units of production but as sentient beings whose comfort and freedom matter. Animals raised under certified high-welfare systems suffer less from confinement, stress, and painful handling. You're rewarding better practices — and that creates change.",
    notes: "Highlight certification, transparency, and measurable welfare gains. Maintain scientific grounding: e.g., reduced stocking density, enriched environments, better stunning methods."
  },
  3: {
    template: "You've taken a balanced step — enjoying the flavor of {{product}} while reducing its animal content. Blended or hybrid options significantly cut animal suffering and environmental impact while keeping culinary pleasure alive. Compassion grows through progress, not perfection.",
    notes: "Emphasize reduction, incremental ethics, and data-driven impact (e.g., fewer animals raised or slaughtered). Keep it positive and forward-looking."
  },
  4: {
    template: "You've chosen a version of {{product}} that nourishes without taking life. While trace animal ingredients may remain, this choice already spares most of the suffering tied to conventional meat. It's an act of empathy — proof that enjoyment and conscience can share the same plate.",
    notes: "Acknowledge small residual animal use but celebrate ethical intent. Encourage curiosity about ingredient sourcing and culinary creativity."
  },
  5: {
    template: "You've chosen a path of kindness — honoring life while celebrating flavor. Where {{product}} once symbolized suffering, this plant-based alternative brings nourishment without harm. Each meal becomes a quiet act of compassion — proof that pleasure, health, and empathy can coexist beautifully.",
    notes: "Highlight complete elimination of animal harm. Use emotionally warm yet scientifically grounded language (e.g., avoids slaughter, confinement stress, transport pain)."
  }
};

/**
 * Generates a contextual ethical lens message
 * @param level - Ethical lens level (1-5)
 * @param context - Optional context for dynamic variable replacement
 * @returns Generated message with variable substitution
 */
export function generateEthicalLensMessage(
  level: number,
  context: MessageContext = {}
): string {
  const schema = ETHICAL_LENS_SCHEMA[level];
  if (!schema) {
    return "Your choice reflects your values and creates meaningful impact.";
  }

  let message = schema.template;

  // Replace variables with contextual data or defaults
  const product = context.product || "this product";
  const animal = context.animal || "animals";
  const alternativeType = context.alternativeType || "alternative";

  message = message.replace(/\{\{product\}\}/g, product);
  message = message.replace(/\{\{animal\}\}/g, animal);
  message = message.replace(/\{\{alternative_type\}\}/g, alternativeType);

  return message;
}

/**
 * Get the ethical lens level name
 */
export function getEthicalLensName(level: number): string {
  const names: Record<number, string> = {
    1: "Concerned Omnivore",
    2: "Strong Welfare Standards",
    3: "Reducitarian",
    4: "Vegetarian",
    5: "Vegan"
  };
  return names[level] || "Unknown";
}

/**
 * Generate variations of the message to avoid repetition
 * Uses creative reframing while maintaining the ethical framework
 */
export function generateVariedEthicalLensMessage(
  level: number,
  context: MessageContext = {},
  variant: number = 0
): string {
  const variations: Record<number, string[]> = {
    1: [
      "You've chosen to care about how life is lived — not just how food tastes. By selecting {{product}} from farms with stronger welfare practices, you're helping animals experience less pain, more space, and moments of calm before the end. Each step toward higher welfare matters.",
      "Your choice to seek better-raised {{product}} honors the life behind the meal. Animals raised with care experience fewer moments of distress, more natural behaviors, and a gentler path. Consciousness matters — and so does this step.",
      "Behind every meal lies a life. By choosing {{product}} from higher-welfare sources, you're reducing suffering for animals who still feel fear, pain, and comfort. Progress begins with awareness — and continues with choices like this."
    ],
    2: [
      "This choice supports producers raising animals with dignity — not as units of production but as sentient beings whose comfort and freedom matter. Animals raised under certified high-welfare systems suffer less from confinement, stress, and painful handling. You're rewarding better practices — and that creates change.",
      "You're choosing {{product}} raised under verified standards where animals have space to move, freedom from chronic pain, and reduced fear. Certified welfare systems aren't perfect — but they measurably reduce suffering. Your choice supports accountability.",
      "This isn't just {{product}} — it's a system where welfare is measured, monitored, and improved. Animals under strong welfare standards experience less confinement stress, better health, and more humane treatment. You're voting for transparency with your choice."
    ],
    3: [
      "You've taken a balanced step — enjoying the flavor of {{product}} while reducing its animal content. Blended or hybrid options significantly cut animal suffering and environmental impact while keeping culinary pleasure alive. Compassion grows through progress, not perfection.",
      "This hybrid approach lets you enjoy {{product}} while reducing the number of animals raised and slaughtered. Every percentage of plant-based content translates to fewer lives confined, fewer journeys to slaughter. Impact scales with every meal.",
      "You've chosen moderation over extremes. By blending plant and animal ingredients in {{product}}, you're reducing welfare harm without sacrificing satisfaction. Small shifts create big impact when practiced consistently."
    ],
    4: [
      "You've chosen a version of {{product}} that nourishes without taking life. While trace animal ingredients may remain, this choice already spares most of the suffering tied to conventional meat. It's an act of empathy — proof that enjoyment and conscience can share the same plate.",
      "Your selection of {{product}} reflects deep ethical care — nourishment without slaughter. Though small amounts of animal ingredients may linger, this path avoids the immense suffering of factory farming and industrial killing. Compassion in practice.",
      "This {{product}} offers sustenance without ending lives. Any residual animal content is minimal — the core suffering of breeding, confinement, and slaughter is absent. Your choice shows that ethics and enjoyment aren't opposites."
    ],
    5: [
      "You've chosen a path of kindness — honoring life while celebrating flavor. Where {{product}} once symbolized suffering, this plant-based alternative brings nourishment without harm. Each meal becomes a quiet act of compassion — proof that pleasure, health, and empathy can coexist beautifully.",
      "This fully plant-based {{product}} carries zero animal suffering — no confinement, no transport fear, no slaughter. It's a celebration of possibility: that food can be delicious, nourishing, and entirely free from harm. Your plate reflects your values.",
      "You've chosen {{product}} that honors sentient life completely. No animals were bred, confined, or killed for this meal. It's a small act with profound meaning — proof that we can nourish ourselves while extending compassion to all beings."
    ]
  };

  const levelVariations = variations[level] || [ETHICAL_LENS_SCHEMA[level]?.template || ""];
  const selectedVariation = levelVariations[variant % levelVariations.length];

  let message = selectedVariation;

  // Replace variables
  const product = context.product || "this product";
  const animal = context.animal || "animals";
  const alternativeType = context.alternativeType || "alternative";

  message = message.replace(/\{\{product\}\}/g, product);
  message = message.replace(/\{\{animal\}\}/g, animal);
  message = message.replace(/\{\{alternative_type\}\}/g, alternativeType);

  return message;
}
