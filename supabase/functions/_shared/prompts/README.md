# AI Prompts Directory

This directory contains the authoring copies of AI prompts used throughout the Welfare Footprint application.

## ⚠️ Important: Source of Truth

**The embedded strings in `prompt-loader.ts` are the RUNTIME SOURCE OF TRUTH for all prompts.**

The `.md` files in this directory serve as:
- **Human-readable documentation** of prompt content
- **Authoring copies** for easier editing and review
- **Reference material** for understanding prompt logic

However, **Supabase Edge Functions cannot read files at runtime**. Therefore, all prompts must be embedded as strings in `prompt-loader.ts` to be used by the application.

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
