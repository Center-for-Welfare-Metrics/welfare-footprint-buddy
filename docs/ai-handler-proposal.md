# Model-Agnostic AI Handler - Proposal

## Overview

This document outlines the proposed structure for a unified AI handler that abstracts all AI provider interactions (Gemini, GPT, Claude, etc.) behind a single, model-agnostic interface.

## Goals

1. **Model Independence**: Switch between AI providers without changing client code
2. **Centralized Error Handling**: Consistent error responses across all AI calls
3. **Standardized Response Format**: Unified data structure regardless of provider
4. **Confidence Logic**: Built-in confidence scoring and validation
5. **Cost Tracking**: Optional usage monitoring and logging

## Proposed File Structure

```
supabase/functions/_shared/
├── ai-handler.ts           # Main AI handler (new)
├── ai-providers/           # Provider-specific implementations (new)
│   ├── gemini.ts
│   ├── openai.ts
│   └── claude.ts
└── prompt-loader.ts        # Existing prompt system
```

## Core Interface

```typescript
// ai-handler.ts

export interface AIRequest {
  prompt: string;
  imageData?: {
    base64: string;
    mimeType: string;
  };
  language?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  rawResponse?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    model: string;
    provider: string;
    tokensUsed?: number;
    confidenceScore?: number;
  };
}

export interface AIProvider {
  name: string;
  supportsVision: boolean;
  call(request: AIRequest): Promise<AIResponse>;
}
```

## Handler Implementation

```typescript
// ai-handler.ts (core logic)

import { GeminiProvider } from './ai-providers/gemini.ts';
import { OpenAIProvider } from './ai-providers/openai.ts';

export class AIHandler {
  private provider: AIProvider;
  
  constructor(providerName: string = 'gemini') {
    this.provider = this.getProvider(providerName);
  }
  
  private getProvider(name: string): AIProvider {
    switch (name.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider();
      case 'openai':
        return new OpenAIProvider();
      // Add more providers as needed
      default:
        return new GeminiProvider(); // Default fallback
    }
  }
  
  async analyze(request: AIRequest): Promise<AIResponse> {
    try {
      // Pre-validation
      if (request.imageData && !this.provider.supportsVision) {
        throw new Error(`${this.provider.name} does not support vision`);
      }
      
      // Make the call
      const response = await this.provider.call(request);
      
      // Post-processing (confidence scoring, validation, etc.)
      return this.enrichResponse(response);
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AI_CALL_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }
  
  private enrichResponse(response: AIResponse): AIResponse {
    // Add confidence scoring logic
    // Add validation logic
    // Add metadata enrichment
    return response;
  }
}

// Convenience function for edge functions
export async function callAI(
  request: AIRequest, 
  provider: string = 'gemini'
): Promise<AIResponse> {
  const handler = new AIHandler(provider);
  return handler.analyze(request);
}
```

## Provider Implementation Example

```typescript
// ai-providers/gemini.ts

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  supportsVision = true;
  
  async call(request: AIRequest): Promise<AIResponse> {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    
    // Build request body based on whether we have an image
    const parts = [];
    if (request.imageData) {
      parts.push({
        inlineData: {
          mimeType: request.imageData.mimeType,
          data: request.imageData.base64,
        },
      });
    }
    parts.push({ text: request.prompt });
    
    const body = {
      contents: [{
        parts,
      }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract text from Gemini's response format
    const text = data.candidates?.[0]?.content?.parts[0]?.text;
    
    if (!text) {
      throw new Error('Unexpected Gemini response format');
    }
    
    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    return {
      success: true,
      data: parsedData,
      rawResponse: data,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        provider: 'Gemini',
      },
    };
  }
}
```

## Integration with Current Code

### Before (Current Implementation)
```typescript
// In analyze-image/index.ts
const prompt = await loadAndProcessPrompt('analyze_product.txt', { LANGUAGE: language });

const body = {
  contents: [{
    parts: [
      { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } },
      { text: prompt }
    ]
  }]
};

const response = await fetch(geminiEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const data = await response.json();
const analysisJson = JSON.parse(data.candidates[0].content.parts[0].text);
```

### After (With AI Handler)
```typescript
// In analyze-image/index.ts
import { callAI } from '../_shared/ai-handler.ts';
import { loadAndProcessPrompt } from '../_shared/prompt-loader.ts';

const prompt = await loadAndProcessPrompt('analyze_product.txt', { LANGUAGE: language });

const response = await callAI({
  prompt,
  imageData,
  language,
});

if (!response.success) {
  throw new Error(response.error?.message || 'AI analysis failed');
}

const analysisJson = response.data;
```

## Benefits

1. **Cleaner Code**: Edge functions become much simpler and more readable
2. **Easy Testing**: Mock the AI handler for unit tests
3. **Provider Switching**: Change `callAI(request, 'openai')` to switch providers
4. **Error Consistency**: All errors follow the same format
5. **Future-Proof**: Add new providers without touching existing code
6. **Metadata Access**: Track usage, costs, and performance easily

## Migration Plan

1. **Phase 1**: Create `ai-handler.ts` and `gemini.ts` provider
2. **Phase 2**: Update `analyze-image` function to use the handler
3. **Phase 3**: Update `suggest-ethical-swap` function
4. **Phase 4**: Add additional providers (OpenAI, Claude) as needed
5. **Phase 5**: Add confidence scoring and advanced features

## Open Questions

1. Should we support multiple models from the same provider (e.g., gemini-2.0-flash vs gemini-pro)?
2. Do we need request/response caching at this layer?
3. Should cost tracking be built-in or separate?
4. Do we need retry logic for failed requests?

---

**Status**: Proposal - Awaiting approval for implementation
**Last Updated**: 2025-10-10
