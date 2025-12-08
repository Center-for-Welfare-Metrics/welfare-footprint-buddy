import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of allowed event_properties keys for study exports
const ALLOWED_EVENT_PROPERTIES = [
  'lens',
  'mode',
  'language',
  'items_count',
  'welfare_category',
  'time_to_action_ms',
  'has_alternatives',
  'alternatives_viewed',
  'share_initiated',
];

function filterEventProperties(props: Record<string, unknown> | null): Record<string, unknown> {
  if (!props) return {};
  const filtered: Record<string, unknown> = {};
  for (const key of ALLOWED_EVENT_PROPERTIES) {
    if (key in props) {
      filtered[key] = props[key];
    }
  }
  return filtered;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
      return String(val).replace(/"/g, '""');
    }).map(v => `"${v}"`).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
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

    const { 
      study_version, 
      date_from, 
      date_to, 
      treatment_group,
      format = 'json' // 'json' or 'csv'
    } = await req.json();

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

    // Fetch participants for this study version
    let participantQuery = serviceClient
      .from('study_participants')
      .select('id, participant_code, treatment_group, contact_opt_in, study_version')
      .eq('study_version', study_version);

    if (treatment_group) {
      participantQuery = participantQuery.eq('treatment_group', treatment_group);
    }

    const { data: participants, error: participantError } = await participantQuery;

    if (participantError) {
      console.error('Participant fetch error:', participantError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const participantIds = participants?.map(p => p.id) || [];
    const participantMap = new Map(participants?.map(p => [p.id, p]) || []);

    // Fetch events for these participants
    let eventQuery = serviceClient
      .from('user_events')
      .select('id, timestamp, event_type, event_properties, participant_id, participant_code, treatment_group, study_version')
      .eq('study_version', study_version)
      .not('participant_id', 'is', null);

    if (participantIds.length > 0) {
      eventQuery = eventQuery.in('participant_id', participantIds);
    }

    if (date_from) {
      eventQuery = eventQuery.gte('timestamp', date_from);
    }

    if (date_to) {
      eventQuery = eventQuery.lte('timestamp', date_to);
    }

    if (treatment_group) {
      eventQuery = eventQuery.eq('treatment_group', treatment_group);
    }

    const { data: events, error: eventError } = await eventQuery.order('timestamp', { ascending: true });

    if (eventError) {
      console.error('Event fetch error:', eventError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform events for export (de-identified)
    const exportData = (events || []).map(event => {
      const participant = event.participant_id ? participantMap.get(event.participant_id) : null;
      return {
        participant_code: event.participant_code,
        treatment_group: event.treatment_group,
        study_version: event.study_version,
        event_type: event.event_type,
        event_timestamp: event.timestamp,
        contact_opt_in: participant?.contact_opt_in ?? null,
        ...filterEventProperties(event.event_properties as Record<string, unknown> | null),
      };
    });

    // Log export in audit log
    await serviceClient.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'study_export',
      details: {
        study_version,
        date_from,
        date_to,
        treatment_group,
        format,
        events_exported: exportData.length,
        participants_included: participantIds.length,
        exported_at: new Date().toISOString(),
      }
    });

    console.log('Study export completed:', {
      studyVersion: study_version,
      eventsExported: exportData.length,
      format,
    });

    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="study_${study_version}_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        study_version,
        events_count: exportData.length,
        participants_count: participantIds.length,
        data: exportData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Study export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
