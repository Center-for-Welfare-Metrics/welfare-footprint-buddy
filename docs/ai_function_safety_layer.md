# AI Function Safety Layer v1

## Overview

All AI-driven edge functions in this project implement a standardized safety layer to ensure resilient, secure, and maintainable API interactions.

## Core Components

### 1. Enhanced CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```
**Purpose**: Improved browser compatibility by explicitly declaring allowed HTTP methods.

### 2. Input Sanitization
```typescript
// Block suspicious sequences that could indicate injection attempts
if (/[{}[\]]{2,}/.test(userInput)) {
  return new Response(
    JSON.stringify({ error: 'Suspicious input detected.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```
**Purpose**: Prevent potential injection attacks by detecting unusual patterns of brackets/braces.

### 3. Request Timeout (25s)
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 25000);

const response = await fetch(API_ENDPOINT, {
  signal: controller.signal,
  // ... other options
}).finally(() => clearTimeout(timeout));
```
**Purpose**: Prevent edge function hangs and ensure graceful timeout handling.

### 4. Robust JSON Extraction
```typescript
// For functions expecting JSON responses
const jsonMatch = text.match(/{[\s\S]*}/);
if (!jsonMatch) throw new Error('No valid JSON object found in AI response.');
const cleanedText = jsonMatch[0];
const parsedResponse = JSON.parse(cleanedText);
```
**Purpose**: Handle partial or malformed AI responses by extracting the first valid JSON block.

### 5. Simplified Logging
```typescript
console.log('✅ Operation completed');
// Avoid logging large payloads to prevent Supabase console overflow
```
**Purpose**: Keep logs concise while maintaining visibility into function execution.

### 6. Unified Error Handling
```typescript
catch (error) {
  console.error('Error in function:', error);
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  let safeMessage = 'Service temporarily unavailable.';
  
  if (errorMessage.includes('AI') || errorMessage.includes('gateway')) {
    safeMessage = 'AI service temporarily unavailable. Please try again later.';
  } else if (errorMessage.includes('API_KEY')) {
    safeMessage = 'Service configuration error. Please contact support.';
  }
  
  return new Response(
    JSON.stringify({ error: safeMessage }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```
**Purpose**: Prevent exposure of internal architecture details while providing helpful user-facing messages.

## Implementation Status

### ✅ Functions with Safety Layer v1

1. **suggest-ethical-swap/index.ts**
   - Timeout: 25s
   - Input sanitization: Yes
   - JSON extraction: Yes (robust regex-based)
   - Safe error messages: Yes

2. **enrich-description/index.ts**
   - Timeout: 25s
   - Input sanitization: Yes
   - JSON extraction: N/A (plain text response)
   - Safe error messages: Yes

3. **generate-text/index.ts**
   - Timeout: 25s
   - Input sanitization: Yes
   - JSON extraction: N/A (Gemini returns structured JSON)
   - Safe error messages: Yes

### ⚠️ Functions with Partial Implementation

4. **analyze-image/index.ts**
   - Has comprehensive input validation
   - Uses ai-handler.ts abstraction layer
   - Should be reviewed for timeout implementation

## Guidelines for New AI Functions

When creating new AI-driven edge functions:

1. **Copy the pattern** from `suggest-ethical-swap/index.ts` as the reference implementation
2. **Apply all six components** listed above
3. **Test timeout behavior** by simulating slow AI responses
4. **Validate error handling** ensures no sensitive information leaks
5. **Add function to this document** under "Implementation Status"

## Testing Checklist

- [ ] Function times out gracefully after 25s
- [ ] Input with `{{}}` or `[[]]` patterns is rejected
- [ ] Error messages don't expose API keys, URLs, or internal structure
- [ ] CORS headers allow OPTIONS preflight requests
- [ ] Logs are concise and don't overflow console
- [ ] JSON extraction handles partial/malformed responses (if applicable)

## Maintenance Notes

**Version**: v1 (2025-11-04)
**Last Updated**: 2025-11-04
**Review Schedule**: Quarterly or when adding new AI functions

This layer is considered **canonical** and should be the foundation for all AI service integrations going forward.
