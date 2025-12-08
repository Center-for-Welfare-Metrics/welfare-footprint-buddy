import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface NavigationWrapperProps {
  children: React.ReactNode;
  onBack?: () => void;
  isProcessing?: boolean;
}

const NavigationWrapper = ({ 
  children, 
  onBack, 
  isProcessing = false 
}: NavigationWrapperProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between p-4 max-w-6xl mx-auto w-full bg-background/80 backdrop-blur-sm">
        {/* Back Button */}
        <div className="flex-1">
          {onBack && (
            <button 
              onClick={onBack}
              className="text-emerald-400 hover:underline transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              ← {t('common.back')}
            </button>
          )}
        </div>

        {/* Home Icon - Always visible, right aligned */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoHome}
            disabled={isProcessing}
            className="text-emerald-400 hover:bg-emerald-400/10 transition-all duration-200"
            aria-label={t('common.home', 'Return to Home')}
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default NavigationWrapper;
