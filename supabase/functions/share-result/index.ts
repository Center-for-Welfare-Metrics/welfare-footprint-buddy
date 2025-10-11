import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Increment view count
    await supabase
      .from('shared_results')
      .update({ view_count: (sharedResult.view_count || 0) + 1 })
      .eq('id', sharedResult.id);

    return new Response(
      JSON.stringify({
        analysis_data: sharedResult.analysis_data,
        created_at: sharedResult.created_at,
        expires_at: sharedResult.expires_at,
        view_count: (sharedResult.view_count || 0) + 1,
        is_temporary: sharedResult.expires_at !== null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in share-result function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
