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

interface PrivacyControlsProps {
  userId: string;
}

const PrivacyControls = ({ userId }: PrivacyControlsProps) => {
  const [anonymousUsage, setAnonymousUsage] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
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
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Data Controls</CardTitle>
        <CardDescription>
          Manage your privacy settings and data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="anonymous">Anonymous Usage</Label>
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
            <Label htmlFor="notifications">Notifications</Label>
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

        <div className="pt-6 border-t">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Data Transparency</h4>
              <p className="text-sm text-muted-foreground">
                We only use your data to improve the accuracy of welfare analyses and
                personalize your experience. You can delete your account or history anytime.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers including scan
                    history, preferences, and favorites.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount}>
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
