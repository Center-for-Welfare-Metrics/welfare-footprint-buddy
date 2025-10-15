import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Validation schema for authentication
const authSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
  fullName: z.string().trim().max(100, 'Name must be less than 100 characters').optional()
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        const { error } = await signIn(validatedEmail, validatedPassword);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(validatedEmail, validatedPassword, validatedFullName);
        if (error) {
          toast.error(error.message);
        } else {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isLogin
              ? t('auth.signInDescription')
              : t('auth.signUpDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : isLogin ? t('common.signIn') : t('common.signUp')}
            </Button>
          </form>

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

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/')}
            >
              {t('home.continueAsGuest')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
