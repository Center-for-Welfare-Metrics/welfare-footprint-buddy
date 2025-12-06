import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/integrations/analytics';

// Validation schema for authentication
const authSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
  fullName: z.string().trim().max(100, 'Name must be less than 100 characters').optional()
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Check if user is in password recovery mode
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setIsRecoveryMode(true);
      setIsForgotPassword(false);
      setIsLogin(false);
    }
  }, [location]);

  // Redirect authenticated users to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs using zod schema
      const validationData = {
        email: email.trim(),
        password,
        fullName: isLogin ? undefined : fullName.trim()
      };

      const result = authSchema.safeParse(validationData);
      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        toast.error(errorMessage);
        return;
      }

      // Use validated data
      const validatedEmail = result.data.email;
      const validatedPassword = result.data.password;
      const validatedFullName = result.data.fullName || '';

      if (isLogin) {
        trackEvent("login_started");
        const { error } = await signIn(validatedEmail, validatedPassword);
        if (error) {
          toast.error(error.message);
        } else {
          trackEvent("login_succeeded");
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        trackEvent("signup_started");
        const { error } = await signUp(validatedEmail, validatedPassword, validatedFullName);
        if (error) {
          toast.error(error.message);
        } else {
          trackEvent("signup_succeeded");
          toast.success('Account created successfully!');
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = { email: email.trim(), password: 'dummy123456' };
      const result = authSchema.safeParse(validationData);
      
      if (!result.success) {
        const emailError = result.error.issues.find(issue => issue.path.includes('email'));
        if (emailError) {
          toast.error(emailError.message);
          return;
        }
      }

      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('auth.resetEmailSent'));
        setIsForgotPassword(false);
        setEmail('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        toast.error(t('auth.passwordMismatch'));
        return;
      }

      if (newPassword.length < 8) {
        toast.error(t('auth.passwordTooShort'));
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('auth.passwordUpdated'));
        setIsRecoveryMode(false);
        setNewPassword('');
        setConfirmPassword('');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            {isRecoveryMode 
              ? t('auth.setNewPassword') 
              : isForgotPassword 
              ? t('auth.resetPassword') 
              : isLogin 
              ? t('auth.welcomeBack') 
              : t('auth.createAccount')}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isRecoveryMode
              ? t('auth.setNewPasswordDescription')
              : isForgotPassword
              ? t('auth.resetPasswordDescription')
              : isLogin
              ? t('auth.signInDescription')
              : t('auth.signUpDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRecoveryMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-foreground">{t('auth.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-foreground">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.updatePassword')}
              </Button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-foreground">{t('auth.email')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.sendResetLink')}
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmail('');
                  }}
                >
                  {t('auth.backToLogin')}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.yourName')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              {isLogin && (
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:underline p-0 h-auto"
                    onClick={() => setIsForgotPassword(true)}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : isLogin ? t('common.signIn') : t('common.signUp')}
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <div className="text-center mt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? t('auth.noAccount')
                  : t('auth.hasAccount')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
