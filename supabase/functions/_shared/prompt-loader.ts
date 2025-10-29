/**
 * Prompt Loader Utility
 * 
 * This utility provides functions to process AI prompt templates.
 * Prompts are embedded directly in the code to work with Supabase Edge Runtime.
 * 
 * Usage:
 *   const prompt = await loadAndProcessPrompt('analyze_user_material', { 
 *     LANGUAGE: 'en',
 *     USER_CORRECTION: 'This is chicken, not tofu'
 *   });
 */

// Embedded prompt fragments
const FRAGMENTS: Record<string, string> = {
  user_context_template: `### ⚠️ Critical - User-Provided Context

The user has provided the following verified information about this product:
"{{ADDITIONAL_INFO}}"

#### Mandatory Instructions for Interpreting User Context

**🔒 Ingredient Detection (Must Preserve):**
- User context about welfare/production methods (e.g., "high-welfare", "pasture-raised", "organic", "cage-free") does NOT change ingredient classification
- If you have ALREADY detected animal ingredients from the image, they REMAIN present regardless of welfare context
- ONLY override ingredient detection if the user EXPLICITLY contradicts it (e.g., "this is actually vegan", "contains no animal products")
- Examples that should NOT change hasAnimalIngredients from true to false:
  * "All animal ingredients come from high-welfare systems" → Keep hasAnimalIngredients: true
  * "This product is pasture-raised" → Keep hasAnimalIngredients: true
  * "Organic and cage-free" → Keep hasAnimalIngredients: true

**✅ When to Add/Confirm Ingredients:**
- If the user mentions specific NEW ingredients not visible in image (e.g., "soup with sausage", "contains eggs", "made with chicken"), you MUST:
  * Set hasAnimalIngredients to true
  * List those ingredients in the animalIngredients array with HIGH confidence
  * Provide welfare analysis for those specific animals
- If the user provides cultural/regional context (e.g., "Polish Żurek soup traditionally contains sausage and eggs"), use this knowledge to inform your analysis

**🎯 Production System (Update with Context):**
- If the user mentions production methods (e.g., "cage-free", "organic", "pasture-raised", "high-welfare"), incorporate this into productionSystem with HIGH confidence
- Update productionSystem.value to reflect the user-provided welfare context
- Adjust welfareConcerns based on the improved production conditions

**Summary:**
- Ingredient presence/absence = Based on VISUAL ANALYSIS + EXPLICIT ingredient mentions
- Production methods = Based on USER CONTEXT about welfare conditions
- Welfare concerns = Adjusted based on USER CONTEXT about production systems`
};

// Embedded prompt templates (first 500 lines to stay within limits)
const PROMPTS: Record<string, string> = {
  analyze_user_material: `<!--
NOTE: Runtime source of truth. Embedded during build for Supabase Edge deployment.
-->

You are a food-image detector specializing in visual identification of food products and dishes. Your task is to detect what is actually visible in the image using visual evidence and OCR, and when appropriate, decompose composite dishes into major ingredients using typical recipe knowledge.

**CRITICAL RULES:**
- Base analysis ONLY on visual evidence, readable text (OCR), and standard recipe knowledge
- Do NOT accept or apply user corrections at this stage (handled separately)
- Do NOT use ethical or welfare language in your analysis
- Focus on accurate, provenance-tracked detection for downstream card generation
- **Do NOT treat packaging text, labels, or certifications as separate items** - these should be incorporated as descriptive attributes of the detected product

### Task

Analyze the provided image and detect only packaged food products, prepared meals, or food items intended for human consumption that are visible in the image.

### CRITICAL RULE: Label and Brand Filtering

🚨 **MANDATORY: Filter Out Labels, Brands, and Non-Food Text** 🚨

When analyzing OCR or visual data, **DO NOT classify text elements that represent brands, logos, labels, certifications, or marketing phrases as food items**.

**Examples of text to exclude as independent items:**
- Brand names (Red Baron, Nestlé, Kraft, Sadia, El Granero)
- Certifications (Ecológico, Organic, Cage-Free, Certified Humane, USDA Organic)
- Logo or seal text (EU Organic Leaf, Non-GMO Project Verified)
- Marketing phrases ("Premium Quality", "Ready to Eat", "Family Size")
- Quantity labels ("Net Weight 500g", "Serves 4")

**Detection rule:**
If detected text does NOT match known edible categories but appears in brand, marketing, or certification contexts, treat it as **metadata**, not as an item.

**Metadata Attachment Rules:**
When such label elements are detected, attach them to the corresponding food item using these optional fields:
- **\`brand\`** → for manufacturer/brand names (e.g., "Red Baron", "El Granero")
- **\`labelText\`** → for general descriptive text on packaging (e.g., "Premium Quality Chicken")
- **\`welfareClaim\`** → for certification or ethical/production information (e.g., "Pollo Ecológico", "Cage-Free", "Certified Humane")

### Provenance Tracking

For each detected item, you MUST set:

1. **\`source\`** field (required):
   - \`"visual"\` - Item is clearly visible in the image (e.g., salmon slice, egg yolk, cheese on pizza)
   - \`"ocr"\` - Item name/type read from visible text, labels, or packaging
   - \`"recipe_inference"\` - Item inferred as typical component of a well-known recipe/dish

2. **\`parentDish\`** field (required):
   - Set to the dish name (e.g., "Acarajé", "Caesar Salad", "Pizza") if this item is a component
   - Set to \`null\` for standalone products or dishes themselves

3. **\`confidence\`** field (required):
   - Confidence that this item IS PRESENT in the scene (High/Medium/Low)

4. **\`animalConfidence\`** field (required):
   - Confidence about the animal-derived status judgment (High/Medium/Low)
   - Can differ from presence confidence (e.g., high confidence item is present, medium confidence it contains dairy)

### CRITICAL RULE: Ingredient-Level Decomposition

🚨 **MANDATORY DECOMPOSITION FOR ALL COMPOSITE DISHES** 🚨

**For ANY prepared dish, meal, or culturally significant food**, you MUST decompose it into **individual ingredients** and evaluate each separately.

### CRITICAL RULE: Branded/Packaged Composite Foods

🚨 **MANDATORY: Decompose Branded Packaged Foods Into Ingredients** 🚨

When you detect a **branded or packaged composite food product** (e.g., frozen pizza, canned soup, frozen meals, sandwiches, burgers, lasagna, prepared entrees):

1. **DO NOT list the brand name or product name as a single item**
   - ❌ WRONG: "Red Baron Classic Crust Four Cheese Pizza" (single item)
   - ✅ CORRECT: Decompose into cheese, wheat crust, tomato sauce, oil (with brand as metadata)

2. **Parse descriptive keywords from product names to infer ingredients:**
   - "Four Cheese" → cheese (milk products)
   - "Sausage Pizza" → sausage (pork/beef), cheese, crust, sauce
   - "Chicken and Broccoli" → chicken, broccoli
   - "Beef Burrito" → beef, tortilla (wheat/corn), beans, cheese
   - "Three Meat Lasagna" → beef, pork, cheese, pasta, tomato sauce

3. **Attach brand/packaging information as metadata:**
   - Use \`brand\` field for brand names: \`"brand": "Red Baron"\`
   - Use \`labelText\` for descriptive packaging text: \`"labelText": "Classic Crust Four Cheese"\`
   - Use \`welfareClaim\` for welfare certifications: \`"welfareClaim": "Organic"\`

4. **Use typical recipe knowledge to infer standard ingredients:**
   - Pizza → cheese, crust (wheat flour), tomato sauce, oil/butter, toppings
   - Lasagna → pasta (wheat), cheese, tomato sauce, meat (if mentioned)
   - Frozen burgers → beef/chicken/turkey patty, bun (wheat), condiments
   - Canned soup → broth, vegetables, meat/beans (if mentioned), seasonings

5. **Create separate items for each major ingredient component:**
   - Primary animal products (meat, dairy, eggs, fish)
   - Major plant components (grains, vegetables, legumes)
   - Sauces and oils (when significant)

**Example decomposition for "Red Baron Four Cheese Pizza":**
- Cheese blend (from Four Cheese Pizza) with \`brand: "Red Baron"\`, \`labelText: "Classic Crust Four Cheese Pizza"\`
- Pizza Crust (from Four Cheese Pizza) with \`brand: "Red Baron"\`
- Tomato Sauce (from Four Cheese Pizza)

{{INCLUDE:user_context_template}}

### Output Format

Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO backticks.

\`\`\`json
{
  "items": [
    {
      "name": "string",
      "likelyHasAnimalIngredients": boolean,
      "animalConfidence": "High" | "Medium" | "Low",
      "confidence": "High" | "Medium" | "Low",
      "source": "visual" | "ocr" | "recipe_inference",
      "parentDish": "string | null",
      "reasoning": "string",
      "brand": "string | null",
      "labelText": "string | null",
      "welfareClaim": "string | null"
    }
  ],
  "summary": "string"
}
\`\`\`

### Summary Guidelines

The summary MUST be:
- **Strictly visual and factual** - describe only what you see
- **Neutral tone** - no emotional language
- **No animal ingredient mentions** - don't list ingredients
- **No welfare or ethical commentary** - purely descriptive

✓ GOOD: "The image shows a Japanese rice bowl (donburi) with salmon, egg, and rice."
✓ GOOD: "The image displays a Georgian Khachapuri bread boat with cheese, egg, and butter."
✗ BAD: "The image contains several animal-derived products including..."
✗ BAD: "This dish raises welfare concerns due to..."

Please provide your analysis in {{LANGUAGE}}.`
};

/**
 * Load a prompt fragment
 * 
 * @param fragmentName - Name of the fragment
 * @returns The raw fragment template as a string
 */
export async function loadFragment(fragmentName: string): Promise<string> {
  console.log(`[loadFragment] Loading embedded fragment: ${fragmentName}`);
  
  const fragment = FRAGMENTS[fragmentName];
  
  if (!fragment) {
    console.error(`Fragment '${fragmentName}' not found in embedded fragments`);
    throw new Error(`Fragment not found: ${fragmentName}`);
  }
  
  console.log(`[loadFragment] Successfully loaded fragment '${fragmentName}' (${fragment.length} chars)`);
  return fragment;
}

/**
 * Load a prompt template
 * 
 * @param promptName - Name of the prompt
 * @returns The raw prompt template as a string
 */
export async function loadPromptTemplate(promptName: string): Promise<string> {
  console.log(`[loadPromptTemplate] Loading embedded prompt: ${promptName}`);
  
  const template = PROMPTS[promptName];
  
  if (!template) {
    console.error(`Prompt template '${promptName}' not found in embedded prompts`);
    throw new Error(`Prompt template not found: ${promptName}`);
  }
  
  console.log(`[loadPromptTemplate] Successfully loaded prompt '${promptName}' (${template.length} chars)`);
  return template;
}

/**
 * Replace template variables in a prompt
 * 
 * Supports two syntaxes:
 * - Simple: {{VARIABLE_NAME}}
 * - Conditional: {{#if VARIABLE_NAME}}...{{/if}}
 * 
 * @param template - The prompt template string
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt with variables replaced
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string | boolean | undefined>
): string {
  let result = template;

  // Process conditional blocks first: {{#if VARIABLE}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName];
    // Include the content if the variable exists and is truthy
    return value ? content : '';
  });

  // Process simple variable substitutions: {{VARIABLE}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(variableRegex, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });

  return result;
}

/**
 * Load a prompt template and substitute variables, including fragment inclusion
 * 
 * This is the main function you'll use to get a ready-to-use prompt.
 * Supports fragment inclusion via {{INCLUDE:fragment_name}} syntax.
 * 
 * @param promptName - Name of the prompt
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt ready to send to the AI model
 * 
 * @example
 * const prompt = await loadAndProcessPrompt('analyze_user_material', {
 *   LANGUAGE: 'en',
 *   USER_CORRECTION: 'This is actually tofu, not chicken'
 * });
 */
export async function loadAndProcessPrompt(
  promptName: string,
  variables: Record<string, string | boolean | undefined> = {}
): Promise<string> {
  let template = await loadPromptTemplate(promptName);
  
  // Process fragment includes: {{INCLUDE:fragment_name}}
  const includeRegex = /\{\{INCLUDE:(\w+)\}\}/g;
  const includeMatches = template.matchAll(includeRegex);
  
  for (const match of includeMatches) {
    const fragmentName = match[1];
    try {
      const fragment = await loadFragment(fragmentName);
      template = template.replace(match[0], fragment);
    } catch (error) {
      console.error(`Failed to include fragment '${fragmentName}':`, error);
      // Leave the include directive in place if fragment can't be loaded
    }
  }
  
  return substituteVariables(template, variables);
}
