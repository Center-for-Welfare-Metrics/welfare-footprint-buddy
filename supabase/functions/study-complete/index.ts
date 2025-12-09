/**
 * Study Completion Edge Function
 * 
 * PURPOSE:
 * Marks all active participants in a study version as completed.
 * This is a manual admin-triggered action (not date-based).
 * 
 * CALLED BY:
 * - Admin UI or direct API call
 * 
 * AUTHENTICATION:
 * - Requires valid admin JWT (user must have 'admin' role in user_roles)
 * 
 * REQUEST BODY:
 * {
 *   "study_version": "1.0"  // Required
 * }
 * 
 * RESPONSE:
 * - 200: { success, study_version, participants_completed, completed_at, message }
 * - 400: Missing study_version
 * - 401: Invalid authentication
 * - 403: Not an admin
 * - 500: Internal error
 * 
 * SIDE EFFECTS:
 * - Updates all 'active' participants to study_status='completed'
 * - Sets completed_at timestamp
 * - Logs 'study_completed' to admin_audit_log
 * 
 * POST-COMPLETION:
 * - Anonymization becomes available 90 days after completed_at
 * - No new events will be logged with study fields for completed participants
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { study_version } = await req.json();
    if (!study_version) {
      return new Response(
        JSON.stringify({ error: 'study_version is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify admin role
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark all active participants as completed
    const completedAt = new Date().toISOString();

    const { data: completedParticipants, error: updateError } = await serviceClient
      .from('study_participants')
      .update({
        study_status: 'completed',
        completed_at: completedAt,
      })
      .eq('study_version', study_version)
      .eq('study_status', 'active')
      .select('id, participant_code');

    if (updateError) {
      console.error('Study completion error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete study' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log completion in audit log
    await serviceClient.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'study_completed',
      details: {
        study_version,
        participants_marked_completed: completedParticipants?.length || 0,
        completed_at: completedAt,
      }
    });

    console.log('Study completed:', {
      studyVersion: study_version,
      participantsCompleted: completedParticipants?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        study_version,
        participants_completed: completedParticipants?.length || 0,
        completed_at: completedAt,
        message: `Study version ${study_version} has been marked as completed. Anonymization will be available 90 days from now.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Study completion error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
