/**
 * AI Response Cache Service
 * 
 * Implements content-based caching with automatic invalidation
 * based on prompt version and model changes.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateImageHash, normalizeText, getLanguageFamily } from './image-hash.ts';
import type { AIRequest, AIResponse } from './ai-handler.ts';
import { createLogger, Logger } from './logger.ts';

const logger = createLogger({ functionName: 'cache-service' });

/**
 * Cost estimation (per 1M tokens, USD)
 * 
 * NOTE: These are best-effort estimates based on published pricing.
 * Update when models change or pricing updates occur.
 * Pricing source: https://ai.google.dev/pricing (as of 2024)
 */
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  // Current models in use
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  // Legacy models (kept for historical metrics)
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
};

export type CacheStrategy = 'prefer' | 'bypass' | 'only';

export interface CacheOptions {
  strategy: CacheStrategy;
  promptTemplateId: string;
  promptVersion: string;
  mode: string;
  focusItem?: string;
  additionalContext?: string; // User-provided description/context
}

export class CacheService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate cache key from request
   */
  async generateCacheKey(
    request: AIRequest,
    options: CacheOptions
  ): Promise<string> {
    const components: string[] = [];
    
    // Prompt template + version
    components.push(`tpl:${options.promptTemplateId}`);
    components.push(`ver:${options.promptVersion}`);
    
    // Provider + model (from future response)
    components.push(`mode:${options.mode}`);
    
    // Language family (not exact language)
    const langFamily = getLanguageFamily(request.language || 'en');
    components.push(`lang:${langFamily}`);
    
    // Image hash (if present)
    if (request.imageData?.base64) {
      const imageHash = await generateImageHash(request.imageData.base64);
      components.push(`img:${imageHash}`);
    }
    
    // Focus item (normalized, if present)
    if (options.focusItem) {
      const normalized = normalizeText(options.focusItem);
      components.push(`focus:${normalized}`);
    }
    
    // Additional context (hashed for privacy and brevity)
    if (options.additionalContext && options.additionalContext.trim()) {
      const encoder = new TextEncoder();
      const data = encoder.encode(normalizeText(options.additionalContext));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contextHash = hashArray.slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      components.push(`ctx:${contextHash}`);
    }
    
    // Join and hash
    const keyString = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check cache for existing response
   */
  async checkCache(
    cacheKey: string
  ): Promise<{ hit: boolean; response?: AIResponse; entry?: any }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .select('*')
        .eq('content_hash', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        logger.error('Cache check failed', { errorCode: error.code, errorMessage: error.message });
        return { hit: false };
      }

      if (!data) {
        return { hit: false };
      }

      // Update hit count and last accessed time
      await this.supabase
        .from('ai_response_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      // Reconstruct AIResponse from cached data
      const response: AIResponse = {
        success: true,
        data: data.response_data,
        metadata: {
          provider: data.provider,
          model: data.model,
          tokensUsed: data.tokens_used,
          latencyMs: data.latency_ms,
        },
      };

      logger.info('Cache hit', { cacheKeyPreview: cacheKey.substring(0, 16), hitCount: data.hit_count + 1 });
      return { hit: true, response, entry: data };
    } catch (error) {
      logger.error('Cache check exception', { error: error instanceof Error ? error.message : String(error) });
      return { hit: false };
    }
  }

  /**
   * Save response to cache
   */
  async saveToCache(
    cacheKey: string,
    response: AIResponse,
    options: CacheOptions
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_response_cache')
        .insert({
          content_hash: cacheKey,
          prompt_template_id: options.promptTemplateId,
          prompt_version: options.promptVersion,
          response_data: response.data,
          provider: response.metadata.provider,
          model: response.metadata.model,
          tokens_used: response.metadata.tokensUsed || null,
          latency_ms: response.metadata.latencyMs,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) {
        logger.error('Cache save failed', { errorCode: error.code, cacheKeyPreview: cacheKey.substring(0, 16) });
      } else {
        logger.info('Saved to cache', { cacheKeyPreview: cacheKey.substring(0, 16) });
      }
    } catch (error) {
      logger.error('Cache save exception', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Record usage metrics
   */
  async recordMetrics(
    response: AIResponse,
    operation: string,
    cacheHit: boolean,
    cacheKey?: string
  ): Promise<void> {
    try {
      // Calculate cost estimate
      const modelPricing = COST_PER_1M_TOKENS[response.metadata.model] 
        || COST_PER_1M_TOKENS['gemini-2.0-flash-exp'];
      
      const tokensUsed = response.metadata.tokensUsed || 0;
      // Estimate 70% input, 30% output for rough cost
      const estimatedInputTokens = Math.floor(tokensUsed * 0.7);
      const estimatedOutputTokens = Math.floor(tokensUsed * 0.3);
      
      const estimatedCost = 
        (estimatedInputTokens / 1_000_000) * modelPricing.input +
        (estimatedOutputTokens / 1_000_000) * modelPricing.output;

      const { error } = await this.supabase
        .from('ai_usage_metrics')
        .insert({
          provider: response.metadata.provider,
          model: response.metadata.model,
          operation,
          latency_ms: response.metadata.latencyMs,
          tokens_used: tokensUsed || null,
          cache_hit: cacheHit,
          cache_key_hash: cacheKey ? cacheKey.substring(0, 32) : null,
          estimated_cost_usd: estimatedCost,
        });

      if (error) {
        logger.error('Metrics recording failed', { errorCode: error.code });
      }
    } catch (error) {
      logger.error('Metrics recording exception', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
