import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trash2, LogOut } from 'lucide-react';
import ScanHistory from '@/components/profile/ScanHistory';
import PreferencesSettings from '@/components/profile/PreferencesSettings';
import PrivacyControls from '@/components/profile/PrivacyControls';
import ProgressInsights from '@/components/profile/ProgressInsights';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data: scans } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user?.id);

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      const exportData = {
        user: {
          email: user?.email,
          created_at: user?.created_at,
        },
        scans,
        preferences,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `welfare-footprint-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 max-w-4xl min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <Button variant="ghost" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="secondary" onClick={handleExportData} disabled={loading} className="text-foreground">
            <Download className="mr-2 h-4 w-4" />
            Export My Data
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="scans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="scans" className="text-muted-foreground data-[state=active]:text-foreground">Scan History</TabsTrigger>
          <TabsTrigger value="insights" className="text-muted-foreground data-[state=active]:text-foreground">Insights</TabsTrigger>
          <TabsTrigger value="preferences" className="text-muted-foreground data-[state=active]:text-foreground">Preferences</TabsTrigger>
          <TabsTrigger value="privacy" className="text-muted-foreground data-[state=active]:text-foreground">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="scans">
          <ScanHistory userId={user.id} />
        </TabsContent>

        <TabsContent value="insights">
          <ProgressInsights userId={user.id} />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings userId={user.id} />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyControls userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
