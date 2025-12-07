import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { appConfig } from "@/config/app.config";
import { getEthicalLensFocus, getEthicalLensExamples } from "@/lib/ethicalLensMessaging";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/integrations/analytics";
import NavigationWrapper from "@/components/NavigationWrapper";

// Session storage key for ethical lens
const ETHICAL_LENS_SESSION_KEY = 'ethical_lens_selection';

interface LensOption {
  id: number;
  label: string;
  shortLabel: string;
  color: string;
}

const EthicalLens = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Get passed state from navigation
  const passedState = location.state as { 
    analysisData?: any; 
    imageData?: string;
    currentLens?: number;
  } | null;
  
  // Initialize from session storage, passed state, or default
  const getInitialLens = (): number => {
    // First check passed state
    if (passedState?.currentLens) {
      return passedState.currentLens;
    }
    // Then check session storage
    const stored = sessionStorage.getItem(ETHICAL_LENS_SESSION_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (parsed >= 1 && parsed <= 4) return parsed;
    }
    // Default
    return appConfig.ethicalLens.defaultValue;
  };
  
  const [selectedLens, setSelectedLens] = useState<number>(getInitialLens);
  
  // Persist selection to session storage
  useEffect(() => {
    sessionStorage.setItem(ETHICAL_LENS_SESSION_KEY, String(selectedLens));
  }, [selectedLens]);
  
  const lensOptions: LensOption[] = [
    { 
      id: 1, 
      label: "Higher-Welfare", 
      shortLabel: "Higher-Welfare",
      color: appConfig.ethicalLens.colors[1]
    },
    { 
      id: 2, 
      label: "Lower Consumption", 
      shortLabel: "Lower Consumption",
      color: appConfig.ethicalLens.colors[2]
    },
    { 
      id: 3, 
      label: "No Slaughter", 
      shortLabel: "No Slaughter",
      color: appConfig.ethicalLens.colors[3]
    },
    { 
      id: 4, 
      label: "No Animal Use", 
      shortLabel: "No Animal Use",
      color: appConfig.ethicalLens.colors[4]
    },
  ];
  
  const handleLensSelect = (lensId: number) => {
    setSelectedLens(lensId);
    trackEvent("ethical_lens_changed", { lens: lensId, source: "dedicated_page" });
  };
  
  const handleContinue = () => {
    // Navigate to alternatives page with all necessary data
    navigate('/ethical-alternatives', {
      state: {
        analysisData: passedState?.analysisData,
        imageData: passedState?.imageData,
        selectedLens: selectedLens
      }
    });
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <NavigationWrapper onBack={handleBack}>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-4 pb-40">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                {t('ethicalLens.title')}
              </h1>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="glass-card max-w-md bg-background/95 border border-emerald-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-emerald-400">
                      {t('ethicalLens.title')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-gray-200">
                    <p className="leading-relaxed">
                      The Ethical Lens lets you explore how your food choices align with different levels of concern for animal welfare.
                    </p>
                    <p className="leading-relaxed">
                      You can select the approach that best reflects your values — from Higher-Welfare Omnivore (seeking higher-welfare animal products) to No Animal Use (avoiding all animal products).
                    </p>
                    <p className="leading-relaxed">
                      The app then tailors its recommendations and messages to that perspective, helping you make informed and compassionate choices — without judgment.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your Ethical Lens personalizes the alternatives we suggest. Pick the approach that best reflects your values.
            </p>
          </div>
          
          {/* Lens Selection Cards */}
          <div className="space-y-3 mb-8">
            {lensOptions.map((lens, index) => (
              <Card
                key={lens.id}
                onClick={() => handleLensSelect(lens.id)}
                className={`
                  relative p-4 cursor-pointer transition-all duration-300
                  border-2 bg-gray-800/50 backdrop-blur-sm
                  hover:scale-[1.02] hover:shadow-lg
                  animate-fade-in
                `}
                style={{
                  animationDelay: `${index * 100}ms`,
                  borderColor: selectedLens === lens.id ? lens.color : 'transparent',
                  boxShadow: selectedLens === lens.id ? `0 0 20px ${lens.color}40` : 'none'
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Selection indicator */}
                  <div 
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      transition-all duration-300
                    `}
                    style={{
                      borderColor: lens.color,
                      backgroundColor: selectedLens === lens.id ? lens.color : 'transparent'
                    }}
                  >
                    {selectedLens === lens.id && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 
                        className="font-semibold text-lg"
                        style={{ color: lens.color }}
                      >
                        {lens.label}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {getEthicalLensFocus(lens.id)}
                    </p>
                    
                    {/* Learn more popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 mt-2 text-xs transition-colors hover:opacity-80"
                          style={{ color: lens.color }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Examples</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-72 bg-gray-900/95 border-gray-700 backdrop-blur-sm"
                        side="bottom"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-2">
                          <h4 
                            className="font-semibold text-sm"
                            style={{ color: lens.color }}
                          >
                            {t(`ethicalLens.persona${lens.id}`)}
                          </h4>
                          <div className="space-y-1.5">
                            {getEthicalLensExamples(lens.id).map((example, idx) => (
                              <div 
                                key={idx}
                                className="flex gap-2 items-start text-xs text-gray-300"
                              >
                                <span 
                                  className="text-sm leading-none mt-0.5 flex-shrink-0"
                                  style={{ color: lens.color }}
                                >
                                  •
                                </span>
                                <span className="leading-relaxed">{example}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Continue Button */}
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={handleContinue}
                className="w-full py-6 text-lg font-bold text-white relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}dd)`,
                  boxShadow: `0 4px 20px ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}40`
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Continue to Alternatives
                  <Sparkles className="w-5 h-5" />
                </span>
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}ee, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]})`
                  }}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </NavigationWrapper>
  );
};

export default EthicalLens;