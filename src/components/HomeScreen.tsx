import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Info, Camera, PenLine, Check, Sparkles, Zap, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import diversePeopleDining from "@/assets/diverse-people-dining-small.png";
import foodPattern from "@/assets/food-pattern.png";
import foodWelfareLogo from "@/assets/food-welfare-logo.png";
import { SUBSCRIPTION_TIERS } from "@/config/subscription.config";

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

  const getTierIcon = (tierKey: string) => {
    switch (tierKey) {
      case 'free':
        return Sparkles;
      case 'basic':
        return Zap;
      case 'pro':
        return Rocket;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-center bg-gradient-radial-forest relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
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
            className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 h-9 hover:bg-background/20 transition-all"
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
            className="h-9 hover:bg-background/20 transition-all"
          >
            <User className="mr-1.5 h-4 w-4" />
            {t('common.signIn')}
          </Button>
        )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-12 sm:mb-14 md:mb-16 animate-fade-in space-y-5 sm:space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-8 sm:mb-10 animate-scale-in">
            <img 
              src={foodWelfareLogo} 
              alt="Food Welfare Explorer Logo" 
              className="w-96 h-96 sm:w-[512px] sm:h-[512px] md:w-[640px] md:h-[640px] lg:w-[768px] lg:h-[768px] object-contain drop-shadow-2xl"
            />
          </div>
          
          {/* Subtitle with fade-in animation */}
          <p className="text-lg sm:text-xl md:text-2xl font-normal text-foreground/95 drop-shadow-md px-2 max-w-[380px] mx-auto leading-relaxed text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Instant AI-powered insights into choices to improve the welfare impact behind everyday foods.
          </p>
          
          {/* Secondary text with delayed fade-in */}
          <p className="text-base sm:text-lg font-normal text-foreground/80 drop-shadow-sm px-2 max-w-[360px] mx-auto leading-relaxed text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Upload a photo or describe your meal to begin exploring.
          </p>
        </header>
        
        <main className="w-full space-y-5 sm:space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          
          {/* Primary Action Buttons */}
          <div className="w-full space-y-4 sm:space-y-5 max-w-md mx-auto px-2">
            <Button 
              onClick={onStartScan}
              className="btn-primary-cta w-full py-7 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Camera className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
              Upload or Take a Photo
            </Button>
            
            <Button 
              onClick={onDescribeFood}
              variant="secondary"
              className="w-full py-7 px-8 text-lg sm:text-xl flex items-center justify-center gap-3 group bg-background/15 hover:bg-background/25 border-2 border-border/40 hover:border-border/60 text-foreground shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <PenLine className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300" />
              Describe the Food
            </Button>
          </div>
        </main>

        {/* Pricing Plans Section */}
        <section className="w-full mt-16 sm:mt-20 px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Choose Your Plan
            </h2>
            <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
              Select the plan that fits your needs and start exploring food welfare today
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.entries(SUBSCRIPTION_TIERS).map(([tierKey, tier]) => {
              const Icon = getTierIcon(tierKey);
              const isMostPopular = tierKey === 'basic';
              
              return (
                <Card 
                  key={tierKey}
                  className={`relative flex flex-col ${
                    isMostPopular 
                      ? 'border-primary shadow-lg scale-105' 
                      : 'border-border/50'
                  }`}
                >
                  {isMostPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        ${tier.price}
                      </span>
                      {tier.price > 0 && <span className="text-muted-foreground">/month</span>}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      onClick={() => navigate('/auth')}
                      variant={isMostPopular ? "default" : "outline"}
                      className="w-full"
                    >
                      {tierKey === 'free' ? 'Get Started' : 'Subscribe'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
      
      {/* Footer */}
      <footer className="w-full py-8 sm:py-10 px-4 sm:px-6 pb-36 sm:pb-44 space-y-5 sm:space-y-6 relative z-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <p className="text-xs sm:text-sm text-center max-w-3xl mx-auto leading-relaxed opacity-60 hover:opacity-80 transition-opacity" style={{ color: '#B0B8B6' }}>
          Prototype — Thanks for helping us test
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/about')}
          className="text-accent/60 hover:text-accent/90 mx-auto transition-all hover:scale-105"
        >
          <Info className="mr-2 h-4 w-4" />
          About this App
        </Button>
      </footer>
    </div>
  );
};

export default HomeScreen;
