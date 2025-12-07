import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app.config";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/integrations/analytics";
import NavigationWrapper from "@/components/NavigationWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DailyLimitDialog } from "@/components/DailyLimitDialog";

const EthicalAlternatives = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  
  // Get passed state from navigation
  const passedState = location.state as { 
    analysisData?: any; 
    imageData?: string;
    selectedLens?: number;
  } | null;
  
  const selectedLens = passedState?.selectedLens || appConfig.ethicalLens.defaultValue;
  
  const [ethicalSwaps, setEthicalSwaps] = useState<any[]>([]);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(true);
  const [showDailyLimitDialog, setShowDailyLimitDialog] = useState(false);

  // Auto-generate alternatives when page loads
  useEffect(() => {
    const generateAlternatives = async () => {
      const productName = passedState?.analysisData?.productName?.value;
      const animalIngredients = passedState?.analysisData?.animalIngredients?.value;
      
      if (!productName || !animalIngredients) {
        console.error('[EthicalAlternatives] Missing required data:', { productName, animalIngredients });
        toast({
          title: "Missing Data",
          description: "Unable to generate alternatives. Please go back and try again.",
          variant: "destructive",
        });
        setIsLoadingSwaps(false);
        return;
      }

      // Track swap suggestion requested
      trackEvent("swap_suggestion_requested", { 
        lens: selectedLens, 
        productCategory: productName 
      });
      
      try {
        // Normalize language code (e.g., "en-GB" -> "en")
        const languageCode = i18n.language.split('-')[0];
        
        console.log('🎯 [EthicalAlternatives] Sending request with:', {
          productName,
          animalIngredients,
          ethicalLens: selectedLens,
          language: languageCode
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
          console.error('[EthicalAlternatives] Edge function error:', error);
          throw error;
        }

        // Check if result contains an error (from the function's error response)
        if (result?.error) {
          console.error('[EthicalAlternatives] Function returned error:', result.error);
          
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
          console.log('[EthicalAlternatives] Daily limit reached, showing login dialog');
          trackEvent("daily_limit_block", { lens: selectedLens });
          setShowDailyLimitDialog(true);
          setIsLoadingSwaps(false);
          return;
        }
        
        console.error('[EthicalAlternatives] Full error:', error);
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

    generateAlternatives();
  }, [passedState, selectedLens, i18n.language, toast]);
  
  const handleBack = () => {
    navigate(-1);
  };

  const getLensLabel = () => {
    switch (selectedLens) {
      case 1: return t('ethicalLens.persona1');
      case 2: return t('ethicalLens.persona2');
      case 3: return t('ethicalLens.persona3');
      case 4: return t('ethicalLens.persona4');
      default: return '';
    }
  };
  
  return (
    <NavigationWrapper onBack={handleBack}>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-4 pb-40">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent mb-3">
              {t('results.alternatives')}
            </h1>
            <p 
              className="text-sm font-medium"
              style={{ color: appConfig.ethicalLens.colors[selectedLens as 1|2|3|4] }}
            >
              {getLensLabel()}
            </p>
          </div>

          {/* Alternatives Content */}
          {isLoadingSwaps ? (
            <div className="flex items-center justify-center p-8 bg-gray-800/30 rounded-lg border border-gray-700">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mr-3" />
              <span className="text-gray-300">{t('results.generatingAlternatives')}</span>
            </div>
          ) : ethicalSwaps[0]?.suggestions?.length > 0 ? (
            <>
              <div className="space-y-3 mb-6">
                {ethicalSwaps[0].suggestions.map((swap: any, idx: number) => (
                  <Card key={idx} className="p-4 bg-gray-800/50 border-gray-700">
                    <div className="flex gap-3">
                      <Sparkles 
                        className="h-5 w-5 flex-shrink-0 mt-0.5" 
                        style={{ color: appConfig.ethicalLens.colors[selectedLens as 1|2|3|4] }}
                      />
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
                <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-200 text-xs">
                    <strong>Note:</strong> {ethicalSwaps[0].generalNote}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700 mb-6">
              <p className="text-gray-400 text-sm">
                {t('results.noAlternativesGenerated')}
              </p>
            </div>
          )}

          {/* Disclaimer - Only shown on this page */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 text-gray-300 rounded-lg text-center mb-6">
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

          {/* Check Other Lens Button */}
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ethicalLens.checkOtherLens', 'Check Other Ethical Lens Alternatives')}
          </Button>
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

export default EthicalAlternatives;