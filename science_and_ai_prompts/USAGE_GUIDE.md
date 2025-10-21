# Prompt System Usage Guide

This guide explains how to use and extend the model-agnostic prompt system in the Welfare Footprint application.

## Quick Start

### Using Existing Prompts

The simplest way to use a prompt is through the `loadAndProcessPrompt` function:

```typescript
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

// Load a prompt with variables
const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: 'English',
  USER_CORRECTION: undefined // optional variable
});

// Use the prompt in your AI API call
const response = await yourAIProvider(prompt, imageData);
```

### Available Functions

#### `loadAndProcessPrompt(promptName, variables)`
The main function you'll use. It:
1. Loads the prompt template from file
2. Extracts only the prompt text (removes metadata)
3. Substitutes template variables
4. Returns the ready-to-use prompt

```typescript
const prompt = await loadAndProcessPrompt('analyze_product', {
  LANGUAGE: 'Spanish',
  FOCUS_ITEM: 'Chicken stir-fry'
});
```

#### `loadPromptTemplate(promptName)`
Loads the raw template file (includes all metadata):

```typescript
const template = await loadPromptTemplate('detect_items');
// Returns entire file content including headers
```

#### `extractPromptText(promptContent)`
Extracts just the prompt portion from a full template:

```typescript
const fullTemplate = await loadPromptTemplate('detect_items');
const promptOnly = extractPromptText(fullTemplate);
// Returns only text after "PROMPT TEXT BEGINS BELOW:"
```

#### `substituteVariables(template, variables)`
Replaces template variables in a string:

```typescript
const processed = substituteVariables(template, {
  LANGUAGE: 'French',
  USER_CORRECTION: 'Actually this is tofu'
});
```

## Template Variable Syntax

### Simple Substitution

Use `{{VARIABLE_NAME}}` for basic text replacement:

```
Respond in {{LANGUAGE}} language.
```

With variables `{ LANGUAGE: 'Spanish' }` becomes:
```
Respond in Spanish language.
```

### Conditional Blocks

Use `{{#if VARIABLE_NAME}}...{{/if}}` for optional content:

```
{{#if USER_CORRECTION}}
USER CORRECTION:
The user has provided this correction:
"{{USER_CORRECTION}}"
{{/if}}
```

With variables `{ USER_CORRECTION: 'This is tofu' }`:
```
USER CORRECTION:
The user has provided this correction:
"This is tofu"
```

With variables `{ USER_CORRECTION: undefined }`:
```
[content removed entirely]
```

### Variable Types

Variables can be:
- **String**: `{ LANGUAGE: 'English' }`
- **Boolean**: `{ HAS_CORRECTION: true }`
- **Undefined**: `{ OPTIONAL_VAR: undefined }` (removed from output)

## Creating New Prompts

### Step 1: Create the Prompt File

Create a new `.md` file in the `/science_and_ai_prompts` directory:

```bash
touch science_and_ai_prompts/my_new_prompt.md
```

### Step 2: Add the Standard Header

```
================================================================================
PROMPT: [Your Prompt Name]
================================================================================

PURPOSE:
[Clear description of what this prompt does]

EXPECTED INPUTS:
- Input 1: Description and format
- Input 2: Description and format

EXPECTED OUTPUT FORMAT:
[JSON schema or description of expected response]

MODEL COMPATIBILITY:
[Which models this works with - usually "any vision-capable LLM"]

VERSIONING:
Version 1.0 - Initial implementation
Last updated: YYYY-MM-DD

================================================================================
PROMPT TEXT BEGINS BELOW:
================================================================================
```

### Step 3: Write Your Prompt

After the header, write your actual prompt text:

```
You are an expert in [domain].

TASK:
Analyze the provided image and [specific instructions].

{{#if VARIABLE_NAME}}
[Optional content based on variable]
{{/if}}

OUTPUT FORMAT:
Return valid JSON with this structure:
{
  "field1": "value",
  "field2": "value"
}

LANGUAGE REQUIREMENT:
Respond in {{LANGUAGE}} language.
```

### Step 4: Use the New Prompt

```typescript
const prompt = await loadAndProcessPrompt('my_new_prompt', {
  LANGUAGE: 'English',
  VARIABLE_NAME: 'some value'
});
```

## Real-World Examples

### Example 1: Multi-Language Detection

```typescript
// Support multiple languages dynamically
const languageMap = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French'
};

const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: languageMap[userLanguageCode]
});
```

### Example 2: Conditional User Input

```typescript
// Only include user correction if provided
const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: 'English',
  USER_CORRECTION: userProvidedCorrection || undefined
});
```

### Example 3: Focused Analysis

```typescript
// Analyze specific item from multi-item image
const prompt = await loadAndProcessPrompt('analyze_focused_item', {
  LANGUAGE: 'English',
  FOCUS_ITEM: selectedItemName
});
```

## Model-Specific Adaptations

While prompts are model-agnostic, you may need to adapt the API call:

### For Gemini

```typescript
const prompt = await loadAndProcessPrompt('detect_items', { LANGUAGE: 'English' });

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  }
);
```

### For OpenAI GPT-4 Vision

```typescript
const prompt = await loadAndProcessPrompt('detect_items', { LANGUAGE: 'English' });

const response = await fetch(
  'https://api.openai.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      response_format: { type: 'json_object' }
    })
  }
);
```

### For Claude (Anthropic)

```typescript
const prompt = await loadAndProcessPrompt('detect_items', { LANGUAGE: 'English' });

const response = await fetch(
  'https://api.anthropic.com/v1/messages',
  {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }]
    })
  }
);
```

## Testing Prompts

### Manual Testing

1. Load the prompt with test variables
2. Log the output to verify variable substitution
3. Send to AI model with test images
4. Verify JSON structure matches expected format

```typescript
// Test prompt loading
const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: 'English',
  USER_CORRECTION: 'Test correction'
});

console.log('Generated prompt:', prompt);
// Manually inspect to ensure variables are substituted correctly
```

### Automated Testing

Create test cases for your prompts:

```typescript
Deno.test("detect_items prompt loads correctly", async () => {
  const prompt = await loadAndProcessPrompt('detect_items', {
    LANGUAGE: 'English'
  });
  
  assert(prompt.includes('English'));
  assert(!prompt.includes('{{LANGUAGE}}'));
  assert(prompt.length > 100); // Has substantial content
});

Deno.test("conditional content works", async () => {
  const withCorrection = await loadAndProcessPrompt('detect_items', {
    LANGUAGE: 'English',
    USER_CORRECTION: 'Test'
  });
  
  const withoutCorrection = await loadAndProcessPrompt('detect_items', {
    LANGUAGE: 'English'
  });
  
  assert(withCorrection.includes('Test'));
  assert(!withoutCorrection.includes('USER CORRECTION'));
});
```

## Best Practices

### 1. Use Descriptive Variable Names
```typescript
// Good
{ LANGUAGE: 'English', FOCUS_ITEM: 'Chicken salad' }

// Bad
{ lang: 'en', item: 'cs' }
```

### 2. Handle Optional Variables Gracefully
```typescript
const prompt = await loadAndProcessPrompt('my_prompt', {
  REQUIRED_VAR: value,
  OPTIONAL_VAR: optionalValue || undefined  // Use undefined, not null or ''
});
```

### 3. Keep Prompts DRY (Don't Repeat Yourself)
If multiple prompts share common instructions, consider:
- Creating a base prompt they extend
- Using shared template fragments
- Adding common instructions at runtime

### 4. Version Your Prompts
Update the version header when making significant changes:

```
VERSIONING:
Version 1.0 - Initial implementation
Version 1.1 - Added focus item capability
Version 2.0 - Restructured for multi-language support
Last updated: 2025-10-10
```

### 5. Document Expected Variables
In the header, clearly list all variables the prompt uses:

```
EXPECTED INPUTS:
- Image: Photo of food product
- LANGUAGE: Output language (e.g., "English", "Spanish")
- FOCUS_ITEM: (Optional) Specific item name to analyze
- USER_CORRECTION: (Optional) User's correction to AI interpretation
```

## Troubleshooting

### Problem: "Failed to load prompt template"
**Cause:** Prompt file not found or path incorrect  
**Solution:** 
- Verify file exists in `/prompts` directory
- Check file name (case-sensitive, include `.md`)
- Ensure path is correct relative to edge function

### Problem: Variables not being replaced
**Cause:** Variable name mismatch or typo  
**Solution:**
- Check variable names are exact matches (case-sensitive)
- Ensure using double curly braces: `{{VAR}}` not `{VAR}`
- Log the variables object to verify values

### Problem: Conditional blocks not working
**Cause:** Variable is truthy but not what you expect  
**Solution:**
- Empty string `''` is falsy, will hide content
- `undefined` and `false` hide content
- Any other value shows content
- Use `|| undefined` to convert falsy values: `value || undefined`

## Performance Considerations

### Caching Prompts

For high-traffic applications, consider caching loaded prompts:

```typescript
const promptCache: Map<string, string> = new Map();

async function getCachedPrompt(name: string, vars: Record<string, any>) {
  const cacheKey = `${name}-${JSON.stringify(vars)}`;
  
  if (!promptCache.has(cacheKey)) {
    const prompt = await loadAndProcessPrompt(name, vars);
    promptCache.set(cacheKey, prompt);
  }
  
  return promptCache.get(cacheKey)!;
}
```

### Async Loading

Load prompts asynchronously and in parallel when possible:

```typescript
// Sequential (slower)
const prompt1 = await loadAndProcessPrompt('detect_items', vars1);
const prompt2 = await loadAndProcessPrompt('analyze_product', vars2);

// Parallel (faster)
const [prompt1, prompt2] = await Promise.all([
  loadAndProcessPrompt('detect_items', vars1),
  loadAndProcessPrompt('analyze_product', vars2)
]);
```

## Additional Resources

- [Main README](./README.md) - Overview of the prompt system
- [Prompt Files](.) - Browse all available prompts
- [Edge Function Code](../supabase/functions/analyze-image/index.ts) - See prompts in use
- [Prompt Loader Source](../supabase/functions/_shared/prompt-loader.ts) - Implementation details
