import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Sparkles, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { appConfig } from "@/config/app.config";
import { getEthicalLensFocus, getEthicalLensExamples } from "@/lib/ethicalLensMessaging";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/integrations/analytics";
import NavigationWrapper from "@/components/NavigationWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DailyLimitDialog } from "@/components/DailyLimitDialog";

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
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  
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
  const [ethicalSwaps, setEthicalSwaps] = useState<any[]>([]);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showDailyLimitDialog, setShowDailyLimitDialog] = useState(false);
  
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
    // Clear alternatives when lens changes
    setEthicalSwaps([]);
    setShowAlternatives(false);
  };

  const handleEthicalSwap = async () => {
    const productName = passedState?.analysisData?.productName?.value;
    const animalIngredients = passedState?.analysisData?.animalIngredients?.value;
    if (!productName || !animalIngredients) return;

    setIsLoadingSwaps(true);
    setShowAlternatives(true);
    
    // Track swap suggestion requested
    trackEvent("swap_suggestion_requested", { 
      lens: selectedLens, 
      productCategory: productName 
    });
    
    try {
      // Normalize language code (e.g., "en-GB" -> "en")
      const languageCode = i18n.language.split('-')[0];
      
      console.log('🎯 [handleEthicalSwap] Sending request with:', {
        productName,
        animalIngredients,
        ethicalLens: selectedLens,
        language: languageCode,
        displayedLens: selectedLens === 1 ? 'Higher-Welfare Omnivore' :
                       selectedLens === 2 ? 'Lower Consumption' :
                       selectedLens === 3 ? 'No Slaughter' :
                       selectedLens === 4 ? 'No Animal Use' : 'Unknown'
      });
      
      const { data: result, error } = await supabase.functions.invoke('suggest-ethical-swap', {
        body: { 
          productName,
          animalIngredients,
          ethicalLens: selectedLens,
          language: languageCode
        }
      });

      if (error) {
        console.error('[handleEthicalSwap] Edge function error:', error);
        throw error;
      }

      // Check if result contains an error (from the function's error response)
      if (result?.error) {
        console.error('[handleEthicalSwap] Function returned error:', result.error);
        
        // Handle 422 validation errors differently (non-fatal warnings)
        if (result.error.violations) {
          toast({
            title: "Validation Issue",
            description: "The AI generated suggestions that don't align with this ethical lens. Please try again.",
            variant: "default",
          });
          return;
        }
        
        throw new Error(result.error.message || result.error);
      }

      const parsedResult = JSON.parse(result.candidates[0].content.parts[0].text);
      setEthicalSwaps([parsedResult]);
      
      // Track swap suggestion completed
      trackEvent("swap_suggestion_completed", { 
        alternativesCount: parsedResult?.suggestions?.length ?? 0 
      });
    } catch (error: any) {
      // Check for daily limit error
      if (error?.error?.code === 'DAILY_LIMIT_REACHED' || error?.message?.includes('DAILY_LIMIT_REACHED')) {
        console.log('[EthicalLens] Daily limit reached, showing login dialog');
        trackEvent("daily_limit_block", { lens: selectedLens });
        setShowDailyLimitDialog(true);
        setIsLoadingSwaps(false);
        return;
      }
      
      console.error('[handleEthicalSwap] Full error:', error);
      // Improved error messaging for authentication and API issues
      let errorMessage = "An error occurred";
      let errorTitle = "Failed to load suggestions";
      
      if (error?.message?.includes("401") || error?.message?.includes("Unauthorized")) {
        errorTitle = "Authentication Error";
        errorMessage = "There's an issue with your authentication. Please try signing out and signing back in.";
      } else if (error?.message?.includes("missing sub claim") || error?.message?.includes("bad_jwt")) {
        errorTitle = "Session Error";
        errorMessage = "Your session is invalid. Please refresh the page and sign in again.";
      } else {
        errorMessage = error?.message || error?.error?.message || "An error occurred";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSwaps(false);
    }
  };
  
  const handleContinue = () => {
    // Generate alternatives when button is clicked
    handleEthicalSwap();
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
                disabled={isLoadingSwaps}
                className="w-full py-6 text-lg font-bold text-white relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}, ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}dd)`,
                  boxShadow: `0 4px 20px ${appConfig.ethicalLens.colors[selectedLens as 1|2|3|4]}40`
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoadingSwaps ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('results.generatingAlternatives')}
                    </>
                  ) : (
                    <>
                      Continue to Alternatives
                      <Sparkles className="w-5 h-5" />
                    </>
                  )}
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
          
          {/* Disclaimer */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 text-gray-300 rounded-lg text-center mb-8">
            <h3 className="font-bold text-sm">{t('results.disclaimer')}</h3>
            <p className="text-xs">
              {t('results.defaultDisclaimer').split('Welfare Footprint Institute').map((part, index, arr) => (
                index < arr.length - 1 ? (
                  <span key={index}>
                    {part}
                    <a 
                      href="https://welfarefootprint.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Welfare Footprint Institute
                    </a>
                  </span>
                ) : part
              ))}
            </p>
          </div>

          {/* Ethical Alternatives Section - Shows when swaps are loaded or loading */}
          {showAlternatives && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-emerald-400">{t('results.alternatives')}</h3>
                <span 
                  className="text-sm font-medium"
                  style={{ color: appConfig.ethicalLens.colors[selectedLens as 1|2|3|4] }}
                >
                  {selectedLens === 1 ? t('ethicalLens.persona1') :
                   selectedLens === 2 ? t('ethicalLens.persona2') :
                   selectedLens === 3 ? t('ethicalLens.persona3') :
                   t('ethicalLens.persona4')}
                </span>
              </div>

              {isLoadingSwaps ? (
                <div className="flex items-center justify-center p-8 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mr-3" />
                  <span className="text-gray-300">{t('results.generatingAlternatives')}</span>
                </div>
              ) : ethicalSwaps[0]?.suggestions?.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {ethicalSwaps[0].suggestions.map((swap: any, idx: number) => (
                      <Card key={idx} className="p-4 bg-gray-800/50 border-gray-700">
                        <div className="flex gap-3">
                          <Sparkles className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{swap.name}</h4>
                            <p className="text-sm text-gray-300 mb-2">{swap.description}</p>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-400">
                                <span className="font-medium text-emerald-400">{t('results.reasoning')}:</span> {swap.reasoning}
                              </p>
                              <p className="text-xs text-gray-400">
                                <span className="font-medium text-emerald-400">{t('results.availability')}:</span> {swap.availability}
                              </p>
                              <p className="text-xs text-gray-400">
                                <span className="font-medium text-emerald-400">{t('results.confidence')}:</span> {swap.confidence}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {ethicalSwaps[0].generalNote && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-200 text-xs">
                        <strong>Note:</strong> {ethicalSwaps[0].generalNote}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm">
                    {t('results.noAlternativesGenerated')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily limit dialog */}
      <DailyLimitDialog 
        open={showDailyLimitDialog} 
        onOpenChange={setShowDailyLimitDialog}
      />
    </NavigationWrapper>
  );
};

export default EthicalLens;