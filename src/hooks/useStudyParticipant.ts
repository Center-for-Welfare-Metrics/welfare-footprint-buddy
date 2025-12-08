import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StudyParticipant {
  id: string;
  treatment_group: string;
  study_version: string;
  study_status: string;
  participant_code: string;
}

const CURRENT_STUDY_VERSION = '1.0';

export function useStudyParticipant() {
  const { user } = useAuth();
  const [participant, setParticipant] = useState<StudyParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchParticipant = useCallback(async () => {
    if (!user) {
      setParticipant(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('study_participants')
        .select('id, treatment_group, study_version, study_status, participant_code')
        .eq('user_id', user.id)
        .eq('study_version', CURRENT_STUDY_VERSION)
        .eq('study_status', 'active')
        .maybeSingle();

      if (error) throw error;
      setParticipant(data);
    } catch (error) {
      console.error('Error fetching study participant:', error);
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  // Helper to get study fields for event logging
  const getStudyEventFields = useCallback(() => {
    if (!participant || participant.study_status !== 'active') {
      return {};
    }

    return {
      participant_id: participant.id,
      participant_code: participant.participant_code,
      treatment_group: participant.treatment_group,
      study_version: participant.study_version,
    };
  }, [participant]);

  return {
    participant,
    loading,
    isEnrolled: participant?.study_status === 'active',
    getStudyEventFields,
    refetch: fetchParticipant,
  };
}
