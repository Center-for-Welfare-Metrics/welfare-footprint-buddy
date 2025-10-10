/**
 * AI Response Cache Service
 * 
 * Implements content-based caching with automatic invalidation
 * based on prompt version and model changes.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateImageHash, normalizeText, getLanguageFamily } from './image-hash.ts';
import type { AIRequest, AIResponse } from './ai-handler.ts';

// Cost estimation (per 1M tokens, USD)
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
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
        console.error('Cache check error:', error);
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

      return { hit: true, response, entry: data };
    } catch (error) {
      console.error('Cache check exception:', error);
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
        console.error('Cache save error:', error);
      } else {
        console.log('Saved to cache:', cacheKey.substring(0, 16) + '...');
      }
    } catch (error) {
      console.error('Cache save exception:', error);
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
        console.error('Metrics recording error:', error);
      }
    } catch (error) {
      console.error('Metrics recording exception:', error);
    }
  }
}
