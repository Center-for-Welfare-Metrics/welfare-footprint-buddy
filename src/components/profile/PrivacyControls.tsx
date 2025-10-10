import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Info } from 'lucide-react';

interface PrivacyControlsProps {
  userId: string;
}

const PrivacyControls = ({ userId }: PrivacyControlsProps) => {
  const [anonymousUsage, setAnonymousUsage] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPrivacySettings();
  }, [userId]);

  const loadPrivacySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('anonymous_usage, notifications_enabled')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setAnonymousUsage(data.anonymous_usage || false);
        setNotificationsEnabled(data.notifications_enabled ?? true);
      }
    } catch (error: any) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const handleToggle = async (field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ [field]: value })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Privacy setting updated');
    } catch (error: any) {
      toast.error('Failed to update setting');
    }
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Scan history cleared successfully');
    } catch (error: any) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    } finally {
      setClearingHistory(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Delete user data (profiles table has ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Sign out
      await signOut();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Privacy & Data Controls</CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage your privacy settings and data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Retention Info */}
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Data Retention Policy</p>
              <p className="text-muted-foreground">
                Your scan history is automatically deleted after 30 days. You can manually clear it anytime below.
              </p>
            </div>
          </div>
        </div>

        {/* Clear History */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-foreground">Scan History</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete all your saved scans and analysis results
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="w-full sm:w-auto" disabled={clearingHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                {clearingHistory ? 'Clearing...' : 'Clear History'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear scan history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your saved scans and analysis results. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Privacy Toggles */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymous" className="text-foreground">Anonymous Usage</Label>
              <p className="text-sm text-muted-foreground">
                Hide your identity from analytics
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={anonymousUsage}
              onCheckedChange={(checked) => {
                setAnonymousUsage(checked);
                handleToggle('anonymous_usage', checked);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-foreground">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={(checked) => {
                setNotificationsEnabled(checked);
                handleToggle('notifications_enabled', checked);
              }}
            />
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-6 border-t border-border">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-destructive">Danger Zone</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="w-full sm:w-auto">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Your profile and preferences</li>
                      <li>All scan history</li>
                      <li>Saved favorites</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivacyControls;
