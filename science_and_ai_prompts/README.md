# Science and AI Prompts

Welcome! This folder contains the scientific and AI logic that powers the Welfare Footprint app's ability to analyze food products and provide welfare information.

## What's Inside

This folder contains two types of files:

1. **AI Prompt Templates** - Instructions that tell the AI how to analyze food products and detect animal ingredients
2. **Scientific Guidelines** - Rules and frameworks that ensure the AI's analysis is scientifically sound and transparent

## Why This Matters

By keeping these files separate from code, we ensure:

- **Transparency** - Anyone can review how the AI makes decisions
- **Easy Updates** - Scientists can improve the analysis without programming knowledge
- **Version Tracking** - Every change is documented in the project history
- **Shareability** - The prompts and criteria can be published in research papers
- **Flexibility** - The same templates work with different AI models

## File Structure

Each prompt file follows this structure:

```
================================================================================
PROMPT: [Prompt Name]
================================================================================

PURPOSE:
[Description of what this prompt does]

EXPECTED INPUTS:
- Input 1: Description
- Input 2: Description
...

EXPECTED OUTPUT FORMAT:
[JSON schema or output format description]

MODEL COMPATIBILITY:
[Which AI models this works with]

VERSIONING:
Version X.X - [Description]
Last updated: YYYY-MM-DD

================================================================================
PROMPT TEXT BEGINS BELOW:
================================================================================

[Actual prompt text that gets sent to the AI model]
```

## Files in This Folder

### AI Prompt Templates

These files contain instructions that guide the AI when analyzing food products:

#### [detect_items.md](detect_items.md)
Helps the AI identify when a photo contains multiple food items (like a grocery haul or meal with several dishes). The AI lists each item it finds and performs a quick check for animal-derived ingredients.

#### [analyze_product.md](analyze_product.md)
The main analysis tool. When you scan a single product, this prompt guides the AI to examine:
- What the product is
- Which animal ingredients it contains
- How those animals were likely raised
- What welfare concerns might exist

#### [analyze_focused_item.md](analyze_focused_item.md)
Used when you select one specific item from a multi-item photo. The AI focuses only on that item and ignores the rest of the image.

#### [suggest_ethical_swap.md](suggest_ethical_swap.md)
Recommends alternative products based on your welfare priorities. If you want to reduce animal suffering, this prompt helps the AI suggest better options that align with your values.

### Scientific Guidelines

These files define the scientific rules and frameworks the AI follows:

#### [animal_ingredient_classification.md](animal_ingredient_classification.md)
Explains how the AI categorizes ingredients as animal-derived or plant-based. Includes guidelines for ambiguous cases and common food additives.

#### [confidence_level_guidelines.md](confidence_level_guidelines.md)
Defines when the AI should be "highly confident," "moderately confident," or express "low confidence" in its analysis. This ensures honest communication about uncertainty.

#### [ethical_lens_criteria.md](ethical_lens_criteria.md)
Describes the five ethical perspectives users can choose from (ranging from "reduce the worst suffering" to "avoid all animal products"). The AI uses this to tailor recommendations.

#### [production_system_methodology.md](production_system_methodology.md)
Guidelines for how the AI infers production systems (conventional, free-range, organic, etc.) from labels, certifications, or product descriptions.

#### [welfare_concerns_framework.md](welfare_concerns_framework.md)
The core scientific framework that connects animal species, production systems, and specific welfare issues (like space restrictions, painful procedures, or separation from offspring).

## Template Variables

Prompts support template variables using `{{VARIABLE_NAME}}` syntax:

### Simple Variables
```
{{LANGUAGE}} - Output language (e.g., "English", "Spanish")
{{FOCUS_ITEM}} - Specific item to analyze (e.g., "Crispy chicken stir-fry")
{{USER_CORRECTION}} - User's correction to AI interpretation
```

### Conditional Blocks
```
{{#if VARIABLE_NAME}}
  This content only appears if VARIABLE_NAME is truthy
{{/if}}
```

## Usage in Code

### Loading a Prompt

```typescript
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

// Load with variables
const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: 'English',
  USER_CORRECTION: 'This is tofu, not chicken'
});
```

### In Edge Functions

The `analyze-image` edge function automatically loads the appropriate prompt based on mode:

- `mode: 'detect'` → `detect_items.md`
- `mode: 'analyze'` with `focusItem` → `analyze_focused_item.md`
- `mode: 'analyze'` without `focusItem` → `analyze_product.md`

## How to Update These Files

If you're a scientist or researcher who wants to improve the AI's logic:

1. Open any `.md` file in this folder
2. Make your edits directly in the text
3. Save the file
4. The changes will automatically apply the next time the app is updated

**No programming required!** These files are written in plain language and can be edited like regular documents.

**What to document:**
- Add notes about any significant changes you make
- Update version numbers when appropriate
- Test your changes with a variety of products before finalizing

## For Researchers and Publications

All files in this folder are designed to be:
- **Citable** - Reference specific versions using git commit history
- **Exportable** - Copy and paste directly into research papers
- **Transparent** - Every assumption and decision rule is documented

You can use these files to show exactly how the Welfare Footprint methodology works, making the science fully reproducible.

## Model-Specific Considerations

While prompts are model-agnostic, be aware of:

- **Token Limits** - Different models have different context windows
- **JSON Mode** - Some models require `response_mime_type: "application/json"`
- **Temperature** - May need adjustment per model for consistency
- **Vision Capabilities** - Ensure model supports image input

## Troubleshooting

### Prompt Not Loading
- Check file path in `prompt-loader.ts`
- Verify file exists in `/science_and_ai_prompts` directory
- Check for syntax errors in template variables

### Variables Not Substituting
- Ensure variable name matches exactly (case-sensitive)
- Check for typos in `{{VARIABLE_NAME}}`
- Verify variable is passed in the variables object

### Unexpected Output
- Review prompt clarity and specificity
- Check JSON schema requirements
- Test with multiple images
- Consider model-specific behavior

## Adding New Files

If you want to create a new prompt or guideline:

1. Create a new `.md` file with a descriptive name
2. Look at existing files to see the standard format
3. Add a clear header explaining what the file does
4. Update this README to include your new file in the appropriate section
5. Test your changes to make sure everything works
6. Save and commit your work

If you're not sure how to do this, ask a developer for help!

## Version History

- **v1.2** (2025-10-21) - Converted all prompt files from .txt to .md format with Markdown formatting
- **v1.1** (2025-01-21) - Added ethical swap suggestions prompt
  - [suggest_ethical_swap.md](suggest_ethical_swap.md) - Ethical product alternatives based on user's welfare priorities
- **v1.0** (2025-10-10) - Initial implementation with three core prompts
  - [detect_items.md](detect_items.md) - Multi-item detection
  - [analyze_product.md](analyze_product.md) - Standard product analysis  
  - [analyze_focused_item.md](analyze_focused_item.md) - Focused item analysis
