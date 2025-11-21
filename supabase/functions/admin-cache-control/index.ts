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
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'admin-cache-control' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const reqLogger = logger.withRequest({ requestId, ip });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    reqLogger.info('Request started');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      reqLogger.warn('No authorization header');
      return jsonErrorResponse(401, 'Unauthorized - No authorization header');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      reqLogger.error('Configuration error: Missing Supabase configuration');
      return jsonErrorResponse(500, 'Service configuration error. Please contact support.');
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT and get user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      reqLogger.warn('User verification failed', { error: userError?.message });
      return jsonErrorResponse(401, 'Unauthorized - Invalid token');
    }

    reqLogger.info('User authenticated', { userId: userData.user.id });

    // Check if user has admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });

    if (roleError) {
      reqLogger.error('Role check failed', { error: roleError.message });
      return jsonErrorResponse(500, 'Authorization check failed');
    }

    if (!isAdmin) {
      reqLogger.warn('Non-admin user attempted cache control', { userId: userData.user.id });
      return jsonErrorResponse(403, 'Forbidden - Admin access required');
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      reqLogger.warn('Invalid request body', { error: validation.error });
      return jsonErrorResponse(400, validation.error!);
    }

    const { action, promptTemplateId, promptVersion, model, cacheKey } = validation.data!;
    reqLogger.info('Cache control action requested', { action, promptTemplateId, promptVersion, model });

    const userAgent = req.headers.get('user-agent') || 'unknown';

    let result;

    switch (action) {
      case 'flush_all':
        const { data: flushData, error: flushError } = await supabase
          .rpc('admin_flush_all_cache');
        
        if (flushError) throw flushError;
        
        result = {
          message: `Flushed all cache (${flushData} entries)`,
          deletedCount: flushData,
        };
        break;

      case 'invalidate_by_prompt':
        if (!promptTemplateId) {
          return jsonErrorResponse(400, 'promptTemplateId is required for invalidate_by_prompt');
        }

        const { data: promptData, error: promptError } = await supabase
          .rpc('admin_invalidate_by_prompt', {
            template_id: promptTemplateId,
            version: promptVersion || null,
          });

        if (promptError) throw promptError;

        result = {
          message: `Invalidated ${promptData} cache entries for prompt ${promptTemplateId}${promptVersion ? ` (v${promptVersion})` : ''}`,
          deletedCount: promptData,
        };
        break;

      case 'invalidate_by_model':
        if (!model) {
          return jsonErrorResponse(400, 'model is required for invalidate_by_model');
        }

        const { data: modelData, error: modelError } = await supabase
          .rpc('admin_invalidate_by_model', { model_name: model });

        if (modelError) throw modelError;

        result = {
          message: `Invalidated ${modelData} cache entries for model ${model}`,
          deletedCount: modelData,
        };
        break;

      case 'invalidate_by_key':
        if (!cacheKey) {
          return jsonErrorResponse(400, 'cacheKey is required for invalidate_by_key');
        }

        const { data: keyData, error: keyError } = await supabase
          .rpc('admin_invalidate_by_key', { key: cacheKey });

        if (keyError) throw keyError;

        result = {
          message: keyData ? 'Cache entry invalidated' : 'Cache key not found',
          deleted: keyData,
        };
        break;
    }

    reqLogger.info('Cache control action completed successfully', { action, result });

    // Log admin action to audit log
    try {
      await supabase.from('admin_audit_log').insert({
        user_id: userData.user.id,
        action: action,
        details: { promptTemplateId, promptVersion, model, cacheKey, result },
        ip_address: ip || 'unknown',
        user_agent: userAgent,
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails, but log the error
      reqLogger.warn('Failed to log admin action', { error: auditError instanceof Error ? auditError.message : String(auditError) });
    }

    return jsonSuccessResponse(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    
    let safeMessage = 'Cache operation failed. Please try again.';
    
    if (errorMessage.includes('database') || errorMessage.includes('connection')) {
      safeMessage = 'Database connection error. Please try again later.';
    } else if (errorMessage.includes('Supabase')) {
      safeMessage = 'Backend service error. Please contact support.';
    }
    
    return jsonErrorResponse(500, safeMessage);
  }
});
