import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate participant code: XXXX-XXXX (uppercase letters + digits)
function generateParticipantCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}`;
}

// Randomly assign treatment group with equal probability
function assignTreatmentGroup(): string {
  const groups = ['control', 'treatment_a', 'treatment_b'];
  return groups[Math.floor(Math.random() * groups.length)];
}

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

    // Parse request body
    const { study_version = '1.0', contact_opt_in = false } = await req.json();

    // Create anon client to get user from JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Use service role client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is already enrolled in this study version
    const { data: existing } = await serviceClient
      .from('study_participants')
      .select('id, study_status')
      .eq('user_id', user.id)
      .eq('study_version', study_version)
      .maybeSingle();

    if (existing) {
      if (existing.study_status === 'withdrawn') {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot re-enroll',
            message: 'You have previously withdrawn from this study version. Re-enrollment is not supported.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ 
          error: 'Already enrolled',
          message: 'You are already enrolled in this study version.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique participant code (retry on collision)
    let participantCode: string;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      participantCode = generateParticipantCode();
      const { data: codeExists } = await serviceClient
        .from('study_participants')
        .select('id')
        .eq('participant_code', participantCode)
        .maybeSingle();
      
      if (!codeExists) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique participant code after', maxAttempts, 'attempts');
      return new Response(
        JSON.stringify({ error: 'Failed to generate participant code. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign treatment group
    const treatmentGroup = assignTreatmentGroup();

    // Create participant record
    const { data: participant, error: insertError } = await serviceClient
      .from('study_participants')
      .insert({
        user_id: user.id,
        treatment_group: treatmentGroup,
        study_version,
        study_status: 'active',
        participant_code: participantCode!,
        contact_opt_in,
        consent_given_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Enrollment error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to enroll in study' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log enrollment in audit log
    await serviceClient.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'participant_enrolled',
      details: {
        participant_id: participant.id,
        participant_code: participant.participant_code,
        treatment_group: treatmentGroup,
        study_version,
        contact_opt_in,
      }
    });

    console.log('User enrolled:', {
      userId: user.id,
      participantId: participant.id,
      treatmentGroup,
      studyVersion: study_version,
    });

    return new Response(
      JSON.stringify({
        success: true,
        participant_id: participant.id,
        participant_code: participant.participant_code,
        treatment_group: treatmentGroup,
        study_version,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Study enrollment error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
