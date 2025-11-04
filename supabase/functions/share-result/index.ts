import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const viewLimitMap = new Map<string, number>()

// Rate limit: 30 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30
// View count throttle: 1 count per IP per hour per share
const VIEW_THROTTLE_WINDOW = 60 * 60 * 1000 // 1 hour

// Validation schema for analysis data
const analysisDataSchema = z.object({
  productName: z.string().max(500),
  summary: z.string().max(2000).optional(),
  items: z.array(z.object({
    name: z.string().max(200),
    animalIngredients: z.array(z.string()).max(50).optional(),
    welfareIssues: z.array(z.string()).max(50).optional(),
  })).max(100).optional(),
  ethicalLens: z.number().min(1).max(4).optional(),
  confidence: z.string().max(50).optional(),
}).passthrough() // Allow additional fields but validate core structure

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  record.count++
  return true
}

function shouldIncrementView(shareToken: string, ip: string): boolean {
  const viewKey = `${shareToken}:${ip}`
  const lastView = viewLimitMap.get(viewKey)
  const now = Date.now()
  
  if (!lastView || now - lastView > VIEW_THROTTLE_WINDOW) {
    viewLimitMap.set(viewKey, now)
    return true
  }
  
  return false
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
  for (const [key, timestamp] of viewLimitMap.entries()) {
    if (now - timestamp > VIEW_THROTTLE_WINDOW) {
      viewLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000) // Cleanup every 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown'
    
    // Check rate limit
    if (!checkRateLimit(ipAddress)) {
      console.warn(`[share-result] Rate limit exceeded for IP: ${ipAddress}`)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const shareToken = url.pathname.split('/').pop();

    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'Share token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the shared result
    const { data: sharedResult, error } = await supabase
      .from('shared_results')
      .select('*')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shared result:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch shared result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sharedResult) {
      return new Response(
        JSON.stringify({ error: 'Shared result not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate analysis data structure
    const validation = analysisDataSchema.safeParse(sharedResult.analysis_data)
    if (!validation.success) {
      console.error('[share-result] Invalid analysis data:', validation.error)
      return new Response(
        JSON.stringify({ error: 'Invalid shared data format' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check data size (prevent storage abuse)
    const dataSize = JSON.stringify(sharedResult.analysis_data).length
    if (dataSize > 100000) { // 100KB limit
      console.error('[share-result] Data exceeds size limit:', dataSize)
      return new Response(
        JSON.stringify({ error: 'Shared data too large' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment view count only if not recently viewed from this IP
    let newViewCount = sharedResult.view_count || 0
    if (shouldIncrementView(shareToken, ipAddress)) {
      newViewCount = (sharedResult.view_count || 0) + 1
      await supabase
        .from('shared_results')
        .update({ view_count: newViewCount })
        .eq('id', sharedResult.id)
    }

    return new Response(
      JSON.stringify({
        analysis_data: sharedResult.analysis_data,
        created_at: sharedResult.created_at,
        expires_at: sharedResult.expires_at,
        view_count: newViewCount,
        is_temporary: sharedResult.expires_at !== null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log full error server-side for debugging
    console.error('Error in share-result function:', error);
    
    // Return safe, user-friendly error message
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to load shared result. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
