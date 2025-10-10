/**
 * Admin Cache Control Endpoint
 * 
 * Provides administrative controls for cache management:
 * - Flush all cache
 * - Invalidate by prompt template/version
 * - Invalidate by model
 * - Invalidate by cache key
 * 
 * IMPORTANT: This endpoint should be protected with admin authentication
 * in production. For now, it uses service role key for security.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { action, promptTemplateId, promptVersion, model, cacheKey } = await req.json();

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
          throw new Error('promptTemplateId is required for invalidate_by_prompt');
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
          throw new Error('model is required for invalidate_by_model');
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
          throw new Error('cacheKey is required for invalidate_by_key');
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

      default:
        throw new Error(`Unknown action: ${action}`);
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
