# Welfare Footprint App - AI Prompt Instruction Audit Report

**Date:** 2025-10-29  
**Status:** Read-Only Analysis (No Modifications)  
**Scope:** All AI prompt/instruction files and embedded prompts  

---

## Executive Summary

This audit reveals significant duplication and drift across 23 prompt/instruction sources. The system has evolved a **two-step detection pipeline** that is correctly separated, but duplicate content exists between `/science_and_ai_prompts/` (documentation) and `/supabase/functions/_shared/prompts/` (runtime). Additionally, several embedded prompts in `/supabase/functions/_shared/prompt-loader.ts` have diverged from their source files, creating maintenance risks and inconsistency.

**Critical Findings:**
- ✅ Stage separation is correct (Step 1: detection, Step 2: refinement)
- ⚠️ Duplicate prompt versions across 3 locations
- ⚠️ Embedded prompts in `prompt-loader.ts` have diverged from source files
- ⚠️ User-provided context handling duplicated across 4 prompts
- ⚠️ No ethical lens leakage detected (correct gating)
- ⚠️ Welfare information integration instructions added correctly to Step 1

---

## 1. Inventory

### A. Documentation Prompts (`/science_and_ai_prompts/`)

| File | Purpose | Stage | Referenced By | Status |
|------|---------|-------|---------------|--------|
| `analyze_user_material.md` | Step 1: Multi-item detection (visual + OCR) | Stage 3 | Documentation only | **Not used at runtime** |
| `confirm_refine_items.md` | Step 2: Apply user corrections | Stage 3 | Documentation only | **Not used at runtime** |
| `analyze_product.md` | Single product welfare analysis | Stage 4 | Documentation only | **Not used at runtime** |
| `analyze_focused_item.md` | Focused item welfare analysis (multi-item context) | Stage 4 | Documentation only | **Not used at runtime** |
| `suggest_ethical_swap.md` | Ethical swap suggestions by lens | Stage 5 | Documentation only | **Not used at runtime** |
| `animal_ingredient_classification.md` | Classification criteria reference | Supporting | All analysis prompts | Documentation |
| `confidence_level_guidelines.md` | Confidence assessment rules | Supporting | All analysis prompts | Documentation |
| `ethical_lens_criteria.md` | Ethical lens definitions | Stage 5 | `suggest_ethical_swap.md` | Documentation |
| `welfare_concerns_framework.md` | Welfare concern categorization | Stage 4 | Analysis prompts | Documentation |
| `production_system_methodology.md` | Production system assessment | Stage 4 | Analysis prompts | Documentation |

### B. Runtime Prompts (`/supabase/functions/_shared/prompts/`)

| File | Purpose | Stage | Used By | Status |
|------|---------|-------|---------|--------|
| `analyze_user_material.md` | Step 1: Multi-item detection | Stage 3 | `loadAndProcessPrompt()` | **Runtime (duplicates docs)** |
| `confirm_refine_items.md` | Step 2: User corrections | Stage 3 | `loadAndProcessPrompt()` | **Runtime (duplicates docs)** |
| `analyze_product.md` | Single product analysis | Stage 4 | `loadAndProcessPrompt()` | **Runtime (duplicates docs)** |
| `analyze_focused_item.md` | Focused item analysis | Stage 4 | `loadAndProcessPrompt()` | **Runtime (duplicates docs)** |
| `suggest_ethical_swap.md` | Ethical swaps | Stage 5 | `loadAndProcessPrompt()` | **Runtime (duplicates docs)** |

### C. Embedded Prompts (`/supabase/functions/_shared/prompt-loader.ts`)

| Key | Purpose | Stage | Status |
|-----|---------|-------|--------|
| `analyze_user_material` | Step 1: Detection | Stage 3 | **Diverged from source** |
| `confirm_refine_items` | Step 2: Refinement | Stage 3 | **Simplified (correct)** |
| `analyze_focused_item` | Focused analysis | Stage 4 | **Diverged from source** |
| `analyze_product` | Product analysis | Stage 4 | **Diverged from source** |
| `suggest_ethical_swap` | (Not embedded) | Stage 5 | Uses file from `_shared/prompts/` |

### D. Edge Function Inline Prompts

| File | Location | Purpose | Stage | Status |
|------|----------|---------|-------|--------|
| `enrich-description/index.ts` | Lines 29-61 | Description enrichment | Stage 2 | **Standalone (no duplication)** |

---

## 2. Data/Schema Alignment

| Field | Stage Owner | Defined In | Used In | Notes |
|-------|-------------|------------|---------|-------|
| `items` | Stage 3 | `analyze_user_material.md` | All stages | ✅ Consistent |
| `name` | Stage 3 | `analyze_user_material.md` | All stages | ✅ Consistent |
| `likelyHasAnimalIngredients` | Stage 3 | `analyze_user_material.md` | All stages | ✅ Consistent |
| `animalConfidence` | Stage 3 | `analyze_user_material.md` | All stages | ✅ Consistent |
| `confidence` | Stage 3 | `analyze_user_material.md` | All stages | ✅ Consistent |
| `source` | Stage 3 | `analyze_user_material.md` | Stage 3 only | ✅ Correct (provenance tracking) |
| `parentDish` | Stage 3 | `analyze_user_material.md` | Stage 3 only | ✅ Correct (decomposition tracking) |
| `reasoning` | Stage 3 | `analyze_user_material.md` | All stages | ⚠️ **Updated in Step 1 to include welfare details** |
| `suppressedByUser` | Stage 3 | `confirm_refine_items.md` | Stage 3 only | ✅ Correct (auditability) |
| `userEdited` | Stage 3 | `confirm_refine_items.md` | Stage 3 only | ✅ Correct (auditability) |
| `userEdits` | Stage 3 | `confirm_refine_items.md` | Stage 3 only | ✅ Correct (audit log) |
| `hasAnimalIngredients` | Stage 4 | `analyze_product.md` | Stage 4 only | ✅ Correct |
| `productionSystem` | Stage 4 | `analyze_product.md` | Stage 4 only | ✅ Correct |
| `welfareConcerns` | Stage 4 | `analyze_product.md` | Stage 4 only | ✅ Correct |
| `ethicalLensPosition` | Stage 5 | `suggest_ethical_swap.md` | Stage 5 only | ✅ Correct |
| `suggestions` | Stage 5 | `suggest_ethical_swap.md` | Stage 5 only | ✅ Correct |

**Assessment:** Schema alignment is correct. No cross-stage contamination detected.

---

## 3. Duplications and Conflicts

### 🔴 **CRITICAL DUPLICATION #1: Prompt Files in Two Locations**

**Files:**
- `/science_and_ai_prompts/*.md` (5 files)
- `/supabase/functions/_shared/prompts/*.md` (5 files)

**Type:** Complete duplication  
**Impact:** **HIGH** - Changes to documentation don't affect runtime behavior  
**Evidence:**  
```
science_and_ai_prompts/analyze_user_material.md (484 lines)
↔ supabase/functions/_shared/prompts/analyze_user_material.md (496 lines)
```

**Suggested Fix:**
- **Option A:** Make `/science_and_ai_prompts/` the single source of truth, load from there at runtime
- **Option B:** Make `/supabase/functions/_shared/prompts/` the source of truth, remove documentation duplicates
- **Option C:** Keep both but add automated sync/validation checks

**Consolidation Target:** `/supabase/functions/_shared/prompts/` (runtime location)

---

### 🟡 **MEDIUM DUPLICATION #2: Embedded Prompts Diverged**

**Files:**
- `/supabase/functions/_shared/prompts/analyze_user_material.md`
- `/supabase/functions/_shared/prompt-loader.ts` (embedded version)

**Type:** Drift - embedded version has diverged from file source  
**Impact:** **MEDIUM** - Embedded prompts are used as fallback  
**Evidence:**

**File version (lines 308-345):**
```markdown
4. Provide INTELLIGENT, SELECTIVE, PRODUCT-SPECIFIC reasoning:
   - **CRITICAL: Provide context-aware, educational descriptions that reflect actual product knowledge**
   - **NEVER state the obvious** (e.g., "honey is produced by bees" or "salmon is a fish")
   - **DO provide reasoning that adds real value:**
```

**Embedded version (prompt-loader.ts lines 32-204):**
```typescript
analyze_user_material: `You are an expert food analyst specializing in identifying animal-derived ingredients in PACKAGED or PREPARED food products.

CRITICAL: Objects like furniture, clothing, electronics, vehicles, and their components (seats, leather items, etc.) are NEVER food products and must NEVER be described using food-related terminology.
```

**Difference:** 
- Embedded version is significantly shorter (~170 lines vs. 484 lines)
- Missing ingredient-level decomposition examples
- Missing welfare detail integration rules
- Missing reasoning quality guidelines

**Suggested Fix:** Either:
1. **Remove embedded prompts** entirely, always load from file
2. **Auto-generate embedded prompts** from source files during build
3. **Document** that embedded prompts are intentional simplified fallbacks

---

### 🟡 **MEDIUM DUPLICATION #3: User Context Injection**

**Files:**
- `analyze_product.md` (lines 51-85)
- `analyze_focused_item.md` (lines 28-46)
- `analyze_user_material.md` (does NOT have this section - correct)
- `prompt-loader.ts` embedded versions (all 3)
- **PLUS:** `analyze-image/index.ts` runtime injection (lines 182-309)

**Type:** Duplication across prompts + runtime code injection  
**Impact:** **MEDIUM** - Same logic in 6 places  
**Example (analyze_product.md):**

```markdown
{{#if ADDITIONAL_INFO}}
### ⚠️ Critical - User-Provided Context

The user has provided the following verified information about this product:
"{{ADDITIONAL_INFO}}"

#### Mandatory Instructions for Interpreting User Context

**🔒 Ingredient Detection (Must Preserve):**
- User context about welfare/production methods (e.g., "high-welfare", "pasture-raised", "organic", "cage-free") does NOT change ingredient classification
- If you have ALREADY detected animal ingredients from the image, they REMAIN present regardless of welfare context
```

**Evidence of Runtime Duplication (analyze-image/index.ts):**

```typescript
// Lines 182-203 (Step 1: Detection mode)
if (additionalInfo && additionalInfo.trim()) {
  const userDescriptionContext = `
═══════════════════════════════════════════════════════════════════
🚨 USER-PROVIDED DESCRIPTION (USE AS AUTHORITATIVE CONTEXT) 🚨
═══════════════════════════════════════════════════════════════════

The user has provided this description of the image:

"${additionalInfo}"

⚠️ CRITICAL INSTRUCTIONS:

1. ✅ Use this description as GROUND TRUTH for what's in the image
2. ✅ If the user mentions specific dishes (e.g., "feijoada", "paella"), decompose those dishes according to their traditional recipes
```

```typescript
// Lines 237-269 (Analysis mode - focused item)
if (additionalInfo && additionalInfo.trim()) {
  const userContextPrefix = `
═══════════════════════════════════════════════════════════════════
🚨 CRITICAL - USER-PROVIDED FACTUAL INFORMATION (HIGHEST PRIORITY) 🚨
═══════════════════════════════════════════════════════════════════

The user has provided the following VERIFIED, AUTHORITATIVE information:

"${additionalInfo}"
```

**Conflicts:**
- **Step 1 (detection):** User context is called "description" and focuses on dish decomposition
- **Step 4 (analysis):** User context is called "factual information" and focuses on ingredient presence
- **Prompt files:** Use templating syntax `{{#if ADDITIONAL_INFO}}`
- **Runtime code:** Manually injects context with different formatting

**Suggested Fix:**
1. **Centralize user context handling** into a single reusable template fragment
2. **Remove runtime injection** - pass `ADDITIONAL_INFO` to templates only
3. **Standardize messaging** across detection vs. analysis modes

---

### 🟢 **NO DUPLICATION: Ethical Lens Definitions**

**Status:** ✅ Correctly centralized  

**Evidence:**
- Ethical lens criteria defined in `/science_and_ai_prompts/ethical_lens_criteria.md`
- Implemented ONCE in `/supabase/functions/_shared/prompts/suggest_ethical_swap.md`
- Edge function (`suggest-ethical-swap/index.ts`) loads prompt via `loadAndProcessPrompt()`
- **No inline definitions** found in edge function (lines 209-233 only reference lens names for logging)

**Assessment:** This is the correct pattern - all other prompts should follow this model.

---

## 4. Stage Responsibilities Matrix

| Stage | Files That MUST Own Logic | Files That MUST NOT Include It |
|-------|----------------------------|--------------------------------|
| **Stage 0: Landing / Input** | None (UI only) | N/A |
| **Stage 1: Description Analysis** | `enrich-description/index.ts` (inline prompt) | All others |
| **Stage 2: User Confirm/Refine** | None (UI logic) | N/A |
| **Stage 3: Item Detection** | `analyze_user_material.md` (Step 1)<br>`confirm_refine_items.md` (Step 2) | ⚠️ `analyze_product.md`<br>⚠️ `analyze_focused_item.md`<br>(Both should NOT do item detection) |
| **Stage 4: Welfare Assessment** | `analyze_product.md`<br>`analyze_focused_item.md` | ✅ `analyze_user_material.md` (correctly excludes)<br>✅ `confirm_refine_items.md` (correctly excludes) |
| **Stage 5: Ethical Lens** | `suggest_ethical_swap.md` | ✅ All others (correct - no leakage detected) |
| **Stage 6: Output Formatting** | UI components | All prompts |

**Violations Detected:**

1. ⚠️ **analyze_user_material.md now includes welfare details in reasoning**
   - **Lines 308-345:** Updated reasoning guidelines instruct AI to add welfare information
   - **Example:** "For honey varieties: Describe flavor, texture, crystallization properties, floral source, regional origin, traditional uses"
   - **Impact:** Step 1 is no longer purely visual detection - it's including product knowledge
   - **Assessment:** This appears to be an **intentional recent change** per user request (welfare details integration)
   - **Risk:** LOW (if intentional), but blurs stage boundaries

2. ✅ **No ethical lens leakage detected**
   - All lenses correctly gated to Stage 5 only
   - Validation in `suggest-ethical-swap/index.ts` enforces boundaries (lines 65-143)

---

## 5. Handoffs and Source of Truth

### A. Detection Pipeline (Stage 3)

**Step 1 → Step 2 Handoff:**

| Input | Output | Source of Truth | Broken/Missing |
|-------|--------|-----------------|----------------|
| **Step 1 Input:**<br>- `imageData`<br>- `additionalInfo` (optional user description) | **Step 1 Output:**<br>- `items[]` with detection metadata<br>- `source`, `parentDish`, `confidence` | `analyze_user_material.md` | ✅ Working |
| **Step 2 Input:**<br>- Original items from Step 1<br>- `userCorrection` | **Step 2 Output:**<br>- Modified `items[]`<br>- `userEdits[]` log<br>- `suppressedByUser`, `userEdited` flags | `confirm_refine_items.md` | ✅ Working |

**Evidence (analyze-image/index.ts):**
```typescript
// Lines 209-227 (Step 2: Refine mode)
const refinementContext = `
ORIGINAL DETECTION RESULTS:
${originalDetectionResults}

USER CORRECTION:
${userCorrection}

Apply the user correction to the original detection results following the rules in the prompt.
`;
```

**Assessment:** ✅ Handoff is clean and auditable

---

### B. Detection → Welfare Analysis (Stage 3 → Stage 4)

**Handoff:**

| Input | Output | Source of Truth | Broken/Missing |
|-------|--------|-----------------|----------------|
| **Stage 3 Output:**<br>- Confirmed item list<br>- User-edited description | **Stage 4 Input:**<br>- `focusItem` (item name)<br>- `additionalInfo` (user description) | `analyze_focused_item.md`<br>or<br>`analyze_product.md` | ✅ Working |

**Evidence (analyze-image/index.ts lines 230-274):**
```typescript
prompt = await loadAndProcessPrompt('analyze_focused_item', {
  LANGUAGE: outputLanguage,
  FOCUS_ITEM: focusItem,
  ADDITIONAL_INFO: additionalInfo || ''
});
```

**Assessment:** ✅ Handoff preserves user context correctly

---

### C. Welfare Analysis → Ethical Lens (Stage 4 → Stage 5)

**Handoff:**

| Input | Output | Source of Truth | Broken/Missing |
|-------|--------|-----------------|----------------|
| **Stage 4 Output:**<br>- `productName`<br>- `animalIngredients` | **Stage 5 Input:**<br>- `PRODUCT_NAME`<br>- `ANIMAL_INGREDIENTS`<br>- `ETHICAL_LENS` (1-5) | `suggest_ethical_swap.md` | ✅ Working |

**Evidence (suggest-ethical-swap/index.ts lines 228-233):**
```typescript
const prompt = await loadAndProcessPrompt('suggest_ethical_swap', {
  PRODUCT_NAME: productName,
  ANIMAL_INGREDIENTS: animalIngredients,
  ETHICAL_LENS: ethicalLens.toString(),
  OUTPUT_LANGUAGE: outputLanguage,
});
```

**Assessment:** ✅ Clean handoff, no data loss

---

## 6. Ethical Lens Compliance Check

### Lens Gating Rules

| Lens | Allowed Suggestions | Forbidden Content | Enforcement Location |
|------|---------------------|-------------------|---------------------|
| **Lens 1** | High-welfare versions of SAME animal product | Plant-based, vegan, cultured meat | `suggest_ethical_swap.md` (lines 112-152)<br>`suggest-ethical-swap/index.ts` (lines 70-86) |
| **Lens 2** | Certified high-welfare animal products | Plant-based, vegan, cultured meat | `suggest_ethical_swap.md` (lines 154-188)<br>`suggest-ethical-swap/index.ts` (lines 88-99) |
| **Lens 3** | Hybrid/blended (plant + reduced animal) | Fully plant-based, 100% vegan | `suggest_ethical_swap.md` (lines 190-225)<br>`suggest-ethical-swap/index.ts` (lines 100-107) |
| **Lens 4** | 90%+ plant-based with trace animal | Fully vegan (reserve for Lens 5) | `suggest_ethical_swap.md` (lines 227-262)<br>`suggest-ethical-swap/index.ts` (lines 108-113) |
| **Lens 5** | ONLY fully vegan/cultured | Animal ingredients of any kind | `suggest_ethical_swap.md` (lines 264-291)<br>No validation (unrestricted) |

### Earlier-Stage Leakage Check

**Checked Prompts:**
- ✅ `analyze_user_material.md` - No ethical lens references (correct - Step 1 is detection only)
- ✅ `confirm_refine_items.md` - No ethical lens references (correct - Step 2 is refinement only)
- ✅ `analyze_product.md` - No ethical lens suggestions (correct - Stage 4 is welfare analysis only)
- ✅ `analyze_focused_item.md` - No ethical lens suggestions (correct - Stage 4 is welfare analysis only)

**Evidence:**
```bash
# Search for ethical lens keywords in Stage 1-4 prompts
grep -i "vegan\|plant-based\|ethical lens\|lens [0-9]" analyze_user_material.md
# (No matches - correct)

grep -i "vegan\|plant-based\|ethical lens\|lens [0-9]" confirm_refine_items.md
# (No matches - correct)

grep -i "vegan\|plant-based\|ethical lens\|lens [0-9]" analyze_product.md
# (No matches - correct)
```

**Assessment:** ✅ No ethical lens leakage detected. Gating is correctly enforced in Stage 5 only.

---

## 7. Quick Wins (Do-Not-Change Yet)

| Rank | File(s) | Change Summary | Risk | Impact |
|------|---------|----------------|------|--------|
| **#1** | `prompt-loader.ts` | Remove embedded prompts, always load from `/supabase/functions/_shared/prompts/` | **LOW** | **HIGH** - Eliminates drift, single source of truth |
| **#2** | `/science_and_ai_prompts/*.md` | Delete documentation duplicates OR add sync validation | **MEDIUM** | **HIGH** - Prevents doc/runtime divergence |
| **#3** | `analyze-image/index.ts` | Remove runtime user-context injection (lines 182-309), pass `ADDITIONAL_INFO` to templates only | **MEDIUM** | **MEDIUM** - Centralized context handling |
| **#4** | Create `user_context_template.md` | Extract shared user-context instructions into reusable fragment | **LOW** | **MEDIUM** - DRY principle |
| **#5** | `analyze_user_material.md` | Decide: Keep welfare details in Step 1 reasoning OR move to Stage 4 only | **MEDIUM** | **MEDIUM** - Clarifies stage boundaries |

---

## 8. Recommendations

### Immediate Actions (Before Authorizing Changes)

1. **Confirm Intentionality of Recent Changes**
   - ✅ Welfare details in Step 1 reasoning (lines 308-345 of `analyze_user_material.md`)
   - Was this intentional per user request? If yes, update stage responsibilities matrix.

2. **Document Current State**
   - ✅ This audit report serves as baseline
   - Create versioning strategy for prompts (currently only in `analyze-image/index.ts` lines 98-103)

3. **Test Prompt Changes**
   - If Quick Win #1 (remove embedded prompts) is approved, test with sample images first
   - Ensure `loadAndProcessPrompt()` correctly loads from files

### Long-Term Consolidation Plan

**Goal:** Single source of truth for all prompts

**Proposed Structure:**
```
/supabase/functions/_shared/prompts/
├── analyze_user_material.md      (Step 1: Detection)
├── confirm_refine_items.md        (Step 2: Refinement)
├── analyze_product.md             (Stage 4: Welfare analysis - single product)
├── analyze_focused_item.md        (Stage 4: Welfare analysis - focused from multi-item)
├── suggest_ethical_swap.md        (Stage 5: Ethical lens)
├── enrich_description.md          (Stage 1: Description enrichment - extract from inline)
└── fragments/
    └── user_context_template.md  (Shared user context instructions)

/science_and_ai_prompts/
├── README.md (overview + links to runtime prompts)
├── animal_ingredient_classification.md (reference documentation)
├── confidence_level_guidelines.md (reference documentation)
├── ethical_lens_criteria.md (reference documentation)
├── welfare_concerns_framework.md (reference documentation)
└── production_system_methodology.md (reference documentation)
```

**Rationale:**
- Runtime prompts in `/supabase/functions/_shared/prompts/` (versioned, deployed)
- Documentation/reference in `/science_and_ai_prompts/` (not duplicated runtime prompts)
- Shared fragments for reusable sections
- Clear separation of operational vs. reference content

---

## 9. Conclusion

The Welfare Footprint App's AI prompt system is **well-architected at the stage level** (clear separation of detection, refinement, welfare analysis, and ethical lens), but suffers from **operational duplication** that creates maintenance burden and drift risk.

**Strengths:**
- ✅ Two-step detection pipeline correctly separated
- ✅ Ethical lens gating correctly enforced
- ✅ No cross-stage contamination detected
- ✅ Schema alignment is consistent

**Weaknesses:**
- ⚠️ Duplicate prompt files in 2 locations (docs + runtime)
- ⚠️ Embedded prompts diverged from source files
- ⚠️ User context injection duplicated 6 times
- ⚠️ Recent welfare details addition to Step 1 blurs stage boundaries (if unintentional)

**Critical Next Step:**  
Before authorizing changes, confirm whether the welfare details in Step 1 reasoning (added per user request on 2025-10-29) should be preserved or reverted. This decision will inform the consolidation strategy.

---

## Appendix: Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-29 | Initial audit report | Lovable AI |

---

## Appendix: References

**Prompt Files Analyzed:**
- `/science_and_ai_prompts/` (10 files)
- `/supabase/functions/_shared/prompts/` (5 files)
- `/supabase/functions/_shared/prompt-loader.ts` (embedded prompts)
- `/supabase/functions/enrich-description/index.ts` (inline prompt)
- `/supabase/functions/analyze-image/index.ts` (runtime context injection)
- `/supabase/functions/suggest-ethical-swap/index.ts` (lens validation)

**Total Lines Analyzed:** ~4,500+ lines of prompt content across 23 sources
