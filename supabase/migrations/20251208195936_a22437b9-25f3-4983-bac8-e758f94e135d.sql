-- Study Participants Table
CREATE TABLE public.study_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_group TEXT NOT NULL,
  study_version TEXT NOT NULL DEFAULT '1.0',
  study_status TEXT NOT NULL DEFAULT 'active',
  participant_code TEXT UNIQUE NOT NULL,
  contact_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  anonymized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, study_version)
);

-- Add study columns to user_events
ALTER TABLE public.user_events
ADD COLUMN participant_id UUID REFERENCES public.study_participants(id),
ADD COLUMN participant_code TEXT,
ADD COLUMN treatment_group TEXT,
ADD COLUMN study_version TEXT;

-- Enable RLS on study_participants
ALTER TABLE public.study_participants ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own enrollment (SELECT only)
CREATE POLICY "Users can view their own study enrollment"
ON public.study_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Admins can view all participants
CREATE POLICY "Admins can view all study participants"
ON public.study_participants
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can update participants (e.g., treatment_group changes)
CREATE POLICY "Admins can update study participants"
ON public.study_participants
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Service role has full access (for enrollment, withdrawal, anonymization)
CREATE POLICY "Service role can manage study participants"
ON public.study_participants
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS: Admins can read study-related events
CREATE POLICY "Admins can read study events"
ON public.user_events
FOR SELECT
TO authenticated
USING (
  participant_id IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
);

-- Index for efficient queries
CREATE INDEX idx_study_participants_user_version ON public.study_participants(user_id, study_version);
CREATE INDEX idx_study_participants_status ON public.study_participants(study_status);
CREATE INDEX idx_study_participants_version_status ON public.study_participants(study_version, study_status);
CREATE INDEX idx_user_events_participant ON public.user_events(participant_id) WHERE participant_id IS NOT NULL;