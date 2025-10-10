# AI Prompt Templates

This directory contains all AI prompt templates used by the Welfare Footprint application. These prompts are model-agnostic and can be used with any vision-capable language model (Gemini, GPT-4 Vision, Claude with vision, etc.).

## Purpose

Storing prompts in separate text files provides several benefits:

1. **Transparency** - All prompts are visible and easily reviewable
2. **Version Control** - Changes to prompts are tracked in git history
3. **Easy Editing** - Update prompts without modifying code
4. **Research & Publication** - Simple to export/share prompt text
5. **Model Agnostic** - Same prompts work across different AI providers
6. **Documentation** - Each file includes metadata about its purpose and expected I/O

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

## Available Prompts

### 1. detect_items.txt
**Purpose:** Multi-item detection and categorization  
**Use Case:** When user uploads an image that may contain multiple products  
**Output:** JSON array of detected items with animal ingredient analysis  

### 2. analyze_product.txt
**Purpose:** Comprehensive welfare analysis of a single product  
**Use Case:** Standard single-item analysis or when user confirms interpretation  
**Output:** Detailed JSON with welfare assessment  

### 3. analyze_focused_item.txt
**Purpose:** Focused analysis of specific item from multi-item image  
**Use Case:** User selects one item from detection results to analyze  
**Output:** Same as analyze_product.txt but focused on specified item  

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

- `mode: 'detect'` → `detect_items.txt`
- `mode: 'analyze'` with `focusItem` → `analyze_focused_item.txt`
- `mode: 'analyze'` without `focusItem` → `analyze_product.txt`

## Modifying Prompts

To update a prompt:

1. Edit the `.txt` file directly in the `/prompts` folder
2. Changes take effect immediately on next deployment
3. No code changes required
4. Git tracks all modifications for version control

**Best Practices:**
- Test prompt changes with diverse images
- Document significant changes in the VERSION section
- Keep prompts model-agnostic (avoid model-specific instructions)
- Maintain clear, structured output requirements

## Exporting for Research

To export a prompt for publication or research:

1. Copy the text from `PROMPT TEXT BEGINS BELOW:` onward
2. Or use the entire file to include metadata
3. Reference the git commit hash for exact versioning

## Model-Specific Considerations

While prompts are model-agnostic, be aware of:

- **Token Limits** - Different models have different context windows
- **JSON Mode** - Some models require `response_mime_type: "application/json"`
- **Temperature** - May need adjustment per model for consistency
- **Vision Capabilities** - Ensure model supports image input

## Troubleshooting

### Prompt Not Loading
- Check file path in `prompt-loader.ts`
- Verify file exists in `/prompts` directory
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

## Contributing

When adding new prompts:

1. Create a new `.txt` file in `/prompts`
2. Follow the standard structure (copy from existing file)
3. Add comprehensive metadata in the header
4. Update this README with the new prompt
5. Test thoroughly before committing
6. Update `prompt-loader.ts` if needed

## Version History

- **v1.0** (2025-10-10) - Initial implementation with three core prompts
  - detect_items.txt - Multi-item detection
  - analyze_product.txt - Standard product analysis  
  - analyze_focused_item.txt - Focused item analysis
