/**
 * Gemini AI Provider
 * 
 * Implements the AIProvider interface for Google's Gemini API
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AI_ERROR_CODES,
} from '../ai-handler.ts';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  supportsVision = true;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string = 'gemini-2.0-flash-exp',
    baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async call(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Construct the request body for Gemini
      const parts: any[] = [{ text: request.prompt }];

      // Add image if provided
      if (request.imageData) {
        parts.push({
          inline_data: {
            mime_type: request.imageData.mimeType,
            data: request.imageData.base64,
          },
        });
      }

      const requestBody = {
        contents: [{
          parts,
        }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 4096,
        },
      };

      // Make the API call
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      // Handle errors
      if (!response.ok) {
        return this.handleError(responseData, response.status, startTime);
      }

      // Extract the response text
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return {
          success: false,
          error: {
            code: AI_ERROR_CODES.PROVIDER_ERROR,
            message: 'Unexpected response format from Gemini',
            details: responseData,
          },
          metadata: {
            provider: this.name,
            model: this.model,
            latencyMs: Date.now() - startTime,
          },
        };
      }

      // Return successful response
      return {
        success: true,
        data: {
          text,
          raw: responseData,
        },
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: responseData.usageMetadata?.totalTokenCount,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: AI_ERROR_CODES.NETWORK,
          message: error.message || 'Network error',
          details: error,
        },
        metadata: {
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle Gemini API errors
   */
  private handleError(errorData: any, status: number, startTime: number): AIResponse {
    let code: any = AI_ERROR_CODES.PROVIDER_ERROR;
    let message = errorData.error?.message || 'Unknown error from Gemini';

    // Map HTTP status codes to error codes
    if (status === 401 || status === 403) {
      code = AI_ERROR_CODES.AUTHENTICATION;
      message = 'Authentication failed. Check your API key.';
    } else if (status === 429) {
      code = AI_ERROR_CODES.RATE_LIMIT;
      message = 'Rate limit exceeded. Please try again later.';
    } else if (status >= 500) {
      code = AI_ERROR_CODES.PROVIDER_ERROR;
      message = 'Gemini service error. Please try again later.';
    }

    return {
      success: false,
      error: {
        code,
        message,
        details: errorData,
      },
      metadata: {
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - startTime,
      },
    };
  }
}
