import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info, Camera, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import diversePeopleDining from "@/assets/diverse-people-dining-small.png";
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
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 sm:mb-12 md:mb-14 animate-fade-in space-y-4 sm:space-y-5">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg leading-tight text-center">
            Food Welfare Explorer
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-normal text-foreground/90 drop-shadow-sm px-2 max-w-[340px] mx-auto leading-relaxed text-center">
            Instant AI-powered insights into choices to improve the welfare impact behind everyday foods.
          </p>
          <p className="text-sm sm:text-base font-normal text-foreground/75 drop-shadow-sm px-2 max-w-[340px] mx-auto leading-relaxed text-center">
            Upload a photo or describe your meal to begin exploring.
          </p>
        </header>
        
        <main className="w-full space-y-5 sm:space-y-6">
          
          {/* Primary Action Buttons */}
          <div className="w-full space-y-4 sm:space-y-5 max-w-md mx-auto px-2">
            <Button 
              onClick={onStartScan}
              className="btn-primary-cta w-full py-6 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group"
            >
              <Camera className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
              Upload or Take a Photo
            </Button>
            
            <Button 
              onClick={onDescribeFood}
              variant="secondary"
              className="w-full py-6 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group bg-background/10 hover:bg-background/20 border border-border/30 text-foreground"
            >
              <PenLine className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
              Describe the Food
            </Button>
          </div>
        </main>
      </div>
      {/* Footer */}
      <footer className="w-full py-8 sm:py-10 px-4 sm:px-6 pb-36 sm:pb-44 space-y-5 sm:space-y-6 relative z-10">
        <p className="text-xs sm:text-sm text-center max-w-3xl mx-auto leading-relaxed opacity-60" style={{ color: '#B0B8B6' }}>
          Prototype — Thanks for helping us test
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
