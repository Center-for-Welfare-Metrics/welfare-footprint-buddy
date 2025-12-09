/**
 * Study Anonymization Edge Function
 * 
 * PURPOSE:
 * Anonymizes participant and event data for completed studies.
 * Only processes data where completed_at is more than 90 days ago.
 * Safe to run multiple times (idempotent via anonymized_at IS NULL check).
 * 
 * CALLED BY:
 * - Admin UI or scheduled job
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
 * - 200: { success, participants_anonymized, events_anonymized, study_version }
 * - 400: Missing study_version
 * - 401: Invalid authentication
 * - 403: Not an admin
 * - 500: Internal error
 * 
 * ANONYMIZATION LOGIC:
 * 1. Find participants where:
 *    - study_version matches
 *    - study_status = 'completed'
 *    - completed_at + 90 days < NOW()
 *    - anonymized_at IS NULL
 * 2. Set user_id = NULL, anonymized_at = NOW() for those participants
 * 3. Set user_id = NULL for all user_events linked to those participants
 * 
 * SIDE EFFECTS:
 * - Nullifies user_id in study_participants (irreversible)
 * - Nullifies user_id in user_events for affected participants
 * - Logs 'study_anonymized' to admin_audit_log
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

    // Check admin role using service client
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

    // Step 1: Anonymize study_participants where:
    // - study_status = 'completed'
    // - completed_at + 90 days < NOW()
    // - anonymized_at IS NULL
    const { data: anonymizedParticipants, error: participantError } = await serviceClient
      .from('study_participants')
      .update({
        user_id: null,
        anonymized_at: new Date().toISOString(),
      })
      .eq('study_version', study_version)
      .eq('study_status', 'completed')
      .not('completed_at', 'is', null)
      .lt('completed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .is('anonymized_at', null)
      .select('id, participant_code');

    if (participantError) {
      console.error('Participant anonymization error:', participantError);
      return new Response(
        JSON.stringify({ error: 'Failed to anonymize participants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const participantIds = anonymizedParticipants?.map(p => p.id) || [];
    let eventsAnonymized = 0;

    // Step 2: Null user_id in user_events for anonymized participants
    if (participantIds.length > 0) {
      const { data: updatedEvents, error: eventsError } = await serviceClient
        .from('user_events')
        .update({ user_id: null })
        .in('participant_id', participantIds)
        .select('id');

      if (eventsError) {
        console.error('Events anonymization error:', eventsError);
        // Continue anyway, participants are already anonymized
      } else {
        eventsAnonymized = updatedEvents?.length || 0;
      }
    }

    // Log anonymization in audit log
    await serviceClient.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'study_anonymized',
      details: {
        study_version,
        participants_anonymized: participantIds.length,
        participant_codes: anonymizedParticipants?.map(p => p.participant_code) || [],
        events_anonymized: eventsAnonymized,
        anonymized_at: new Date().toISOString(),
      }
    });

    console.log('Anonymization completed:', {
      studyVersion: study_version,
      participantsAnonymized: participantIds.length,
      eventsAnonymized,
    });

    return new Response(
      JSON.stringify({
        success: true,
        participants_anonymized: participantIds.length,
        events_anonymized: eventsAnonymized,
        study_version,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Study anonymization error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
