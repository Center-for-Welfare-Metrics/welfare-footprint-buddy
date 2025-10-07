import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Preferences {
  ethical_lens: string;
  preferred_language: string;
  preferred_region: string;
}

interface PreferencesSettingsProps {
  userId: string;
}

const PreferencesSettings = ({ userId }: PreferencesSettingsProps) => {
  const [preferences, setPreferences] = useState<Preferences>({
    ethical_lens: 'balanced',
    preferred_language: 'en',
    preferred_region: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setPreferences({
          ethical_lens: data.ethical_lens || 'balanced',
          preferred_language: data.preferred_language || 'en',
          preferred_region: data.preferred_region || '',
        });
      }
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Preferences saved');
    } catch (error: any) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Preferences</CardTitle>
        <CardDescription>
          Customize your experience with personalized settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ethical-lens">Ethical Lens ⚖️</Label>
          <Select
            value={preferences.ethical_lens}
            onValueChange={(value) =>
              setPreferences({ ...preferences, ethical_lens: value })
            }
          >
            <SelectTrigger id="ethical-lens">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict">Strict - High welfare only</SelectItem>
              <SelectItem value="balanced">Balanced - Moderate standards</SelectItem>
              <SelectItem value="lenient">Lenient - Basic welfare</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Preferred Language</Label>
          <Select
            value={preferences.preferred_language}
            onValueChange={(value) =>
              setPreferences({ ...preferences, preferred_language: value })
            }
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Preferred Region</Label>
          <Input
            id="region"
            placeholder="e.g., North America, Europe"
            value={preferences.preferred_region}
            onChange={(e) =>
              setPreferences({ ...preferences, preferred_region: e.target.value })
            }
          />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesSettings;
