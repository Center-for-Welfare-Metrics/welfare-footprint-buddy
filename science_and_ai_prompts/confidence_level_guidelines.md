# Confidence Level Guidelines

**Version:** 1.0  
**Last Updated:** 2025-01-21  
**Status:** Active  
**Subject to Scientific Review:** Yes

## Overview

The Welfare Footprint app uses a three-level confidence scale (High/Medium/Low) to communicate the certainty of AI-generated welfare analyses. This document defines the scientific criteria for assigning confidence levels across different aspects of product analysis.

---

## Purpose

These guidelines serve to:
1. **Ensure consistency** - Provide clear criteria for confidence assignments
2. **Maintain transparency** - Help users understand the reliability of assessments
3. **Support scientific integrity** - Enable reviewers to validate confidence determinations

---

## General Confidence Definitions

### High Confidence
**Use when:**
- Information is explicitly stated on product labels or packaging
- User has provided authoritative information about the product
- Visual evidence is clear and unambiguous
- Standard formulations are well-documented (e.g., "white chocolate contains dairy")
- Multiple confirming data points align

**Examples:**
- Product labeled "Four Cheese Pizza" → High confidence for dairy ingredients
- User states "This is cage-free eggs" → High confidence for production system
- Visible egg yolk in image → High confidence for egg ingredient

### Medium Confidence
**Use when:**
- Making reasonable inferences based on product category
- Production system is typical but not explicitly labeled
- Partial visual information is available
- Standard formulations exist but variations are common
- User context is somewhat ambiguous

**Examples:**
- Unlabeled chicken product → Medium confidence for conventional farming system
- Chocolate bar without ingredient list → Medium confidence for dairy presence
- Partially obscured product label

### Low Confidence
**Use when:**
- Visual evidence is unclear or contradictory
- Product category has high variability in formulations
- Making assumptions without confirming evidence
- Information is insufficient for reliable determination
- User has not provided clarifying context

**Examples:**
- Ambiguous product in poor lighting
- Generic "baked goods" without visible ingredients
- Cannot determine specific animal species used

---

## Context-Specific Rules

### 1. User-Provided Information

**CRITICAL RULE:** User-provided information is authoritative and should result in HIGH confidence.

**When user explicitly states ingredients or production methods:**
- Set confidence to "High" regardless of visual ambiguity
- Examples:
  - User: "This is organic, pasture-raised chicken" → productionSystem confidence = High
  - User: "Polish Żurek soup contains sausage and eggs" → animalIngredients confidence = High
  - User: "This is cage-free" → productionSystem confidence = High

**Never mark as Low or Medium when user provides explicit information.**

### 2. Explicit Product Labels

**CRITICAL RULE:** When product names or labels explicitly mention animal ingredients, use definitive language and High confidence.

**Must write:** "This product CONTAINS animal-derived ingredients"  
**Never write:** "likely contains", "may contain", "appears to contain"

**Applies to:**
- "Four Cheese Pizza" → High confidence, contains dairy
- "Beef Burger" → High confidence, contains beef
- "Contains Milk" label → High confidence, contains dairy
- "Egg Pasta" → High confidence, contains eggs
- "Yogurt" → High confidence, contains dairy

**Use cautious language ONLY when:**
- Product name is vague or ambiguous
- Label is partially obscured
- Evidence is insufficient

### 3. Production System Assessment

**Standard Confidence Levels:**
- **High:** Explicit certification visible (e.g., "Certified Humane", "Organic", "Free-Range")
- **Medium:** Typical system inferred from product category or brand
- **Low:** Cannot determine production system from available information

**Certified Humane Confidence Adjustment:**

When a product displays "Certified Humane" certification:
- **If user preference is "Prioritize Big Welfare Gains"** → Set confidence to High
- **If user preference is "Strong Welfare Standards"** → Set confidence to High
- **If user preference is "Minimal Animal Suffering"** → Set confidence to Medium

*Rationale:* User's ethical lens affects the relevance of the certification to their goals, which impacts confidence in the recommendation's alignment with their values.

### 4. Product Knowledge Inference

**High Confidence for Standard Formulations:**

Use HIGH confidence when product categories have well-documented standard ingredients:
- White chocolate ("Branco") → ALWAYS contains dairy (High confidence)
- Milk chocolate → Contains dairy unless labeled "dark" or "vegan" (High confidence)
- Standard yogurt → Contains dairy unless labeled "plant-based" (High confidence)
- Cheese products → Always contain dairy (High confidence)
- Ice cream → Contains dairy unless labeled "plant-based" (High confidence)

**Medium Confidence for Variable Formulations:**
- Standard cookies, cakes, baked goods → Typically contain eggs and dairy (Medium confidence)
- Bread products → May or may not contain dairy/eggs (Medium confidence)
- Dark chocolate → May contain milk as processing aid (Medium confidence)

### 5. Composite Food Decomposition

**Confidence for Visible Ingredients:**
- Visible animal ingredients in composite dishes → High confidence
  - Example: Visible egg yolk on khachapuri → High confidence
  - Example: Visible salmon pieces in rice bowl → High confidence

**Confidence for Inferred Components:**
- Standard recipe components not clearly visible → Medium confidence
  - Example: Cheese in lasagna (not directly visible) → Medium confidence

---

## Special Cases

### When Information is Limited
- Always acknowledge uncertainty explicitly in the analysis text
- Use phrases like "based on available information", "likely", "typically"
- Default to Medium or Low confidence rather than overstating certainty

### When User Corrects Initial Analysis
- Trust user's authoritative knowledge over visual interpretation
- Update confidence to High for user-corrected information
- Document the correction in the assumption field

### Cultural and Regional Products
- Use Medium confidence when inferring ingredients from cultural context
- Example: "Polish Żurek soup traditionally contains sausage" → Medium confidence unless user confirms

---

## Implementation Notes

**Code Location:** Confidence levels are assessed in:
- `supabase/functions/analyze-image/index.ts`
- `supabase/functions/_shared/prompt-loader.ts` (prompts define confidence criteria)
- Applied across all analysis modes (detect_items, analyze_product, analyze_focused_item)

**Output Format:** Confidence levels appear in JSON responses for:
- productName.confidence
- animalIngredients.confidence
- productionSystem.confidence
- welfareConcerns.confidence

---

## Review and Updates

**Review Frequency:**
- Quarterly review by scientific team
- When user feedback indicates confidence miscalibration
- When new product categories or certifications emerge
- When AI model behavior changes

**Update Process:**
1. Propose changes to this document with rationale
2. Scientific review and validation
3. Update implementation prompts to align
4. Document version change and date
5. Monitor impact on user trust and accuracy metrics

---

## Version History

| Version | Date | Changes | Reviewer |
|---------|------|---------|----------|
| 1.0 | 2025-01-21 | Initial documentation extracted from prompts and code | - |

---

## Related Documentation

- [`science_and_ai_prompts/analyze_product.md`](analyze_product.md) - Product analysis prompt with confidence instructions
- [`science_and_ai_prompts/analyze_focused_item.md`](analyze_focused_item.md) - Focused item analysis prompt
- [`science_and_ai_prompts/detect_items.md`](detect_items.md) - Multi-item detection prompt
- `science_and_ai_prompts/README.md` - Prompt system overview

---

## Notes for Scientists

This document defines the **operational criteria** for confidence level assignment. Scientists reviewing this should consider:

1. **Validity:** Do these criteria accurately reflect epistemic uncertainty?
2. **Calibration:** Do confidence levels match actual accuracy rates in practice?
3. **User Comprehension:** Will users correctly interpret confidence levels?
4. **Consistency:** Are criteria applied uniformly across all analysis types?
5. **Conservative Bias:** Are we appropriately cautious when evidence is limited?

**Feedback:** Direct scientific feedback to the research team for consideration in future versions.
