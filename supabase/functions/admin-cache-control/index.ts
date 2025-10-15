/**
 * Admin Cache Control Endpoint
 * 
 * Provides administrative controls for cache management:
 * - Flush all cache
 * - Invalidate by prompt template/version
 * - Invalidate by model
 * - Invalidate by cache key
 * 
 * PROTECTED: Requires JWT authentication for admin access
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const ACTION_TYPES = ['flush_all', 'invalidate_by_prompt', 'invalidate_by_model', 'invalidate_by_key'] as const;

interface ValidatedInput {
  action: typeof ACTION_TYPES[number];
  promptTemplateId?: string;
  promptVersion?: string;
  model?: string;
  cacheKey?: string;
}

function validateInput(body: any): { valid: boolean; data?: ValidatedInput; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { action, promptTemplateId, promptVersion, model, cacheKey } = body;

  // Validate action is one of the allowed types
  if (!ACTION_TYPES.includes(action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${ACTION_TYPES.join(', ')}` };
  }

  // Validate string fields have reasonable lengths
  if (promptTemplateId && (typeof promptTemplateId !== 'string' || promptTemplateId.length > 100)) {
    return { valid: false, error: 'Invalid promptTemplateId' };
  }

  if (promptVersion && (typeof promptVersion !== 'string' || promptVersion.length > 20)) {
    return { valid: false, error: 'Invalid promptVersion' };
  }

  if (model && (typeof model !== 'string' || model.length > 100)) {
    return { valid: false, error: 'Invalid model' };
  }

  if (cacheKey && (typeof cacheKey !== 'string' || cacheKey.length > 500)) {
    return { valid: false, error: 'Invalid cacheKey' };
  }

  return {
    valid: true,
    data: {
      action,
      promptTemplateId: promptTemplateId?.trim(),
      promptVersion: promptVersion?.trim(),
      model: model?.trim(),
      cacheKey: cacheKey?.trim(),
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse and validate request body
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, promptTemplateId, promptVersion, model, cacheKey } = validation.data!;

    let result;

    switch (action) {
      case 'flush_all':
        const { data: flushData, error: flushError } = await supabase
          .rpc('admin_flush_all_cache');
        
        if (flushError) throw flushError;
        
        result = {
          success: true,
          message: `Flushed all cache (${flushData} entries)`,
          deletedCount: flushData,
        };
        break;

      case 'invalidate_by_prompt':
        if (!promptTemplateId) {
          return new Response(
            JSON.stringify({ success: false, error: 'promptTemplateId is required for invalidate_by_prompt' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: promptData, error: promptError } = await supabase
          .rpc('admin_invalidate_by_prompt', {
            template_id: promptTemplateId,
            version: promptVersion || null,
          });

        if (promptError) throw promptError;

        result = {
          success: true,
          message: `Invalidated ${promptData} cache entries for prompt ${promptTemplateId}${promptVersion ? ` (v${promptVersion})` : ''}`,
          deletedCount: promptData,
        };
        break;

      case 'invalidate_by_model':
        if (!model) {
          return new Response(
            JSON.stringify({ success: false, error: 'model is required for invalidate_by_model' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: modelData, error: modelError } = await supabase
          .rpc('admin_invalidate_by_model', { model_name: model });

        if (modelError) throw modelError;

        result = {
          success: true,
          message: `Invalidated ${modelData} cache entries for model ${model}`,
          deletedCount: modelData,
        };
        break;

      case 'invalidate_by_key':
        if (!cacheKey) {
          return new Response(
            JSON.stringify({ success: false, error: 'cacheKey is required for invalidate_by_key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: keyData, error: keyError } = await supabase
          .rpc('admin_invalidate_by_key', { key: cacheKey });

        if (keyError) throw keyError;

        result = {
          success: true,
          message: keyData ? 'Cache entry invalidated' : 'Cache key not found',
          deleted: keyData,
        };
        break;
    }

    console.log('Cache control action completed:', action, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Admin cache control error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});