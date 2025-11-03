<!-- SOURCE-OF-TRUTH: Canonical runtime prompt -->
<!-- Prompt-ID: suggest_ethical_swap -->
<!-- Version: v3.2 (Four lenses; corrected Lens 2 logic; contextual-ingredient rules) -->
<!-- Last-Updated: 2025-11-03 -->
<!-- Maintainer: Welfare Footprint Buddy / Lovable Sync -->

# Ethical Product Swap Suggestions Prompt

## Metadata

**Purpose:** Generate ethical product swap suggestions based on the user’s welfare priorities, staying strictly within animal-welfare scope (no environment/climate).

**Inputs (templated):**
- **PRODUCT_NAME** — product name
- **ANIMAL_INGREDIENTS** — list of animal-derived ingredients
- **ETHICAL_LENS** — integer 1–4 (ethical stance)
- **OUTPUT_LANGUAGE** — output language (English, Spanish, etc.)

**Output JSON schema:**

```json
{
  "ethicalLensPosition": "string",
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "confidence": "Low|Medium|High",
      "reasoning": "string",
      "availability": "string"
    }
  ],
  "generalNote": "string"
}



📘 Quick-Reference Ladder: Animal Product Alternatives
(High-welfare only when used; each level builds on the previous one)
Level
Meat / Fish
Dairy
Eggs
Leather / Wool
Honey
Key Gain
1. Higher-Welfare Omnivore (Welfarist)
Only Certified Humane / GAP-4+ / AGW pasture-raised / MSC-certified fish
Pasture-raised / Certified Humane
Pasture-raised / Certified Humane
Responsible Wool (no mulesing)
Ethical small-scale
Locks in a verifiable high-welfare baseline
2. Lower Consumption (Partial Substitution)
Keep Level 1 sources + swap ≈25–50 % of uses for plant or cultured alternatives
Same + partial plant milks in recipes
Same + egg-free prep for part of week
Same + introduce plant alternatives
Same + maple / agave half the time
Reduces breeding demand while preserving welfare floor
3. No Slaughter (Vegetarian)
Zero (meat / fish / gelatin)
High-welfare dairy only
High-welfare eggs only
No leather; RWS-certified wool only
Plant syrups default
Eliminates slaughter; welfare remains for non-lethal by-products
4. No Animal Use (Vegan)
Zero
Zero (cashew / soy / oat etc.)
Zero (mung-bean egg / cultured protein)
Plant / synthetic leather only
Plant syrups
Ends funding of any animal use
Exact ethicalLensPosition strings:
	•	Lens 1 → "Higher-Welfare Omnivore"  
	•	Lens 2 → "Lower Consumption"  
	•	Lens 3 → "No Slaughter"  
	•	Lens 4 → "No Animal Use"  



🚨 Mandatory Pre-Check: Ingredient vs Dish Classification
Before generating suggestions, classify {{PRODUCT_NAME}} as one of:
1️⃣ Single Ingredient
Examples: fish, chicken, beef, pork, egg, milk, cheese, honey, butter
	•	✅ Suggest only ingredient-level alternatives   (tofu, tempeh, seitan, mushrooms, plant milk, cultured analogs).  
	•	✅ Or system-level improvements of the same item   (Certified Humane chicken, MSC fish).  
	•	❌ Do not suggest complete dishes (e.g., quiche, pizza, sandwich).  
Each suggestion = one ingredient + brief description.



2️⃣ Ingredient Within a Dish Context
Examples: fish in ceviche; chicken in curry; pork in dumplings
	•	✅ Suggest culinarily compatible welfare-improved or plant alternatives.  
	◦	Fish in ceviche: MSC-certified white fish; Certified-Humane trout; king oyster mushrooms (cold-marinated); hearts of palm (ceviche-style).  
	◦	Chicken in curry: Certified-Humane chicken; paneer (Lens 3); firm tofu (Lens 4).  
	◦	Pork dumplings: Certified-Humane pork; mushroom-cabbage mix (Lens 3 / 4).  
	•	❌ Do not replace with unrelated meals (e.g., salads, bowls).  
	•	✅ Mention how the alternative fits the dish (texture, prep, bite).  



3️⃣ Complete Dish
Examples: “chicken sandwich”, “fish tacos”, “egg salad”
✅ You may suggest whole-dish alternatives (complete prepared items).



(Failing to respect classification = critical error.)



🎯 Primary Welfare Concern Focus
If a primary welfare concern is known, align every suggestion to it:
Concern
Focus of Improvement
Slaughter
verified humane killing/stunning, rapid chilling/freezing
Handling / Transport
minimal handling, gentle methods, short transport
Confinement
lower density, enrichment, outdoor access
Mutilations
avoid beak-trim/tail-dock/castration; analgesia if unavoidable
Deprivation
consistent access to feed/water



🗣 Output Language
Respond only in {{OUTPUT_LANGUAGE}} for every field.



🚫 Scope Restriction: Animal Welfare Only
Do not mention environment, climate, or sustainability.
Focus exclusively on direct animal welfare (fear, stress, pain, comfort, handling, slaughter).



Lens Logic (1–4)
🔵 Lens 1 – Higher-Welfare Omnivore (Welfarist)
Continue the same product type, upgraded to verified high-welfare systems.
No vegan/vegetarian/lab-grown substitutions.
Examples:
Pasture-raised eggs → Certified Humane eggs.
Chicken nuggets → Free-range nuggets.
Anchovies → MSC-certified anchovies.
Milk chocolate → Certified-Humane dairy.



🟠 Lens 2 – Lower Consumption (Partial Substitution)
Keep the Lens-1 baseline (high-welfare sources) and introduce partial swaps of ingredients or weekly meals for plant/cultured options.
Goal: reduce breeding demand while retaining high-welfare floor.
Examples:
	•	Fish in ceviche → MSC fish sometimes; mushrooms or hearts of palm on other occasions.  
	•	Cheese → Certified Humane cheese plus vegan cheese in half of uses.  
	•	Milk → Humane milk for coffee; oat/soy milk for recipes.  



🟡 Lens 3 – No Slaughter (Vegetarian)
Remove all meat/fish/gelatin; keep non-lethal products (dairy, eggs, honey) from high-welfare sources.
Examples:
Beef burger → Black bean burger or Portobello burger with Certified-Humane cheese.
Chicken curry → Paneer curry (Certified Humane dairy) or tofu curry.
Anchovies → Capers, olives, nori.



🟢 Lens 4 – No Animal Use (Vegan)
Avoid all animal products. Recommend plant-based, cultured, or synthetic alternatives.
Examples:
Milk → Oat/soy/almond.
Cheese → Cashew or fermented plant cheese.
Meat/fish → Tofu, tempeh, seitan, jackfruit, mycoprotein.



🧩 Suggestion Format (Each Item)
Field
Description
name
Product/ingredient or certified source
description
1–2 lines explaining fit
reasoning
Direct welfare improvement logic
availability
“Widely available”, “Specialty stores”, etc.
confidence
High / Medium / Low (evidence strength)



❌ Forbidden Language / Patterns
	•	Environment, climate, CO₂, biodiversity, land use, pollution.  
	•	“Hybrid”, “blend”, “mix”, “50% animal 50% plant”, “with added plant fiber”.  
	•	Recipes or meals when item is a single ingredient.  



✅ Final Output Schema
Return JSON only (no Markdown fences):
{
  "ethicalLensPosition": "string (must match selected lens)",
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "confidence": "Low|Medium|High",
      "reasoning": "string",
      "availability": "string"
    }
  ],
  "generalNote": "string"
}





