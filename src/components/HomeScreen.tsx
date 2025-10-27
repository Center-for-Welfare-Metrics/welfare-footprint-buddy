import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info, Camera, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import diversePeopleDining from "@/assets/diverse-people-dining.png";
import foodPattern from "@/assets/food-pattern.png";

interface HomeScreenProps {
  onStartScan: () => void;
  onDescribeFood: () => void;
}

const HomeScreen = ({ onStartScan, onDescribeFood }: HomeScreenProps) => {
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
      <div className="absolute bottom-0 left-0 right-0 opacity-20 pointer-events-none">
        <img 
          src={diversePeopleDining} 
          alt="" 
          className="w-full max-w-4xl mx-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      
      {/* Header with Language Selector and Sign In */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 left-3 sm:left-4 flex items-center justify-between gap-2 sm:gap-4 z-10">
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSelector />
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 h-9"
          >
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
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
            className="h-9"
          >
            <User className="mr-1.5 h-4 w-4" />
            {t('common.signIn')}
          </Button>
        )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-8 sm:mb-10 md:mb-12 animate-fade-in space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg leading-tight">
            {t('home.title')}
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-medium text-accent drop-shadow-md px-2">
            {t('home.subtitle')}
          </h2>
          <p className="text-base sm:text-lg text-white/90 drop-shadow-sm px-2 max-w-2xl mx-auto">
            Choose how you'd like to start — upload a photo or describe your meal.
          </p>
        </header>
        
        <main className="w-full space-y-5 sm:space-y-6">
          <p className="text-base sm:text-lg md:text-xl font-normal text-foreground/85 drop-shadow-sm px-2 max-w-2xl mx-auto leading-relaxed">
            {t('home.description')}
          </p>
          
          {/* Primary Action Buttons */}
          <div className="w-full space-y-4 sm:space-y-5 max-w-md mx-auto px-2">
            <Button 
              onClick={onStartScan}
              className="btn-primary-cta w-full py-6 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group"
            >
              <Camera className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
              {t('home.startScan')}
            </Button>
            
            <Button 
              onClick={onDescribeFood}
              className="btn-primary-cta w-full py-6 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group"
            >
              <PenLine className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
              Describe the Food
            </Button>
          </div>
        </main>
      </div>
      {/* Footer */}
      <footer className="w-full py-8 sm:py-10 px-4 sm:px-6 pb-36 sm:pb-44 space-y-5 sm:space-y-6 relative z-10">
        <p className="text-xs sm:text-sm whitespace-pre-line max-w-3xl mx-auto leading-relaxed opacity-70" style={{ color: '#B0B8B6' }}>
          {t('home.footer')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-accent/60 hover:text-accent/90 mx-auto transition-colors"
        >
          <Info className="mr-2 h-4 w-4" />
          About this App
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;
