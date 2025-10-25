import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import diversePeopleDining from "@/assets/diverse-people-dining.png";
import foodPattern from "@/assets/food-pattern.png";

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
    <div className="flex flex-col min-h-screen text-center bg-gradient-radial-forest relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img 
          src={foodPattern} 
          alt="" 
          className="absolute top-0 left-0 w-full h-full object-cover animate-float"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 opacity-20 pointer-events-none">
        <img 
          src={diversePeopleDining} 
          alt="" 
          className="w-full max-w-4xl mx-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
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
      
      <div className="flex-grow flex flex-col items-center justify-center px-4 relative z-10">
        <header className="mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold text-white drop-shadow-md">{t('home.title')}</h1>
          <h2 className="text-4xl font-bold text-accent drop-shadow-md">{t('home.subtitle')}</h2>
        </header>
        <main className="w-full max-w-2xl">
          <p className="mb-8 text-xl font-medium text-foreground/90 drop-shadow-sm">
            {t('home.description')}
          </p>
          <Button 
            onClick={onStartScan}
            className="w-full max-w-xs bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl hover:animate-[gentle-pulse_1.5s_ease-in-out_infinite] transition-all duration-300 animate-bounce-gentle"
          >
            {t('home.startScan')}
          </Button>
        </main>
      </div>
      <footer className="w-full py-4 px-4 pb-40 space-y-3 relative z-10">
        <p className="text-xs whitespace-pre-line" style={{ color: '#B0B8B6' }}>
          {t('home.footer')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-accent/70 hover:text-accent"
        >
          <Info className="mr-2 h-4 w-4" />
          About this App
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;
