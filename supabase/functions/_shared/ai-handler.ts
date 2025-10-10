/**
 * AI Handler - Model-Agnostic AI Provider Interface
 * 
 * This module provides a unified interface for interacting with various AI providers
 * while maintaining model independence and consistent error handling.
 */

// ============= Type Definitions =============

export interface AIRequest {
  prompt: string;
  imageData?: {
    base64: string;
    mimeType: string;
  };
  language?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: {
    code: AIErrorCode;
    message: string;
    details?: any;
  };
  metadata: {
    provider: string;
    model: string;
    tokensUsed?: number;
    latencyMs: number;
  };
}

export interface AIProvider {
  name: string;
  supportsVision: boolean;
  call(request: AIRequest): Promise<AIResponse>;
}

// ============= Error Codes =============

export const AI_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTHENTICATION: 'AUTHENTICATION',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
};

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];

// ============= AI Handler Class =============

export class AIHandler {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string = 'gemini';

  /**
   * Register an AI provider
   */
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * Main analyze method - orchestrates AI calls with error handling
   */
  async analyze(request: AIRequest, providerName?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = providerName || this.defaultProvider;

    // Pre-validation
    const validationError = this.validateRequest(request);
    if (validationError) {
      return {
        success: false,
        error: {
          code: AI_ERROR_CODES.INVALID_REQUEST,
          message: validationError,
        },
        metadata: {
          provider,
          model: 'N/A',
          latencyMs: Date.now() - startTime,
        },
      };
    }

    // Get provider
    const aiProvider = this.providers.get(provider);
    if (!aiProvider) {
      return {
        success: false,
        error: {
          code: AI_ERROR_CODES.PROVIDER_ERROR,
          message: `Provider "${provider}" not found`,
        },
        metadata: {
          provider,
          model: 'N/A',
          latencyMs: Date.now() - startTime,
        },
      };
    }

    // Check vision support if needed
    if (request.imageData && !aiProvider.supportsVision) {
      return {
        success: false,
        error: {
          code: AI_ERROR_CODES.INVALID_REQUEST,
          message: `Provider "${provider}" does not support vision`,
        },
        metadata: {
          provider,
          model: 'N/A',
          latencyMs: Date.now() - startTime,
        },
      };
    }

    // Set timeout
    const timeout = request.timeout || 30000; // 30 seconds default
    const timeoutPromise = new Promise<AIResponse>((_, reject) => {
      setTimeout(() => {
        reject({
          success: false,
          error: {
            code: AI_ERROR_CODES.TIMEOUT,
            message: `Request timed out after ${timeout}ms`,
          },
          metadata: {
            provider,
            model: 'N/A',
            latencyMs: timeout,
          },
        });
      }, timeout);
    });

    try {
      // Race between AI call and timeout
      const response = await Promise.race([
        aiProvider.call(request),
        timeoutPromise,
      ]) as AIResponse;

      return {
        ...response,
        metadata: {
          ...response.metadata,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      // Handle timeout errors
      if (error.error?.code === AI_ERROR_CODES.TIMEOUT) {
        return error;
      }

      // Handle other errors
      return {
        success: false,
        error: {
          code: AI_ERROR_CODES.UNKNOWN,
          message: error.message || 'Unknown error occurred',
          details: error,
        },
        metadata: {
          provider,
          model: 'N/A',
          latencyMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Validate the request
   */
  private validateRequest(request: AIRequest): string | null {
    if (!request.prompt || typeof request.prompt !== 'string') {
      return 'Prompt is required and must be a string';
    }

    if (request.imageData) {
      if (!request.imageData.base64 || !request.imageData.mimeType) {
        return 'Image data must include base64 and mimeType';
      }
    }

    return null;
  }
}

// ============= Convenience Function =============

/**
 * Convenience function for edge functions
 * Usage: const response = await callAI({ prompt: '...', imageData: {...} });
 */
export async function callAI(
  request: AIRequest,
  provider?: string
): Promise<AIResponse> {
  // This will be initialized by each edge function with registered providers
  const handler = (globalThis as any).__aiHandler as AIHandler;
  
  if (!handler) {
    return {
      success: false,
      error: {
        code: AI_ERROR_CODES.PROVIDER_ERROR,
        message: 'AI Handler not initialized',
      },
      metadata: {
        provider: provider || 'unknown',
        model: 'N/A',
        latencyMs: 0,
      },
    };
  }

  return handler.analyze(request, provider);
}
