import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { userPreferencesSchema } from '@/lib/validation';

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
  const { t, i18n } = useTranslation();

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
      // Validate preferences before updating
      const validated = userPreferencesSchema.parse(preferences);
      
      const { error } = await supabase
        .from('user_preferences')
        .update(validated)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Update i18n language
      i18n.changeLanguage(preferences.preferred_language);
      
      toast.success(t('preferences.preferencesSaved'));
    } catch (error: any) {
      toast.error(t('preferences.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t('preferences.title')}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('preferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ethical-lens" className="text-foreground">{t('preferences.ethicalLens')}</Label>
          <p className="text-sm text-muted-foreground">{t('preferences.ethicalLensDescription')}</p>
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
              <SelectItem value="strict">{t('preferences.ethicalLens_strict')}</SelectItem>
              <SelectItem value="balanced">{t('preferences.ethicalLens_balanced')}</SelectItem>
              <SelectItem value="lenient">{t('preferences.ethicalLens_lenient')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-foreground">{t('preferences.preferredLanguage')}</Label>
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
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="hi">हिन्दी</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region" className="text-foreground">{t('preferences.preferredRegion')}</Label>
          <Input
            id="region"
            placeholder={t('preferences.regionPlaceholder')}
            value={preferences.preferred_region}
            onChange={(e) =>
              setPreferences({ ...preferences, preferred_region: e.target.value })
            }
          />
        </div>

        <Button onClick={handleSave} disabled={loading} variant="secondary" className="text-foreground">
          {loading ? t('common.saving') : t('preferences.savePreferences')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesSettings;
