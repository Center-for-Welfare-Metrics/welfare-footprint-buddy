import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Beaker, Shield, UserX, Info } from 'lucide-react';

interface StudyParticipationProps {
  userId: string;
}

interface StudyParticipant {
  id: string;
  treatment_group: string;
  study_version: string;
  study_status: string;
  participant_code: string;
  contact_opt_in: boolean;
  enrolled_at: string;
  withdrawn_at: string | null;
}

const CURRENT_STUDY_VERSION = '1.0';

const StudyParticipation = ({ userId }: StudyParticipationProps) => {
  const [enrollment, setEnrollment] = useState<StudyParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [contactOptIn, setContactOptIn] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);

  useEffect(() => {
    fetchEnrollment();
  }, [userId]);

  const fetchEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_participants')
        .select('*')
        .eq('user_id', userId)
        .eq('study_version', CURRENT_STUDY_VERSION)
        .maybeSingle();

      if (error) throw error;
      setEnrollment(data);
    } catch (error) {
      console.error('Error fetching study enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!consentChecked) {
      toast.error('Please agree to participate by checking the consent box');
      return;
    }

    setEnrolling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to participate');
        return;
      }

      const { data, error } = await supabase.functions.invoke('study-enroll', {
        body: {
          study_version: CURRENT_STUDY_VERSION,
          contact_opt_in: contactOptIn,
        },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.message || data.error);
        return;
      }

      toast.success('Thank you for joining the research study!');
      setShowConsentForm(false);
      setConsentChecked(false);
      setContactOptIn(false);
      await fetchEnrollment();
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error('Failed to enroll in study. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('study-withdraw', {
        body: {
          study_version: CURRENT_STUDY_VERSION,
        },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.message || data.error);
        return;
      }

      toast.success('You have been withdrawn from the study');
      await fetchEnrollment();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to withdraw. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case 'withdrawn':
        return <Badge variant="secondary">Withdrawn</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is enrolled
  if (enrollment) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Research Study</CardTitle>
            </div>
            {getStatusBadge(enrollment.study_status)}
          </div>
          <CardDescription className="text-muted-foreground">
            Study Version {enrollment.study_version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Participant Code:</strong> {enrollment.participant_code}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Enrolled:</strong>{' '}
              {new Date(enrollment.enrolled_at).toLocaleDateString()}
            </p>
            {enrollment.withdrawn_at && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Withdrawn:</strong>{' '}
                {new Date(enrollment.withdrawn_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {enrollment.study_status === 'active' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your app usage is being collected anonymously for research purposes. 
                You can leave the study at any time.
              </AlertDescription>
            </Alert>
          )}

          {enrollment.study_status === 'withdrawn' && (
            <Alert>
              <AlertDescription>
                You have withdrawn from this study. Data collected before withdrawal may be used in anonymized analysis.
                You cannot re-join this study version.
              </AlertDescription>
            </Alert>
          )}

          {enrollment.study_status === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={withdrawing}>
                  <UserX className="mr-2 h-4 w-4" />
                  Leave Study
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Research Study?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      If you leave the study:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Your future app usage will no longer be tracked for research</li>
                      <li>Data collected before withdrawal may still be used in anonymized analysis</li>
                      <li>You cannot re-join this study version</li>
                    </ul>
                    <p className="font-medium">
                      This action cannot be undone.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleWithdraw} disabled={withdrawing}>
                    {withdrawing ? 'Withdrawing...' : 'Leave Study'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    );
  }

  // Not enrolled - show join option
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Join Research Study</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Help improve animal welfare research
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showConsentForm ? (
          <>
            <p className="text-sm text-muted-foreground">
              You can contribute to animal welfare research by allowing your anonymized app usage 
              to be included in our scientific studies. Your privacy is protected at all times.
            </p>
            <Button onClick={() => setShowConsentForm(true)} className="w-full">
              <Beaker className="mr-2 h-4 w-4" />
              Learn More & Join
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Study Consent Information
              </h4>
              
              <div>
                <p className="font-medium text-foreground">What we collect:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Which features you use (scans, alternatives, etc.)</li>
                  <li>Your ethical lens preference</li>
                  <li>Time spent on different screens</li>
                  <li>Anonymized interaction patterns</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground">What we DON'T include in your study data:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Your name, email, or account details</li>
                  <li>Your specific food purchases</li>
                  <li>Location data</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground">Your rights:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Withdraw at any time from Settings</li>
                  <li>Data collected before withdrawal may be used in anonymized form</li>
                  <li>All data is anonymized within 90 days after study completion</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                />
                <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                  I agree to participate in this research study and understand how my data will be used.
                  <span className="text-destructive"> *</span>
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="contact"
                  checked={contactOptIn}
                  onCheckedChange={(checked) => setContactOptIn(checked === true)}
                />
                <Label htmlFor="contact" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
                  I agree to be contacted by the researchers for follow-up questions. (Optional)
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConsentForm(false);
                  setConsentChecked(false);
                  setContactOptIn(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={!consentChecked || enrolling}
                className="flex-1"
              >
                {enrolling ? 'Enrolling...' : 'Join Study'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyParticipation;
