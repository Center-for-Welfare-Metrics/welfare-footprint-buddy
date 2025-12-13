import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info, Camera, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import foodWelfareLogo from "@/assets/food-welfare-logo.png";

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
      {/* Subtle texture overlay */}
      <div className="texture-noise absolute inset-0" />
      
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-float-slow"
          style={{ background: 'radial-gradient(circle, hsl(203 100% 40% / 0.12) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] rounded-full blur-[140px] animate-float-slow"
          style={{ 
            background: 'radial-gradient(circle, hsl(180 100% 40% / 0.1) 0%, transparent 70%)',
            animationDelay: '2s' 
          }}
        />
        <div 
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[160px] animate-glow-pulse"
          style={{ background: 'radial-gradient(circle, hsl(203 80% 35% / 0.08) 0%, transparent 60%)' }}
        />
      </div>

      {/* Header with Language Selector and Sign In */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex-1" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-2 h-10 rounded-xl hover:bg-background/15 backdrop-blur-sm transition-all duration-300"
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-1 ring-offset-background">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="h-10 px-4 rounded-xl hover:bg-background/15 backdrop-blur-sm transition-all duration-300 text-foreground/90 hover:text-foreground"
              >
                <User className="mr-2 h-4 w-4" />
                <span className="font-medium">{t('common.signIn')}</span>
              </Button>
            )}
          </nav>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 relative z-10 max-w-4xl mx-auto w-full">
        <div className="mb-10 sm:mb-12 md:mb-14 space-y-8 sm:space-y-10">
          {/* Logo with refined animation */}
          <div className="flex justify-center animate-fade-in-scale">
            <div className="relative">
              {/* Glow behind logo */}
              <div 
                className="absolute inset-0 blur-3xl opacity-30 scale-75"
                style={{ background: 'radial-gradient(circle, hsl(203 100% 50% / 0.4) 0%, transparent 70%)' }}
              />
              <img 
                src={foodWelfareLogo} 
                alt="Food Welfare Explorer Logo" 
                className="relative w-80 h-80 sm:w-[420px] sm:h-[420px] md:w-[520px] md:h-[520px] lg:w-[600px] lg:h-[600px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          
          {/* Tagline with refined typography */}
          <div className="space-y-5 sm:space-y-6 max-w-lg mx-auto">
            <p 
              className="text-lg sm:text-xl md:text-2xl font-medium text-foreground/95 text-shadow-soft px-4 leading-relaxed tracking-tight animate-fade-in"
              style={{ animationDelay: '0.15s' }}
            >
              Instant AI-powered insights into choices to improve the welfare impact behind everyday foods.
            </p>
            
            {/* Decorative divider */}
            <div 
              className="divider-glow w-24 mx-auto animate-fade-in"
              style={{ animationDelay: '0.25s' }}
            />
            
            <p 
              className="text-base sm:text-lg font-normal text-foreground/70 px-4 max-w-sm mx-auto leading-relaxed animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              Upload a photo or describe your meal to begin exploring.
            </p>
          </div>
        </div>
        
        {/* Primary Action Buttons */}
        <div 
          className="w-full space-y-4 max-w-sm mx-auto animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <Button 
            onClick={onStartScan}
            className="btn-primary-cta w-full py-6 sm:py-7 px-6 text-base sm:text-lg flex items-center justify-center gap-3 group"
          >
            <Camera className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform duration-300" />
            <span>Upload or Take a Photo</span>
          </Button>
          
          <Button 
            onClick={onDescribeFood}
            className="btn-secondary-elegant w-full py-6 sm:py-7 px-6 text-base sm:text-lg flex items-center justify-center gap-3 group text-foreground/90 hover:text-foreground"
          >
            <PenLine className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform duration-300" />
            <span>Describe the Food</span>
          </Button>
        </div>
      </main>
      
      {/* Footer */}
      <footer 
        className="w-full py-8 sm:py-10 px-4 sm:px-6 pb-32 sm:pb-40 space-y-4 relative z-10 animate-fade-in"
        style={{ animationDelay: '0.5s' }}
      >
        <p className="text-xs sm:text-sm text-center max-w-3xl mx-auto leading-relaxed text-muted-foreground/50">
          Prototype — Thanks for helping us test
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-muted-foreground/40 hover:text-muted-foreground/70 mx-auto transition-all duration-300 hover:bg-background/10 rounded-xl"
        >
          <Info className="mr-2 h-4 w-4" />
          <span className="font-medium">About this App</span>
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;