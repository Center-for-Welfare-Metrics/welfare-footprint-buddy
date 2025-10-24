# User Description Edit Fix

## Problem

When users edited the description in the DescriptionConfirmationScreen (e.g., changing "stew" to "feijoada"), the detected items list did not reflect this edit. The items shown were still based on the original AI-generated description.

**Example Issue:**
- Original detection: "The image contains a large pot of stew..."
- User edited to: "The stew is a feijoada"
- Items shown: Generic "Stew in large pot" (not decomposed as feijoada ingredients)

## Root Cause

The flow was:
1. Scanner calls backend in `detect` mode → returns summary + items
2. Items and summary stored in React state
3. User sees DescriptionConfirmationScreen, can edit description
4. User clicks confirm → only summary updated in state, same items shown
5. **User's edited description was ignored - items never regenerated**

## Solution

### Frontend Changes (src/pages/Index.tsx)

Updated `handleDescriptionConfirmed` to:
1. Check if user edited the description (different from original)
2. If edited, re-call backend in `detect` mode with edited description as `additionalInfo`
3. Update both items and summary with new detection results
4. If not edited, proceed directly to item selection

```typescript
const handleDescriptionConfirmed = async (confirmedDescription: string) => {
  // If user edited the description, re-detect items with new context
  if (confirmedDescription !== itemsSummary) {
    console.log('[Step 1→2] Description edited - re-analyzing');
    // Call backend with additionalInfo = confirmedDescription
    // Update items with new detection results
  }
  
  setItemsSummary(confirmedDescription);
  navigateToScreen('itemSelection');
};
```

### Backend Changes (supabase/functions/analyze-image/index.ts)

Updated `detect` mode to accept and use `additionalInfo`:
- When `additionalInfo` provided, inject it as authoritative user context
- Instructs AI to use user description as ground truth
- AI decompose dishes mentioned by user (e.g., "feijoada" → beans, pork, sausage, etc.)
- Combines user context with visual analysis

```typescript
if (mode === 'detect' && additionalInfo && additionalInfo.trim()) {
  const userDescriptionContext = `
    User-provided description: "${additionalInfo}"
    
    Use this as ground truth. If user mentions specific dishes,
    decompose according to traditional recipes.
  `;
  
  prompt = userDescriptionContext + prompt;
}
```

## User Flow After Fix

1. **Upload image** → Backend detects items and generates description
2. **Review description** → User sees AI-generated description
3. **Edit description** (optional) → User adds context like "The stew is a feijoada"
4. **Confirm** → If edited, backend re-analyzes with user's description as context
5. **View items** → Items now reflect user's description (feijoada ingredients instead of generic stew)

## Benefits

✅ User corrections are now respected  
✅ Cultural/regional dish knowledge can be provided by users  
✅ More accurate item decomposition based on user expertise  
✅ Maintains auditability - user's description is logged as additional context  

## Testing Checklist

- [x] Upload image of Brazilian feijoada
- [x] Verify generic description generated
- [x] Edit description to specify "feijoada"
- [x] Confirm items list updates with feijoada-specific ingredients
- [x] Verify no re-detection if description unchanged
- [x] Check loading states during re-analysis
- [x] Test error handling if re-analysis fails
