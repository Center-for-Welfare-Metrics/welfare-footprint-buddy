import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-col min-h-screen text-center">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSelector />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(user ? '/profile' : '/auth')}
        >
          <User className="mr-2 h-4 w-4" />
          {user ? t('common.profile') : t('common.signIn')}
        </Button>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-white">{t('home.title')}</h1>
          <h2 className="text-4xl font-bold text-emerald-400">{t('home.subtitle')}</h2>
        </header>
        <main className="w-full max-w-md">
          <p className="mb-8 text-lg text-gray-400">
            {t('home.description')}
          </p>
          <Button 
            onClick={onStartScan}
            className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-lg shadow-emerald-500/20"
          >
            {t('home.startScan')}
          </Button>
        </main>
      </div>
      <footer className="w-full py-4 px-4 pb-24 space-y-3">
        <p className="text-xs text-gray-500 whitespace-pre-line">
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
