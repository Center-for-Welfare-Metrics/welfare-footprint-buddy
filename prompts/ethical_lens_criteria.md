# Ethical Lens Criteria

**Version:** 1.0  
**Last Updated:** 2025-01-21  
**Status:** Active  
**Subject to Scientific Review:** Yes

## Overview

The Welfare Footprint app provides users with five ethical lens positions that guide product swap recommendations. Each lens represents a different approach to reducing animal welfare impact, ranging from incremental improvements within animal agriculture to complete elimination of animal use.

These criteria define the AI's behavior when generating alternative product suggestions based on the user's selected ethical preference.

---

## Purpose

These criteria serve as:
1. **Guidance for AI behavior** - Define what types of alternatives to suggest for each lens
2. **Scientific documentation** - Provide transparent rationale for welfare-based recommendations
3. **Review reference** - Enable scientists to validate and refine the ethical framework

---

## Ethical Lens Levels

### Lens 1: Prioritize Big Welfare Gains

**Philosophy:** Keep the same type of product but recommend HIGH-WELFARE versions.

**Recommendation Criteria:**
- Suggest cage-free, enriched, pasture-raised, or certified humane options
- Maintain the same product category (e.g., eggs → high-welfare eggs)
- Focus on documented welfare improvements within animal agriculture systems

**When High-Welfare Options Don't Exist:**
1. Inform the user that no verified high-welfare alternative is currently available for this specific product
2. Briefly describe what such a system would look like (e.g., slower-growing breeds, no mutilations, better housing, outdoor access, enriched environments)
3. Suggest similar products in the same category that DO have high-welfare certifications available

**Tone:** Practical and encouraging  
**Example Message:** "This version improves conditions for animals while keeping similar products."

**Required Output:** Always include confidence level (High/Medium/Low) and brief reasoning summary.

---

### Lens 2: Strong Welfare Standards

**Philosophy:** Recommend certified or verifiably higher-welfare animal products that meet multiple welfare criteria.

**Recommendation Criteria:**
Look for products with:
- Recognized certifications (e.g., Animal Welfare Approved, Certified Humane, Global Animal Partnership Step 3+)
- Documented welfare improvements (reduced stocking density, enrichment, better slaughter practices)
- Regenerative or high-welfare farming systems

**Guidance:**
- Provide short explanations of the specific welfare improvements
- Reference credible certification bodies when available
- Distinguish between minimal improvements and substantial welfare gains

**Tone:** Informative and reassuring

**Required Output:** Always include confidence level (High/Medium/Low) and brief reasoning summary.

---

### Lens 3: Minimal Animal Suffering

**Philosophy:** Suggest hybrid or blended options (plant-animal mixes, reduced animal input) that reduce overall welfare impact.

**Recommendation Criteria:**
Look for:
- Plant-meat blend products
- Products with significantly reduced animal content compared to traditional versions
- Innovative products using fermentation or novel proteins alongside reduced animal ingredients

**Guidance:**
- Emphasize that this reduces overall welfare impact while keeping familiar choices
- Quantify reduction when possible (e.g., "50% less animal content")
- Highlight innovative hybrid technologies

**Tone:** Neutral and pragmatic

**Required Output:** Always include confidence level (High/Medium/Low) and brief reasoning summary.

---

### Lens 4: Minimal Animal Use

**Philosophy:** Recommend mostly plant-based options with only trace or secondary animal ingredients.

**Recommendation Criteria:**
Look for:
- Plant-forward products with minimal animal content
- Products where animal ingredients are secondary or trace elements
- Options that significantly reduce animal use (e.g., 90%+ plant-based)

**Guidance:**
- Clarify that these still have minor welfare costs but are far less than typical products
- Be transparent about remaining animal ingredients
- Distinguish between trace/processing ingredients vs. primary ingredients

**Tone:** Transparent and gently aspirational

**Required Output:** Always include confidence level (High/Medium/Low) and brief reasoning summary.

---

### Lens 5: Aim for Zero Animal Harm

**Philosophy:** Recommend FULLY animal-free products ONLY. EXCLUDE any item involving live-animal use.

**Recommendation Criteria:**
Suggest:
- Plant-based alternatives (e.g., Beyond Meat, Impossible Foods, plant-based dairy)
- Cultured/cultivated alternatives (e.g., lab-grown meat, precision fermentation products)
- Fully synthetic alternatives that replicate the function without animal use

**Strict Requirements:**
- Zero animal-derived ingredients
- No live-animal use in production
- No cross-contamination with animal products (when verifiable)

**Tone:** Positive, future-oriented, and harm-free

**Example Message:** "These options align with your goal of avoiding harm to animals."

**Guidance:**
- Highlight innovative products that don't require the use of sentient animals
- Frame alternatives as technologically advanced and compassionate
- Emphasize alignment with harm-reduction values

**Required Output:** Always include confidence level (High/Medium/Low) and brief reasoning summary.

---

## Universal Requirements (All Lenses)

Regardless of the selected ethical lens, all AI-generated suggestions must include:

1. **Confidence Level** - High, Medium, or Low based on:
   - Availability of data about the product
   - Certainty of welfare improvements
   - Market availability of alternatives

2. **Reasoning Summary** - Brief explanation covering:
   - Why this alternative aligns with the selected lens
   - Key welfare differences from the original product
   - Any limitations or uncertainties in the recommendation

3. **Transparency** - When data is limited or uncertain:
   - Explicitly state limitations
   - Avoid making unverifiable claims
   - Use language like "may," "likely," or "based on available information"

4. **Scientific Integrity** - All claims about welfare improvements must be:
   - Based on credible sources (research, certification bodies, industry standards)
   - Verifiable when possible
   - Conservative when evidence is limited

---

## Implementation Notes

- **Code Location:** These criteria are implemented in `supabase/functions/suggest-ethical-swap/index.ts` (lines 100-159)
- **AI Model:** Currently uses Gemini API via centralized AI handler
- **Prompt Template:** `prompts/suggest_ethical_swap.txt` structures the AI instructions
- **Input Validation:** Ethical lens must be integer 1-5, validated before processing

---

## Review and Updates

**Review Frequency:** These criteria should be reviewed:
- Quarterly by the scientific team
- When new welfare research emerges
- When user feedback indicates misalignment
- When certification standards change

**Update Process:**
1. Propose changes in this document with rationale
2. Scientific review and approval
3. Update implementation code to match
4. Document version change and date
5. Consider user communication if changes are substantial

---

## Version History

| Version | Date | Changes | Reviewer |
|---------|------|---------|----------|
| 1.0 | 2025-01-21 | Initial documentation extracted from codebase | - |

---

## Related Documentation

- `prompts/suggest_ethical_swap.txt` - AI prompt template
- `prompts/README.md` - Prompt system overview
- `supabase/functions/suggest-ethical-swap/index.ts` - Implementation code
- `docs/architecture_overview.md` - System architecture

---

## Notes for Scientists

This document is intended to be **non-technical** and focused on the **scientific and ethical rationale** behind each lens level. Scientists reviewing this document should consider:

1. **Accuracy:** Do the criteria align with current animal welfare science?
2. **Clarity:** Are the distinctions between lens levels clear and defensible?
3. **Consistency:** Do the recommendations follow a logical progression?
4. **Transparency:** Are limitations and uncertainties appropriately acknowledged?
5. **Mission Alignment:** Do these criteria support the Welfare Footprint Institute's mission?

**Feedback:** Please direct scientific feedback or proposed revisions to the research team for consideration.
