import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

interface HomeScreenProps {
  onStartScan: () => void;
}

const HomeScreen = ({ onStartScan }: HomeScreenProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getUserInitials = () => {
    if (!user?.email) return "U";
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-screen text-center bg-gradient-radial-forest">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSelector />
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-500 text-gray-900 text-xs font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
          >
            <User className="mr-2 h-4 w-4" />
            {t('common.signIn')}
          </Button>
        )}
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-white">{t('home.title')}</h1>
          <h2 className="text-4xl font-bold text-emerald-400">{t('home.subtitle')}</h2>
        </header>
        <main className="w-full max-w-2xl">
          <p className="mb-8 text-xl font-medium text-foreground/90">
            {t('home.description')}
          </p>
          <Button 
            onClick={onStartScan}
            className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-[0_0_30px_rgba(16,185,129,0.3),0_0_15px_rgba(16,185,129,0.2),0_4px_12px_rgba(0,0,0,0.4)] hover:animate-[gentle-pulse_1.5s_ease-in-out_infinite] transition-colors duration-300"
          >
            {t('home.startScan')}
          </Button>
        </main>
      </div>
      <footer className="w-full py-4 px-4 pb-40 space-y-3">
        <p className="text-xs whitespace-pre-line" style={{ color: '#B0B8B6' }}>
          {t('home.footer')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-emerald-400/70 hover:text-emerald-400"
        >
          <Info className="mr-2 h-4 w-4" />
          About this App
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;
