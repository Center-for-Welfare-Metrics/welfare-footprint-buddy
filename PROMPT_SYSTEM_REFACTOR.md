# Prompt System Refactoring - Summary

## Overview

The Welfare Footprint application has been refactored to use a **model-agnostic prompt system** where all AI prompts are stored in separate, editable text files rather than hardcoded in the application code.

## What Changed

### Before Refactoring
- Prompts were embedded directly in `supabase/functions/analyze-image/index.ts`
- Required code changes to update prompts
- Difficult to version and export prompts
- Model-specific structure mixed with prompt content

### After Refactoring
- All prompts stored in `/science_and_ai_prompts` directory as `.md` files
- Prompts can be updated without touching code
- Full version control and documentation
- Model-agnostic design works with any vision AI
- Easy to export for research/publication

## New File Structure

```
science_and_ai_prompts/
├── README.md                    # Overview and documentation
├── USAGE_GUIDE.md              # Detailed usage instructions
├── analyze_user_material.md    # Multi-item detection prompt
├── analyze_product.md          # Standard product analysis prompt
└── analyze_focused_item.md     # Focused item analysis prompt

supabase/functions/_shared/
└── prompt-loader.ts            # Utility to load and process prompts

supabase/functions/analyze-image/
└── index.ts                    # Updated to use prompt system
```

## Key Features

### 1. Model-Agnostic Design
The same prompt files work with:
- Google Gemini (current implementation)
- OpenAI GPT-4 Vision
- Anthropic Claude with Vision
- Any other vision-capable LLM

### 2. Template Variable System
Prompts support dynamic variables:

**Simple substitution:**
```
Respond in {{LANGUAGE}} language.
```

**Conditional blocks:**
```
{{#if USER_CORRECTION}}
User provided this correction: "{{USER_CORRECTION}}"
{{/if}}
```

### 3. Comprehensive Documentation
Each prompt file includes:
- Purpose and use case
- Expected inputs and outputs
- JSON schema specifications
- Model compatibility notes
- Version history

### 4. Easy to Export
Copy prompt text directly from files for:
- Research papers
- Documentation
- Sharing with collaborators
- Publishing methodology

## How to Use

### Load a Prompt in Code

```typescript
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

const prompt = await loadAndProcessPrompt('analyze_user_material', {
  LANGUAGE: 'English',
  USER_CORRECTION: userInput
});
```

### Update a Prompt

1. Edit the `.md` file in `/science_and_ai_prompts` directory
2. Changes apply on next deployment
3. No code changes needed

### Add a New Prompt

1. Create new `.md` file in `/science_and_ai_prompts`
2. Follow the standard header format
3. Write your prompt
4. Use `loadAndProcessPrompt('your_prompt_name', variables)`

## Available Prompts

### analyze_user_material.md
- **Purpose:** Detect all items in an image
- **Output:** JSON array of items with animal ingredient analysis
- **Variables:** `LANGUAGE`, `USER_CORRECTION`

### analyze_product.md
- **Purpose:** Comprehensive welfare analysis of a product
- **Output:** Detailed JSON with welfare assessment
- **Variables:** `LANGUAGE`

### analyze_focused_item.md
- **Purpose:** Analyze specific item from multi-item image
- **Output:** Same as analyze_product but focused
- **Variables:** `LANGUAGE`, `FOCUS_ITEM`

## Benefits

### For Developers
✅ **Separation of Concerns** - Prompts separate from code logic  
✅ **Easy Testing** - Test prompt changes without rebuilding  
✅ **Type Safety** - Template variables validated at runtime  
✅ **Version Control** - Track all prompt changes in git  

### For Researchers
✅ **Transparency** - All prompts are visible and documented  
✅ **Reproducibility** - Exact prompts used can be shared  
✅ **Easy Export** - Simple copy/paste for publications  
✅ **Versioning** - Track prompt evolution over time  

### For Users
✅ **Better Results** - Easier to improve prompts based on feedback  
✅ **Multi-Language** - Simple to adjust language handling  
✅ **Consistency** - Same prompts ensure reliable behavior  
✅ **Transparency** - Users can see exactly what AI is asked  

## Migration Notes

### Functionality Preserved
The refactoring maintains **100% identical functionality**:
- Same detection logic
- Same analysis depth
- Same output format
- Same language support
- Same error handling

### No Breaking Changes
- API interface unchanged
- Frontend code unchanged
- Database schema unchanged
- Environment variables unchanged

## Technical Implementation

### Prompt Loading Flow

```
1. Edge function receives request
   ↓
2. Determines which prompt to use (detect/analyze/focused)
   ↓
3. Calls loadAndProcessPrompt(name, variables)
   ↓
4. Prompt loader:
   - Reads .md file from /science_and_ai_prompts
   - Extracts prompt text (removes metadata)
   - Substitutes template variables
   ↓
5. Returns processed prompt
   ↓
6. Sends to AI model with image
```

### Variable Substitution

```typescript
// Template
"Respond in {{LANGUAGE}} language."

// Variables
{ LANGUAGE: 'Spanish' }

// Result
"Respond in Spanish language."
```

### Conditional Logic

```typescript
// Template
"{{#if VAR}}Include this{{/if}}"

// With VAR = 'value'
"Include this"

// With VAR = undefined
""
```

## Future Enhancements

Potential improvements to the system:

1. **Prompt A/B Testing** - Compare different prompt versions
2. **Multi-Model Support** - Automatically adapt prompts per model
3. **Prompt Analytics** - Track which prompts perform best
4. **Hot Reloading** - Update prompts without redeployment
5. **Prompt Marketplace** - Share community-created prompts
6. **Validation** - Automated testing of prompt outputs

## Documentation

- **[/science_and_ai_prompts/README.md](./science_and_ai_prompts/README.md)** - Prompt system overview
- **[/science_and_ai_prompts/USAGE_GUIDE.md](./science_and_ai_prompts/USAGE_GUIDE.md)** - Detailed usage guide
- **[Prompt Files](./science_and_ai_prompts/)** - Individual prompt templates

## Testing

All prompts have been tested to ensure:
- Variables substitute correctly
- Conditional logic works as expected
- Output matches expected JSON schema
- Multi-language support functions properly
- Model compatibility (tested with Gemini)

## Credits

This refactoring implements best practices for:
- Prompt engineering transparency
- Scientific reproducibility
- Software maintainability
- Open research principles

---

**Last Updated:** 2025-10-10  
**Version:** 1.0  
**Status:** ✅ Complete and Production-Ready
