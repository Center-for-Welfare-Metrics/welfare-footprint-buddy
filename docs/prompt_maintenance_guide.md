# Prompt Maintenance Guide

## Overview

The Welfare Footprint application uses AI prompts at multiple stages of its pipeline to analyze food items, assess welfare impact, and suggest ethical alternatives. This guide explains how prompts are organized, loaded, and maintained.

## Architecture Constraint: Why Embedding?

**Supabase Edge Functions run on Deno Deploy**, which is a distributed edge runtime that:
- Does **not provide filesystem access** at runtime
- Requires all code and resources to be **bundled at deployment time**
- Optimizes for cold-start performance and global distribution

Because of this constraint, we cannot read `.md` files dynamically when an Edge Function executes. Instead, we must **embed prompt content as strings** in TypeScript files that get bundled with the function code.

## The Prompt Loader Pattern

### Components

The prompt loading system consists of three main components:

#### 1. **Markdown Files** (Authoring Copies)
- **Location**: `supabase/functions/_shared/prompts/*.md`
- **Purpose**: Human-readable, version-controlled prompt content
- **Role**: Documentation and authoring interface

#### 2. **Embedded Strings** (Runtime Source of Truth)
- **Location**: `supabase/functions/_shared/prompt-loader.ts`
- **Objects**:
  - `FRAGMENTS`: Reusable prompt pieces (e.g., user context template)
  - `PROMPTS`: Complete prompt templates, embedded as strings
  - `PROMPT_VERSIONS`: Version identifiers for each prompt
- **Purpose**: The actual prompt content used at runtime

#### 3. **Loader Functions**
- `loadFragment(name)`: Returns a fragment by name
- `loadPromptTemplate(name)`: Returns a prompt template by name
- `loadAndProcessPrompt(name, variables)`: Main entry point that:
  1. Loads the prompt template
  2. Processes `{{INCLUDE:fragment_name}}` directives
  3. Substitutes `{{VARIABLE}}` placeholders
  4. Handles `{{#if VARIABLE}}...{{/if}}` conditionals
  5. Returns the final processed prompt string

## Current Prompts

### 1. `analyze_user_material`
- **Used by**: `analyze-image` (detect mode)
- **Purpose**: Initial detection and listing of food items from user images or text
- **Stage**: Detection (Stage 3)
- **Output**: List of detected items with brief descriptions

### 2. `confirm_refine_items`
- **Used by**: `analyze-image` (refine mode)
- **Purpose**: Refine the detected items based on user feedback
- **Stage**: Detection refinement (Stage 3)
- **Output**: Updated list of items after user confirms/modifies

### 3. `analyze_product`
- **Used by**: `analyze-image` (analyze mode)
- **Purpose**: Deep classification of ingredients and welfare assessment
- **Stage**: Welfare analysis (Stage 4)
- **Output**: Detailed welfare scores and ingredient classifications

### 4. `analyze_focused_item`
- **Used by**: `analyze-image` (analyze mode, single item)
- **Purpose**: Deep dive analysis of one selected item
- **Stage**: Welfare analysis (Stage 4)
- **Output**: Comprehensive welfare assessment for the item

### 5. `suggest_ethical_swap`
- **Used by**: `suggest-ethical-swap`
- **Purpose**: Generate ethical alternative suggestions based on user's ethical lens
- **Stage**: Ethical lens suggestions (Stage 5)
- **Output**: Contextual, actionable swap suggestions

### 6. `enrich_description`
- **Used by**: `enrich-description`
- **Purpose**: Transform brief user-provided food descriptions into informative summaries
- **Stage**: Pre-detection enrichment
- **Output**: Enhanced description with cultural/contextual details

## How to Safely Update a Prompt

### Example 1: Updating `suggest_ethical_swap`

Let's say you want to improve the ethical swap suggestions to be more specific.

#### Step 1: Edit the `.md` file
```bash
# Open the markdown file
supabase/functions/_shared/prompts/suggest_ethical_swap.md
```

Make your changes. For example, add a new rule:
```markdown
## CRITICAL RULES:
...
9. Always mention specific brands when available
```

#### Step 2: Copy to `prompt-loader.ts`
Open `supabase/functions/_shared/prompt-loader.ts` and find:

```typescript
const PROMPTS: Record<string, string> = {
  suggest_ethical_swap: `...`,
  // other prompts
};
```

Replace the **entire string** inside the backticks with your updated content from the `.md` file.

⚠️ **Critical**: Make sure to preserve:
- Variable placeholders like `{{USER_CONTEXT}}`
- Fragment inclusions like `{{INCLUDE:user_context_template}}`
- Conditional blocks like `{{#if ETHICAL_LENS}}...{{/if}}`

#### Step 3: Update the version
Find the `PROMPT_VERSIONS` object:

```typescript
const PROMPT_VERSIONS: Record<string, string> = {
  suggest_ethical_swap: \"v1.1\", // Changed from v1.0
  // other versions
};
```

Increment the version to help with debugging and cache invalidation.

#### Step 4: Test
```bash
# The function will be auto-deployed to preview
# Test with various inputs:
# - Different food items
# - Different ethical lenses
# - Edge cases
```

Check the Edge Function logs for any errors or unexpected behavior.

### Example 2: Adding a New Prompt

If you need to create a new prompt (e.g., for a new AI stage):

#### Step 1: Create the `.md` file
```bash
supabase/functions/_shared/prompts/my_new_prompt.md
```

Write your prompt content with any necessary variable placeholders.

#### Step 2: Add to `prompt-loader.ts`

Add to `PROMPTS`:
```typescript
const PROMPTS: Record<string, string> = {
  // existing prompts...
  my_new_prompt: `[paste your prompt content here]`,
};
```

Add to `PROMPT_VERSIONS`:
```typescript
const PROMPT_VERSIONS: Record<string, string> = {
  // existing versions...
  my_new_prompt: \"v1.0\",
};
```

#### Step 3: Use in your Edge Function
```typescript
import { loadAndProcessPrompt } from \"../_shared/prompt-loader.ts\";

const prompt = await loadAndProcessPrompt(\"my_new_prompt\", {
  VARIABLE_NAME: \"value\",
});
```

## Variable Substitution

The loader supports three types of template processing:

### 1. Simple Variables
```markdown
The user prefers {{LANGUAGE}} language.
```

Usage:
```typescript
await loadAndProcessPrompt(\"prompt_name\", {
  LANGUAGE: \"Spanish\"
});
// Result: \"The user prefers Spanish language.\"
```

### 2. Conditional Blocks
```markdown
{{#if ETHICAL_LENS}}
The user follows {{ETHICAL_LENS}} principles.
{{/if}}
```

Usage:
```typescript
// With value
await loadAndProcessPrompt(\"prompt_name\", {
  ETHICAL_LENS: \"vegan\"
});
// Result: \"The user follows vegan principles.\"

// Without value
await loadAndProcessPrompt(\"prompt_name\", {});
// Result: \"\" (block is removed)
```

### 3. Fragment Inclusion
```markdown
{{INCLUDE:user_context_template}}
```

This includes a reusable fragment defined in the `FRAGMENTS` object.

## Common Pitfalls

### ❌ Editing only the `.md` file
**Problem**: Changes won't take effect because runtime uses `prompt-loader.ts`

**Solution**: Always update both the `.md` file AND `prompt-loader.ts`

### ❌ Breaking variable placeholders
**Problem**: Accidentally changing `{{VARIABLE}}` to `{VARIABLE}` or removing it

**Solution**: Use search/replace carefully and test thoroughly

### ❌ Forgetting to update version
**Problem**: Cached responses may cause confusion during debugging

**Solution**: Always increment `PROMPT_VERSIONS` when changing a prompt

### ❌ Desynchronizing `.md` and embedded strings
**Problem**: `.md` file shows different content than what's actually running

**Solution**: Always copy the exact content from `.md` to `prompt-loader.ts`

## Debugging Tips

### Check which prompt version is running
Look at AI response cache entries or logs - they include `prompt_version` metadata.

### Validate prompt output
Add temporary logging in your Edge Function:
```typescript
const prompt = await loadAndProcessPrompt(\"my_prompt\", variables);
console.log(\"Generated prompt:\", prompt);
```

### Test with minimal examples
Start with simple, controlled inputs before testing complex scenarios.

## Future Enhancements

Potential improvements to this system (not yet implemented):

1. **Automated sync validation**: A script to detect when `.md` files and `prompt-loader.ts` are out of sync
2. **Prompt version auditing**: Track which prompt versions are used in production
3. **A/B testing framework**: Test prompt variations with real users
4. **Prompt performance metrics**: Measure quality and cost per prompt version

## Questions or Issues?

If you encounter problems with prompts:
1. Check the Edge Function logs in Lovable Cloud
2. Review the prompt content in `prompt-loader.ts` (not just `.md`)
3. Verify variable substitution is working correctly
4. Test with simplified inputs to isolate the issue

For architectural questions, refer to:
- `docs/architecture_overview.md`
- `docs/two_step_detection_flow.md`
- `docs/ai_function_safety_layer.md`
