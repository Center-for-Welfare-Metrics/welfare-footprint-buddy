# Two-Step Detection Flow Implementation

## Overview

The detection and user correction flow has been refactored into a clean two-step process that separates visual detection from user refinement, improving modularity, auditability, and maintainability.

## Architecture

### Step 1: Visual Detection (`analyze_user_material.md`)
**Purpose:** Purely visual/OCR-based detection of food items from images  
**Input:** Image + Language  
**Output:** Items array + Summary  
**Mode:** `detect`  
**Prompt Version:** v1.6

**Key Changes:**
- Removed `USER_CORRECTION` parameter entirely
- Detection is now strictly visual/OCR/recipe-based
- No user override logic contaminating the detection step
- Added provenance fields: `source`, `parentDish`, `animalConfidence`

### Step 2: User Refinement (`confirm_refine_items.md`)
**Purpose:** Apply user corrections to initially detected items  
**Input:** Original Detection Results + User Correction + Language  
**Output:** Refined items array + userEdits log + Updated summary  
**Mode:** `refine`  
**Prompt Version:** v1.0

**Key Features:**
- Preserves original detection for auditability (uses `suppressedByUser` flag instead of deletion)
- Tracks all user actions in `userEdits` array
- Sets `source: "user_correction"` for modified/added items
- Sets `userEdited: true` flag for any user-modified items
- No vision required (text-only reasoning)

## Implementation Details

### Backend (`supabase/functions/analyze-image/index.ts`)

#### New Mode: `refine`
```typescript
const ALLOWED_MODES = ['detect', 'analyze', 'refine'] as const;
```

#### Input Validation
- Added `originalDetectionResults` parameter (JSON string)
- Validates that `refine` mode requires both `userCorrection` and `originalDetectionResults`

#### Processing Logic
```typescript
if (mode === 'refine') {
  // Load confirm_refine_items prompt
  prompt = await loadAndProcessPrompt('confirm_refine_items', {
    LANGUAGE: outputLanguage
  });
  
  // Inject context
  const refinementContext = `
ORIGINAL DETECTION RESULTS:
${originalDetectionResults}

USER CORRECTION:
${userCorrection}
`;
  
  prompt = refinementContext + '\n\n' + prompt;
  isTextOnlyMode = true; // No image needed
}
```

### Frontend (`src/pages/Index.tsx`)

#### Flow Changes

**OLD FLOW (Incorrect):**
```
Image → detect → descriptionConfirmation → detect again with userCorrection → items
```

**NEW FLOW (Correct):**
```
Image → detect → items (directly) → [optional] refine with user corrections
```

#### Key Function Updates

1. **`handleConfirmationNeeded`** - Now goes directly to item selection
   ```typescript
   setDetectedItems(items); // Store Step 1 results
   navigateToScreen('itemSelection'); // Skip description confirmation
   ```

2. **`handleItemReanalyze`** - Now calls Step 2 (refine mode)
   ```typescript
   const originalDetectionResults = JSON.stringify({
     items: detectedItems,
     summary: itemsSummary
   });
   
   await supabase.functions.invoke('analyze-image', {
     body: { 
       mode: 'refine', // Step 2
       userCorrection: userEditedDescription,
       originalDetectionResults
     }
   });
   ```

3. **Deprecated Functions** - Marked for future removal
   - `handleDescriptionConfirmed` - No longer re-detects
   - `handleConfirmationEdit` - No longer re-detects

## Output Schema

### Step 1 Output (detect mode)
```json
{
  "items": [
    {
      "name": "string",
      "likelyHasAnimalIngredients": boolean,
      "confidence": "High|Medium|Low",
      "animalConfidence": "High|Medium|Low",
      "source": "visual|ocr|recipe_inference",
      "parentDish": "string|null",
      "reasoning": "string"
    }
  ],
  "summary": "string"
}
```

### Step 2 Output (refine mode)
```json
{
  "items": [
    {
      "name": "string",
      "likelyHasAnimalIngredients": boolean,
      "confidence": "High|Medium|Low",
      "animalConfidence": "High|Medium|Low",
      "source": "visual|ocr|recipe_inference|user_correction",
      "parentDish": "string|null",
      "reasoning": "string",
      "suppressedByUser": boolean,  // NEW
      "userEdited": boolean          // NEW
    }
  ],
  "userEdits": [                      // NEW
    {
      "action": "add|rename|suppress|setClaim|modify",
      "target": "string",
      "details": "string"
    }
  ],
  "summary": "string"
}
```

## Verification Steps

### 1. Console Logs
Check for proper two-step flow in logs:
```
[analyze-image] Step 1: Detection mode (visual/OCR)
... (if user makes corrections) ...
[analyze-image] Step 2: Refinement mode (user corrections)
[Step 2] Refinement complete: { userEdits: [...], refinedItemCount: X }
```

### 2. Schema Compatibility
✅ `items[]` array - Present in both steps  
✅ `summary` field - Present in both steps  
✅ New fields backward compatible - `suppressedByUser`, `userEdited`, `userEdits` won't break existing UI

### 3. Language Propagation
- Language is captured from `i18n.language` in the frontend
- Passed in both Step 1 and Step 2 calls
- Converted to full language name in backend (e.g., "en" → "English")
- Applied to prompt template via `{{LANGUAGE}}` substitution

### 4. Audit Trail
Example audit log from Step 2:
```json
{
  "userEdits": [
    {
      "action": "add",
      "target": "Chicken breast",
      "details": "User added this ingredient"
    },
    {
      "action": "suppress",
      "target": "Anchovies",
      "details": "User removed this item"
    }
  ]
}
```

## Benefits

1. **Modularity** - Clean separation of concerns between detection and refinement
2. **Auditability** - Full history of user edits preserved in `userEdits` array
3. **Data Integrity** - Original detection never deleted, only marked as `suppressedByUser`
4. **Provenance** - Clear tracking of item source (`visual`, `ocr`, `recipe_inference`, `user_correction`)
5. **Performance** - Step 2 doesn't require image re-analysis (text-only)
6. **Maintainability** - Each prompt has single responsibility, easier to debug and improve

## Testing Checklist

- [ ] Upload image → verify Step 1 detection completes
- [ ] Check console for `[Step 1: Detection mode]` log
- [ ] Verify items display correctly in UI
- [ ] Edit items (add/remove) → verify Step 2 refinement called
- [ ] Check console for `[Step 2: Refinement mode]` log
- [ ] Verify `userEdits` array populated in response
- [ ] Confirm `suppressedByUser` items are filtered out in UI
- [ ] Test language propagation (change language, verify output in that language)
- [ ] Verify no errors for items without new fields (backward compatibility)

## Future Enhancements

1. **UI for userEdits** - Display audit log in a collapsible section
2. **Undo/Redo** - Allow users to revert specific edits using the audit trail
3. **Batch Refinement** - Support multiple correction iterations with full history
4. **Analytics** - Track which types of corrections are most common to improve Step 1
5. **Confidence Thresholds** - Auto-trigger refinement for low-confidence detections
