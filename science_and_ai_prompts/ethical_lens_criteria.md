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


# Ethical Lens Criteria

**Version:** 1.2  
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

# Ethical Lens Levels


The **Ethical Lens** allows users to view product assessments through different moral perspectives.  
It influences **how animal-derived ingredients are interpreted**, **which welfare concerns are emphasized**, and **what alternative products are suggested**.

Choose the perspective that best matches your values.  
This will guide which kinds of products or swaps are recommended.

---

## Lens 1 – Concerned Omnivore  
### (Prioritize Big Welfare Gains)

**Philosophy**  
Keep the same type of product but prioritize **high‑welfare** alternatives to reduce the most extreme suffering.

**Recommendation Criteria**
- Suggest cage‑free, enriched, pasture‑raised, or certified humane versions.  
- Maintain the same product category (e.g., eggs → high‑welfare eggs).  
- Focus on concrete, documented welfare improvements within animal agriculture.

**When High‑Welfare Options Don’t Exist**
1. Inform the user that no verified high‑welfare alternative is currently available.  
2. Briefly describe what a better system would look like (e.g., slower‑growing breeds, no mutilations, outdoor access).  
3. Suggest similar products in the same category that *do* have high‑welfare certifications.

**Tone**  
Practical and encouraging.  

**Example Message**  
“This version improves conditions for animals while keeping similar products.”  

**Required Output**  
Always include confidence level (High / Medium / Low) and a short reasoning summary.

---

## Lens 2 – Welfarist  
### (Strong Welfare Standards)

**Philosophy**  
Recommend certified or verifiably higher‑welfare animal products that meet multiple welfare criteria.

**Recommendation Criteria**
- Recognized certifications (e.g., Animal Welfare Approved, Certified Humane, Global Animal Partnership Step 3+).  
- Documented welfare improvements (reduced stocking density, enrichment, humane slaughter).  
- Regenerative or high‑welfare farming systems.

**Guidance**
- Provide concise explanations of welfare improvements.  
- Reference credible certification bodies.  
- Distinguish between minimal and substantial gains.

**Tone**  
Informative and reassuring.  

**Required Output**  
Always include confidence level and reasoning summary.

---

## Lens 3 – Reducitarian  
### (Minimal Animal Suffering)

**Philosophy**  
Suggest **hybrid or reduced‑animal** products that significantly lower overall welfare impacts.

**Recommendation Criteria**
- Plant‑meat blends or partial replacements.  
- Products with substantially less animal content than conventional versions.  
- Fermentation‑based or novel‑protein products that replace part of the animal input.

**Guidance**
- Emphasize how this choice reduces the total number of animals affected.  
- Quantify reductions when possible (e.g., “50 % less animal content”).  
- Highlight innovative transition options.

**Tone**  
Neutral and pragmatic.  

**Required Output**  
Always include confidence level and reasoning summary.

---

## Lens 4 – Vegetarian (Against Animal Death)  
### (Minimal Animal Use)

**Philosophy**  
Recommend **mostly plant‑based** products that avoid direct animal killing but may include dairy, eggs, or trace animal inputs.

**Recommendation Criteria**
- Plant‑forward foods where animal ingredients are secondary.  
- Products with negligible or processing‑level animal inputs.  
- Clear preference for options that spare animal lives.

**Guidance**
- Acknowledge that welfare impacts persist in dairy/egg systems but are lower than in meat production.  
- Be transparent about remaining animal ingredients.  
- Distinguish trace vs. primary ingredients.

**Tone**  
Transparent and gently aspirational.  

**Required Output**  
Always include confidence level and reasoning summary.

---

## Lens 5 – Vegan  
### (Aim for Zero Animal Harm)

**Philosophy**  
Recommend **fully animal‑free** products only, excluding any item involving live‑animal use.

**Recommendation Criteria**
- Plant‑based or cultivated alternatives (e.g., lab‑grown meat, precision fermentation).  
- Synthetic or biotech replacements that replicate animal functions without animals.  
- Verified absence of animal ingredients or contamination.

**Strict Requirements**
- Zero animal‑derived ingredients.  
- No live‑animal use in production.  
- No cross‑contamination when verifiable.

**Tone**  
Positive, future‑oriented, and harm‑free.  

**Example Message**  
“These options align with your goal of avoiding harm to animals.”  

**Guidance**
- Highlight technological and ethical innovation.  
- Frame alternatives as compassionate and forward‑looking.  
- Emphasize alignment with harm‑reduction and sustainability values.

**Required Output**  
Always include confidence level and reasoning summary.

---

### Summary Table

| Lens | Perspective | Guiding Principle | Typical Example |
|------|--------------|------------------|----------------|
| **1** | Concerned Omnivore | Reduce the worst suffering while keeping similar foods | Pasture‑raised eggs |
| **2** | Welfarist | Strengthen welfare standards through certification | Certified Humane chicken |
| **3** | Reducitarian | Lower animal use via blended or partial‑replacement products | 50 % plant‑meat burger |
| **4** | Vegetarian (Against Animal Death) | Avoid direct killing, accept dairy / eggs | Cheese‑based dishes |
| **5** | Vegan | Exclude all animal use or harm | Plant‑based cheese or cultivated meat |

---

**Note:**  
These lenses are experimental interpretive models.  
They do *not* yet rely on validated Welfare Footprint Framework data but are designed to explore how different moral perspectives influence the communication of animal welfare information.




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
- **Prompt Template:** [`science_and_ai_prompts/suggest_ethical_swap.md`](suggest_ethical_swap.md) structures the AI instructions
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

- [`science_and_ai_prompts/suggest_ethical_swap.md`](suggest_ethical_swap.md) - AI prompt template
- `science_and_ai_prompts/README.md` - Prompt system overview
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
- **Prompt Template:** [`science_and_ai_prompts/suggest_ethical_swap.md`](suggest_ethical_swap.md) structures the AI instructions
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

- [`science_and_ai_prompts/suggest_ethical_swap.md`](suggest_ethical_swap.md) - AI prompt template
- `science_and_ai_prompts/README.md` - Prompt system overview
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
