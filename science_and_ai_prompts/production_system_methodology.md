# Production System Assessment Methodology

**Version:** 1.0  
**Last Updated:** 2025-01-21  
**Status:** Active  
**Subject to Scientific Review:** Yes

## Overview

This document defines the scientific methodology for assessing animal production systems when analyzing food products. Production system assessment is critical for understanding welfare implications, as different systems (conventional, cage-free, pasture-raised, etc.) have significantly different welfare outcomes.

---

## Purpose

This methodology serves to:
1. **Guide AI analysis** - Provide clear criteria for production system identification
2. **Enable welfare assessment** - Connect production systems to welfare outcomes
3. **Maintain transparency** - Document assumptions when information is limited
4. **Support scientific review** - Allow validation of assessment logic

---

## Production System Categories

### 1. Conventional/Industrial Systems

**Characteristics:**
- High stocking density
- Indoor confinement
- Limited behavioral expression
- Common physical alterations (debeaking, tail docking, etc.)
- Efficiency-optimized breeding

**Common for:**
- Eggs (battery cages or cage-free barn systems)
- Broiler chickens
- Pigs (gestation crates, farrowing crates)
- Dairy cattle (intensive confinement)

**Welfare Concerns:**
- Severe space restrictions
- Inability to perform natural behaviors
- Chronic stress and frustration
- Physical injuries from confinement
- High prevalence of painful procedures

### 2. Cage-Free/Barn Systems

**Characteristics:**
- No individual cages (for poultry)
- Indoor housing with more space than conventional
- Some ability to move freely
- Access to perches, nesting boxes (for laying hens)
- Still high stocking density

**Common for:**
- Eggs (cage-free designation)
- Some poultry meat production

**Welfare Improvements over Conventional:**
- Ability to walk and turn around
- Some natural behaviors possible (nesting, perching)
- Reduced physical injuries from cage wires

**Remaining Concerns:**
- High stocking density
- Limited behavioral repertoire
- No outdoor access
- Stress from large group sizes

### 3. Free-Range/Outdoor Access

**Characteristics:**
- Access to outdoor areas (quality varies)
- More space per animal
- Ability to forage and explore
- More natural light exposure
- Greater behavioral freedom

**Common for:**
- Poultry (eggs and meat)
- Some pork production
- Some beef production

**Welfare Improvements:**
- Natural behavior expression (foraging, dust bathing, exploring)
- Environmental complexity
- Fresh air and natural light
- Lower stress levels

**Remaining Concerns:**
- Outdoor area size and quality vary widely
- Predation risk
- Weather exposure
- May still involve painful procedures

### 4. Pasture-Raised/Grass-Fed

**Characteristics:**
- Significant outdoor access on pasture
- Low stocking density
- Natural grazing/foraging
- More species-appropriate living conditions
- Often slower-growing breeds

**Common for:**
- Ruminants (cattle, sheep, goats)
- Poultry
- Some pork

**Welfare Improvements:**
- Natural feeding behavior
- Low stress environment
- Species-appropriate social structures
- Minimal confinement

**Remaining Concerns:**
- Slaughter practices still relevant
- Winter housing conditions (in some regions)
- Predation and disease management

### 5. Certified Humane / Higher-Welfare Certifications

**Organizations:**
- Certified Humane (Humane Farm Animal Care)
- Animal Welfare Approved (A Greener World)
- Global Animal Partnership (Steps 1-5+)
- RSPCA Assured (UK)
- Welfare-Quality® (EU)

**Common Standards Include:**
- Space requirements (minimum square footage per animal)
- Environmental enrichment requirements
- No cages/crates (depending on certification level)
- Outdoor access (some certifications)
- Restrictions on painful procedures
- Humane slaughter requirements

**Welfare Assessment:**
- Use certification level to infer welfare conditions
- Higher-tier certifications (e.g., GAP Step 4-5+) indicate better welfare
- Cross-reference with known standards from certification bodies

### 6. Organic

**Characteristics:**
- Certified organic feed (no synthetic pesticides, GMOs)
- No routine antibiotic use
- Outdoor access required (U.S. USDA Organic)
- Standards vary by country/certifier

**Welfare Relevance:**
- Outdoor access generally improves welfare
- Reduced chemical exposure
- Does NOT guarantee high welfare standards (e.g., debeaking still allowed)

**Important Note:**
- Organic certification focuses primarily on feed and chemical inputs
- Welfare standards are secondary and vary
- Not equivalent to high-welfare certification

### 7. Unknown/Unable to Determine

**When to Use:**
- No visible labeling or certification
- Insufficient information from image or user
- Product type doesn't clearly indicate system

**Approach:**
- Explain that production system cannot be determined
- Describe typical systems for this product category
- Mark confidence as "Low"
- Acknowledge uncertainty in welfare assessment

---

## Assessment Methodology

### Step 1: Visual Evidence Collection

**Look for:**
- Explicit labels ("Cage-Free", "Pasture-Raised", "Certified Humane", "Organic")
- Certification logos (recognizable symbols)
- Brand names associated with welfare standards
- Product photography suggesting production method (outdoor scenes, etc.)

### Step 2: User-Provided Context

**If user provides production information:**
- Trust user's authoritative knowledge
- Set confidence to "High"
- Incorporate into productionSystem.value
- Adjust welfareConcerns based on stated system

**Examples:**
- User: "This is cage-free" → productionSystem = "Cage-free eggs" (High confidence)
- User: "Organic, pasture-raised chicken" → productionSystem = "Organic, pasture-raised" (High confidence)

### Step 3: Reasonable Inference

**When no explicit information:**
- Infer based on product category and market norms
- Use Medium confidence for typical systems
- Document assumptions clearly

**Inference Rules:**
- Generic eggs without label → Assume conventional (cage or cage-free barn) - Medium confidence
- Standard chicken product → Assume conventional broiler production - Medium confidence
- Standard pork → Assume intensive indoor system - Medium confidence
- Standard dairy → Assume intensive confinement - Medium confidence

### Step 4: Assumption Documentation

**Always document assumptions made:**
- Use productionSystem.assumption field
- Explain reasoning for inference
- Acknowledge limitations

**Example:**
```json
{
  "productionSystem": {
    "value": "Likely conventional cage or cage-free barn system",
    "confidence": "Medium",
    "assumption": "No welfare labeling visible; assuming typical commercial egg production system common in this region"
  }
}
```

---

## Welfare Concerns by Production System

### Conventional Systems
**Primary Concerns:**
- Severe confinement
- Inability to perform natural behaviors
- Chronic stress and frustration
- Physical injuries from housing
- Painful procedures (debeaking, castration, tail docking)
- Poor air quality (ammonia exposure)

### Cage-Free/Barn
**Primary Concerns:**
- High stocking density
- Limited behavioral freedom (compared to outdoor systems)
- Stress from large group sizes
- Poor air quality (ammonia)
- Painful procedures still common

**Improvements:**
- Reduced physical injuries
- Some natural behaviors possible

### Free-Range/Outdoor Access
**Primary Concerns:**
- Quality and size of outdoor area (often minimal)
- Painful procedures may still occur
- Slaughter practices

**Improvements:**
- Natural behaviors (foraging, exploring)
- Environmental complexity
- Fresh air and natural light

### Pasture-Raised
**Primary Concerns:**
- Slaughter practices
- Weather exposure (in extreme conditions)
- Predation risk

**Improvements:**
- Natural living conditions
- Low stress
- Species-appropriate behaviors

### Certified Humane/High-Welfare
**Primary Concerns:**
- Certification level matters (lower tiers may still have significant welfare issues)
- Slaughter practices (some certifications address this, others don't)
- Enforcement and compliance vary

**Improvements:**
- Standards enforced through audits
- Specific requirements for space, enrichment, handling

---

## Special Considerations

### User Ethical Preference Context

**Certified Humane Confidence Adjustment:**

When user's ethical lens is:
- **"Prioritize Big Welfare Gains"** → Certified Humane is highly relevant (High confidence)
- **"Strong Welfare Standards"** → Certified Humane is highly relevant (High confidence)
- **"Minimal Animal Suffering"** → Certified Humane still involves animal use (Medium confidence)

*Rationale:* The relevance of the certification depends on the user's ethical goals. Users seeking incremental welfare improvements value certifications more than users seeking minimal animal use.

### Geographic Variation

**Production systems vary by region:**
- U.S.: Conventional systems dominate; some movement toward cage-free
- EU: Battery cages banned for laying hens since 2012
- Brazil: Intensive systems common, especially for poultry
- Regional context matters for accurate assessment

**Approach:**
- Acknowledge geographic uncertainty when relevant
- Use general "conventional" or "typical" language unless region is known
- Note regional differences in assumptions when appropriate

### Species-Specific Considerations

**Different species have different production norms:**
- **Chickens (broilers):** Intensive indoor systems are standard
- **Chickens (layers):** Transition from caged to cage-free ongoing
- **Pigs:** Gestation crates still common; farrowing crates widespread
- **Cattle (dairy):** Intensive confinement vs. pasture varies by region
- **Cattle (beef):** Some pasture-raised, but feedlot finishing common
- **Fish (farmed):** High-density aquaculture with welfare concerns

---

## Implementation Notes

**Code Location:**
- Defined in `supabase/functions/_shared/prompt-loader.ts` (prompts)
- Applied in `supabase/functions/analyze-image/index.ts`

**Output Format:**
```json
{
  "productionSystem": {
    "value": "Description of likely production system and practices",
    "confidence": "High" | "Medium" | "Low",
    "assumption": "Explanation of any assumptions made (optional)"
  }
}
```

---

## Review and Updates

**Review Frequency:**
- Annually or when significant industry changes occur
- When new certifications or standards emerge
- When user feedback indicates inaccuracies
- When new welfare science is published

**Update Process:**
1. Propose updates with scientific rationale
2. Review by animal welfare scientists
3. Update prompts and implementation code
4. Document version change
5. Monitor accuracy of updated methodology

---

## Version History

| Version | Date | Changes | Reviewer |
|---------|------|---------|----------|
| 1.0 | 2025-01-21 | Initial documentation | - |

---

## Related Documentation

- `science_and_ai_prompts/welfare_concerns_framework.md` - How to assess welfare issues by system
- `science_and_ai_prompts/confidence_level_guidelines.md` - Confidence assignment rules
- [`science_and_ai_prompts/analyze_product.md`](analyze_product.md) - Product analysis prompt

---

## Notes for Scientists

This methodology should be reviewed for:

1. **Scientific Accuracy:** Do production system descriptions align with current animal science literature?
2. **Comprehensiveness:** Are all relevant systems covered?
3. **Geographic Applicability:** Are regional differences appropriately acknowledged?
4. **Certification Validity:** Are welfare certification descriptions accurate and up-to-date?
5. **Welfare Linkage:** Are welfare concerns correctly mapped to production systems?

**Feedback:** Direct scientific feedback to the research team for methodology refinement.
