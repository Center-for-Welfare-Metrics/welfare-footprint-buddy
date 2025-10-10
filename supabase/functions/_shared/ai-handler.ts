/**
 * AI Handler - Model-Agnostic AI Provider Interface with Caching
 * 
 * This module provides a unified interface for interacting with various AI providers
 * while maintaining model independence, consistent error handling, and intelligent caching.
 */

import { CacheService, CacheOptions, CacheStrategy } from './cache-service.ts';

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
  cache?: CacheStrategy; // 'prefer' | 'bypass' | 'only'
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
    cacheHit?: boolean;
    cacheKey?: string;
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
  CACHE_ONLY_MISS: 'CACHE_ONLY_MISS',
  UNKNOWN: 'UNKNOWN',
};

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];

// ============= AI Handler Class =============

export class AIHandler {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string = 'gemini';
  private cacheService?: CacheService;

  /**
   * Initialize cache service
   */
  initializeCache(supabaseUrl: string, supabaseKey: string): void {
    this.cacheService = new CacheService(supabaseUrl, supabaseKey);
  }

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
   * Main analyze method - orchestrates AI calls with caching and error handling
   */
  async analyze(
    request: AIRequest,
    cacheOptions?: CacheOptions,
    providerName?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = providerName || this.defaultProvider;
    const cacheStrategy = request.cache || 'prefer';

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

    // Attempt cache lookup (if enabled and cacheService initialized)
    let cacheKey: string | undefined;
    let cacheHit = false;
    
    if (this.cacheService && cacheOptions && cacheStrategy !== 'bypass') {
      try {
        cacheKey = await this.cacheService.generateCacheKey(request, cacheOptions);
        const cacheResult = await this.cacheService.checkCache(cacheKey);
        
        if (cacheResult.hit && cacheResult.response) {
          console.log('Cache HIT:', cacheKey.substring(0, 16) + '...');
          cacheHit = true;
          
          // Record cache hit metrics
          await this.cacheService.recordMetrics(
            cacheResult.response,
            cacheOptions.mode,
            true,
            cacheKey
          );
          
          return {
            ...cacheResult.response,
            metadata: {
              ...cacheResult.response.metadata,
              cacheHit: true,
              cacheKey,
              latencyMs: Date.now() - startTime, // Include cache lookup time
            },
          };
        } else if (cacheStrategy === 'only') {
          // Cache-only mode and miss = error
          return {
            success: false,
            error: {
              code: AI_ERROR_CODES.CACHE_ONLY_MISS,
              message: 'Cache miss in cache-only mode',
            },
            metadata: {
              provider,
              model: 'N/A',
              latencyMs: Date.now() - startTime,
              cacheHit: false,
              cacheKey,
            },
          };
        }
        
        console.log('Cache MISS:', cacheKey.substring(0, 16) + '...');
      } catch (error) {
        console.error('Cache lookup error (continuing without cache):', error);
      }
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
            cacheHit: false,
            cacheKey,
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

      const finalResponse = {
        ...response,
        metadata: {
          ...response.metadata,
          latencyMs: Date.now() - startTime,
          cacheHit: false,
          cacheKey,
        },
      };

      // Save to cache (background, non-blocking)
      if (this.cacheService && cacheOptions && cacheKey && response.success) {
        this.cacheService.saveToCache(cacheKey, finalResponse, cacheOptions)
          .catch(err => console.error('Background cache save error:', err));
      }

      // Record metrics (background, non-blocking)
      if (this.cacheService && cacheOptions) {
        this.cacheService.recordMetrics(
          finalResponse,
          cacheOptions.mode,
          false,
          cacheKey
        ).catch(err => console.error('Background metrics error:', err));
      }

      return finalResponse;
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
          cacheHit: false,
          cacheKey,
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
  cacheOptions?: CacheOptions,
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

  return handler.analyze(request, cacheOptions, provider);
}
