import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info, Camera, PenLine, Sparkles } from "lucide-react";
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
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, hsl(175 50% 30% / 0.25) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse-glow"
          style={{ 
            background: 'radial-gradient(circle, hsl(38 60% 35% / 0.15) 0%, transparent 70%)',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-[60%] left-[5%] w-[300px] h-[300px] rounded-full blur-[80px] animate-float"
          style={{ background: 'radial-gradient(circle, hsl(175 40% 25% / 0.2) 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-4 z-20">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-2 h-10 hover:bg-card/50 transition-all rounded-xl"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="h-10 px-4 hover:bg-card/50 transition-all rounded-xl text-foreground/80 hover:text-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              {t('common.signIn')}
            </Button>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-8 relative z-10 max-w-4xl mx-auto w-full">
        {/* Logo Section */}
        <div className="mb-8 sm:mb-10 animate-scale-in">
          <div className="relative">
            <img 
              src={foodWelfareLogo} 
              alt="Food Welfare Explorer Logo" 
              className="w-72 h-72 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] object-contain drop-shadow-2xl"
            />
            {/* Glow behind logo */}
            <div 
              className="absolute inset-0 -z-10 blur-3xl opacity-40"
              style={{ background: 'radial-gradient(circle, hsl(175 60% 45% / 0.4) 0%, transparent 60%)' }}
            />
          </div>
        </div>
        
        {/* Text Content */}
        <div className="space-y-4 sm:space-y-5 mb-10 sm:mb-12">
          <h1 
            className="text-xl sm:text-2xl md:text-3xl font-display font-medium text-foreground leading-relaxed max-w-lg mx-auto animate-fade-in"
            style={{ animationDelay: '0.15s' }}
          >
            Instant AI-powered insights into the{' '}
            <span className="text-primary">welfare impact</span>{' '}
            behind everyday foods.
          </h1>
          
          <p 
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto animate-fade-in"
            style={{ animationDelay: '0.25s' }}
          >
            Upload a photo or describe your meal to begin exploring.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div 
          className="w-full space-y-4 max-w-sm mx-auto animate-fade-in"
          style={{ animationDelay: '0.35s' }}
        >
          <Button 
            onClick={onStartScan}
            className="btn-primary-cta w-full py-6 px-6 text-base sm:text-lg flex items-center justify-center gap-3 group"
          >
            <Camera className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform duration-300" />
            <span>Upload or Take a Photo</span>
            <Sparkles className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Button>
          
          <Button 
            onClick={onDescribeFood}
            className="btn-secondary w-full py-6 px-6 text-base sm:text-lg flex items-center justify-center gap-3 group"
          >
            <PenLine className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform duration-300" />
            <span>Describe the Food</span>
          </Button>
        </div>
      </main>
      
      {/* Footer */}
      <footer 
        className="w-full py-8 px-4 pb-32 sm:pb-40 space-y-4 relative z-10 animate-fade-in"
        style={{ animationDelay: '0.45s' }}
      >
        <p className="text-xs sm:text-sm text-muted-foreground/60 text-center">
          Prototype — Thanks for helping us test
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-muted-foreground/50 hover:text-primary mx-auto transition-all hover:bg-transparent link-underline"
        >
          <Info className="mr-2 h-4 w-4" />
          About this App
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;
