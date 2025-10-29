<!--
NOTE: Runtime source of truth. Embedded during build for Supabase Edge deployment.
This file is the authoritative prompt fragment used at runtime.
-->

### ⚠️ Critical - User-Provided Context

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
- Welfare concerns = Adjusted based on USER CONTEXT about production systems
