# AI Prompts Directory

This directory contains the authoring copies of AI prompts used throughout the Welfare Footprint application.

## ⚠️ Critical: Dual-Location Architecture

Due to Supabase Edge Functions' inability to read files at runtime, prompts exist in **TWO locations**:

| Location | Purpose | Used At |
|----------|---------|---------|
| `.md` files in this directory | Authoring, documentation, review | Development time |
| `PROMPTS` object in `prompt-loader.ts` | **Runtime execution** | Production |

### 🔴 RUNTIME SOURCE OF TRUTH

**The `PROMPTS` object in `supabase/functions/_shared/prompt-loader.ts` is the ONLY source used at runtime.**

The `.md` files are:
- **Authoring copies** for easier editing (proper syntax highlighting, markdown preview)
- **Human-readable documentation** for code reviews
- **Reference material** for understanding prompt logic

### ⚠️ Both Locations Must Stay in Sync

Any prompt change **MUST** be applied to:
1. The `.md` file in this directory
2. The corresponding entry in `prompt-loader.ts`

**If you only update the `.md` file, your changes will NOT take effect!**

## Safe Prompt Update Workflow

To update a prompt safely without breaking the application:

### 1. Edit the `.md` file
- Make your changes to the appropriate `.md` file in this directory
- Review the changes carefully
- Ensure all variable placeholders (e.g., `{{VARIABLE}}`) are preserved

### 2. Copy content to `prompt-loader.ts`
- Open `supabase/functions/_shared/prompt-loader.ts`
- Find the corresponding entry in the `PROMPTS` object
- Replace the entire embedded string with your updated content
- **Ensure exact match** - copy the complete content including formatting

### 3. Update the version
- Find the prompt name in the `PROMPT_VERSIONS` object
- Increment the version number (e.g., `"v1.0"` → `"v1.1"`)
- This helps with cache invalidation and debugging

### 4. Test thoroughly
- Run the affected Edge Function locally or in preview
- Verify the AI output matches expectations
- Check for any TypeScript/runtime errors
- Test with various inputs to ensure robustness

### 5. Deploy with confidence
- Once tested, your changes will be deployed automatically
- Monitor logs for any unexpected behavior

## Available Prompts

| Prompt Name | File | Used By | Purpose |
|------------|------|---------|---------|
| `analyze_user_material` | `analyze_user_material.md` | `analyze-image` | Initial detection of food items from images/text |
| `confirm_refine_items` | `confirm_refine_items.md` | `analyze-image` | Refine detected items based on user feedback |
| `analyze_product` | `analyze_product.md` | `analyze-image` | Classify ingredients and assess welfare impact |
| `analyze_focused_item` | `analyze_focused_item.md` | `analyze-image` | Deep analysis of a single selected item |
| `suggest_ethical_swap` | `suggest_ethical_swap.md` | `suggest-ethical-swap` | Generate ethical alternative suggestions |
| `enrich_description` | `enrich_description.md` | `enrich-description` | Transform brief descriptions into informative summaries |

## Dynamic Prompt Wrappers

Some edge functions add **dynamic wrappers** around the base prompts at runtime. These are intentional and include runtime-specific values that cannot be static:

| Function | Dynamic Logic | Purpose |
|----------|---------------|---------|
| `suggest-ethical-swap` | CoT wrapper for Lens 3 | Adds chain-of-thought reasoning with product-specific context |
| `suggest-ethical-swap` | System message per lens | Lens-specific rules (2=no portion-only, 3=vegetarian, 4=vegan) |
| `analyze-image` | User context prefixes | Injects user-provided descriptions with priority markers |

These dynamic wrappers are **not** candidates for centralization because they require runtime variable interpolation.

## Variable Substitution

Prompts support variable placeholders using the `{{VARIABLE_NAME}}` syntax. These are replaced at runtime by `loadAndProcessPrompt()`.

Common variables:
- `{{LANGUAGE}}` - User's preferred language
- `{{USER_CONTEXT}}` - User preferences and ethical lens
- `{{ETHICAL_LENS}}` - Active ethical framework

## Conditional Blocks

Prompts support conditional inclusion using:
```
{{#if VARIABLE_NAME}}
  Content shown if VARIABLE_NAME is truthy
{{/if}}
```

## Fragment Inclusion

Reusable prompt fragments can be included using:
```
{{INCLUDE:fragment_name}}
```

Fragments are defined in the `FRAGMENTS` object in `prompt-loader.ts`.

## Questions?

See `docs/prompt_maintenance_guide.md` for more detailed information about the prompt architecture and maintenance procedures.
