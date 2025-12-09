/**
 * Study Withdrawal Edge Function
 * 
 * PURPOSE:
 * Withdraws an authenticated user from their active study enrollment.
 * Pre-withdrawal event data is preserved for anonymized analysis.
 * 
 * CALLED BY:
 * - Frontend: StudyParticipation component when user clicks "Leave Study"
 * 
 * AUTHENTICATION:
 * - Requires valid user JWT (Bearer token in Authorization header)
 * - Uses service_role client for database operations
 * 
 * REQUEST BODY:
 * {
 *   "study_version": "1.0"  // Optional, defaults to "1.0"
 * }
 * 
 * RESPONSE:
 * - 200: { success, message }
 * - 400: Cannot withdraw (not active)
 * - 401: Missing or invalid authentication
 * - 404: Not enrolled in this study version
 * - 500: Internal error
 * 
 * SIDE EFFECTS:
 * - Updates study_status to 'withdrawn' and sets withdrawn_at
 * - Logs 'participant_withdrawn' to admin_audit_log
 * - Does NOT modify treatment_group, participant_code, or other fields
 * 
 * SECURITY NOTES:
 * - User UPDATE RLS policy is intentionally absent for study_participants
 * - All withdrawals must go through this function to ensure:
 *   1. Only status fields are modified
 *   2. Audit logging is always performed
 *   3. Validation of active status is enforced
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

    const { study_version = '1.0' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from JWT
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

    // Use service role for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify participant exists and is active
    const { data: participant, error: fetchError } = await serviceClient
      .from('study_participants')
      .select('id, study_status, participant_code, treatment_group')
      .eq('user_id', user.id)
      .eq('study_version', study_version)
      .maybeSingle();

    if (fetchError || !participant) {
      return new Response(
        JSON.stringify({ error: 'You are not enrolled in this study version' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (participant.study_status !== 'active') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot withdraw',
          message: `Your enrollment status is "${participant.study_status}". Only active participants can withdraw.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update only study_status and withdrawn_at
    const { error: updateError } = await serviceClient
      .from('study_participants')
      .update({
        study_status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    if (updateError) {
      console.error('Withdrawal update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to process withdrawal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log withdrawal in audit log
    await serviceClient.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'participant_withdrawn',
      details: {
        participant_id: participant.id,
        participant_code: participant.participant_code,
        treatment_group: participant.treatment_group,
        study_version,
        withdrawn_at: new Date().toISOString(),
      }
    });

    console.log('User withdrew from study:', {
      userId: user.id,
      participantId: participant.id,
      studyVersion: study_version,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'You have been withdrawn from the study. Data collected before withdrawal may be used in anonymized analysis.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Study withdrawal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
