import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle, AlertCircle, Share2, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { appConfig } from "@/config/app.config";
import { ErrorHandler, withRetry } from "@/lib/errorHandler";
import { getEthicalLensFocus, getEthicalLensExamples } from "@/lib/ethicalLensMessaging";

interface AnalysisData {
  productName?: { value: string; confidence: string };
  hasAnimalIngredients: boolean;
  isFood?: boolean;
  animalIngredients?: { value: string; confidence: string };
  productionSystem?: { value: string; confidence: string; assumption?: string };
  welfareConcerns?: { value: string; confidence: string };
  disclaimer?: string;
}

interface Suggestion {
  suggestion: string;
  reason: string;
}

interface ResultsScreenProps {
  data: AnalysisData;
  onNewScan: () => void;
  imageData?: string;
  onReanalyze?: (newData: AnalysisData) => void;
  onBackToItems?: () => void;
  cacheMetadata?: {
    cacheHit: boolean;
    latencyMs: number;
    provider: string;
    model: string;
  } | null;
}

const ResultsScreen = ({ data, onNewScan, imageData, onReanalyze, onBackToItems, cacheMetadata }: ResultsScreenProps) => {
  const [ethicalSwaps, setEthicalSwaps] = useState<any[]>([]);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const [sliderValue, setSliderValue] = useState<number[]>([appConfig.ethicalLens.defaultValue]);
  const [initialSliderValue, setInitialSliderValue] = useState<number[]>([appConfig.ethicalLens.defaultValue]);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();

  // Save scan to history if user is logged in
  useEffect(() => {
    const saveScan = async () => {
      if (!user || !data) return;

      try {
        await supabase.from('scans').insert([{
          user_id: user.id,
          product_name: data.productName?.value || 'Unknown',
          welfare_category: data.welfareConcerns?.value?.substring(0, 100) || '',
          analysis_result: data as any,
          image_url: imageData,
        }]);
      } catch (error) {
        console.error('Failed to save scan:', error);
      }
    };

    saveScan();
  }, [user, data, imageData]);

  const getConfidenceMeter = (confidence?: string) => {
    const level = (confidence || appConfig.ai.confidenceThresholds.low).toLowerCase();
    const config = appConfig.confidenceMeter.levels;
    
    let width = config.low.width;
    let color = config.low.color;
    
    if (level === 'medium') {
      width = config.medium.width;
      color = config.medium.color;
    } else if (level === 'high') {
      width = config.high.width;
      color = config.high.color;
    }
    
    return (
      <div className="w-full bg-gray-700 rounded-full h-1.5" title={`Data Confidence: ${confidence}`}>
        <div className={`${color} ${width} h-1.5 rounded-full`}></div>
      </div>
    );
  };

  const handleEthicalSwap = async () => {
    const productName = data.productName?.value;
    const animalIngredients = data.animalIngredients?.value;
    if (!productName || !animalIngredients) return;

    setIsLoadingSwaps(true);
    try {
      // Normalize language code (e.g., "en-GB" -> "en")
      const languageCode = i18n.language.split('-')[0];
      
      console.log('🎯 [handleEthicalSwap] Sending request with:', {
        productName,
        animalIngredients,
        ethicalLens: sliderValue[0],
        language: languageCode,
        sliderValue,
        displayedLens: sliderValue[0] === 1 ? 'Concerned Omnivore' :
                       sliderValue[0] === 2 ? 'Strong Welfare' :
                       sliderValue[0] === 3 ? 'Reducitarian' :
                       sliderValue[0] === 4 ? 'Vegetarian' :
                       sliderValue[0] === 5 ? 'Vegan' : 'Unknown'
      });
      
      const { data: result, error } = await supabase.functions.invoke('suggest-ethical-swap', {
        body: { 
          productName,
          animalIngredients,
          ethicalLens: sliderValue[0],
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
        throw new Error(result.error.message || result.error);
      }

      const parsedResult = JSON.parse(result.candidates[0].content.parts[0].text);
      setEthicalSwaps([parsedResult]);
    } catch (error: any) {
      console.error('[handleEthicalSwap] Full error:', error);
      const errorMessage = error?.message || error?.error?.message || "An error occurred";
      toast({
        title: "Failed to load suggestions",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSwaps(false);
    }
  };

  const handleSliderCommit = (value: number[]) => {
    // Only trigger action if value changed from initial
    if (value[0] !== initialSliderValue[0]) {
      // Clear ethical swaps and reset to show button again
      setEthicalSwaps([]);
      setInitialSliderValue(value);
    }
  };

  const handleChallengeAnalysis = async () => {
    if (!imageData || !onReanalyze) return;

    setIsReanalyzing(true);
    try {
      // Parse the imageData string back to object
      const parsedImageData = JSON.parse(imageData);
      
      const { data: result, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            imageData: parsedImageData,
            additionalInfo: additionalInfo.trim() || undefined,
            language: i18n.language
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      const analysisData = result.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(analysisData.replace(/```json\n?|\n?```/g, ''));
      
      onReanalyze(parsedData);
      setChallengeOpen(false);
      setAdditionalInfo("");
      toast({
        title: t('results.reanalysisComplete'),
        description: t('results.reanalysisCompleteDesc'),
      });
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleChallengeAnalysis');
      toast({
        title: appError.retryable ? "Reanalysis Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const { error } = await withRetry(async () => {
        const shareToken = crypto.randomUUID();
        const expiresAt = user ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        // Include complete analysis with ethical suggestions
        const completeAnalysis = {
          ...data,
          ethicalSwaps: ethicalSwaps.length > 0 ? ethicalSwaps : null,
          ethicalLensValue: sliderValue[0],
          cacheMetadata,
        };

        const res = await supabase
          .from('shared_results')
          .insert([{
            user_id: user?.id || null,
            analysis_data: completeAnalysis as any,
            share_token: shareToken,
            expires_at: expiresAt
          }]);

        if (res.error) throw res.error;

        const url = `${window.location.origin}/share/${shareToken}`;
        setShareUrl(url);
        
        return res;
      }, 2, 1000);

      if (error) throw error;

      toast({
        title: t('results.shareLinkCreated'),
        description: user 
          ? t('results.shareLinkPermanent')
          : t('results.shareLinkTemporary'),
      });
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleShare');
      toast({
        title: appError.retryable ? "Share Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t('results.linkCopied'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t('results.copyFailed'),
        variant: "destructive",
      });
    }
  };

  // Check if the image doesn't contain food first
  if (data.isFood === false) {
    return (
      <div className="p-4 pb-32 glass-card rounded-2xl animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Animal Item Welfare Assessment</h1>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-bold text-2xl text-amber-400 mb-4">{t('results.notFoodProduct')}</h3>
          <p className="text-gray-300 text-lg">
            {t('results.notFoodDescription')}
          </p>
        </div>

        <Button
          onClick={onNewScan}
          className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          {t('scanner.uploadImage')}
        </Button>
      </div>
    );
  }

  if (!data.hasAnimalIngredients) {
    console.log('Non-animal product view - imageData:', imageData ? 'present' : 'missing', 'onReanalyze:', onReanalyze ? 'present' : 'missing');
    
    // Check confidence level for uncertainty warning
    const productNameConfidence = data.productName?.confidence || 'Low';
    const hasLowConfidence = productNameConfidence === 'Low' || productNameConfidence === 'Medium';
    
    return (
      <div className="p-4 pb-32 glass-card rounded-2xl animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Animal Item Welfare Assessment</h1>
        <div className="text-center p-8">
          <h3 className="font-bold text-2xl text-emerald-400 mb-2">
            {data.productName?.value || t('results.productAnalysis')}
          </h3>
          <p className="text-gray-300">
            {t('results.noAnimalIngredients')}
          </p>
          <p className="text-gray-400 text-sm mt-4">
            {t('results.outOfScope')}
          </p>
          <p className="text-emerald-300 text-base font-medium mt-6">
            {t('results.welfareFriendly')}
          </p>
        </div>
        {imageData && onReanalyze ? (
          <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full mt-4 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {t('results.challengeAnalysis')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{t('results.challengeTitle')}</DialogTitle>
            </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="info" className="text-gray-300">{t('results.challengeDescription')}</Label>
                  <Textarea
                    id="info"
                    placeholder={t('results.challengePlaceholder')}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    rows={5}
                  />
                </div>
                <Button 
                  onClick={handleChallengeAnalysis}
                  disabled={isReanalyzing || !additionalInfo.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isReanalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('results.reanalyzing')}
                    </>
                  ) : (
                    t('results.reanalyzeProduct')
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-gray-500 text-center mt-4">Debug: imageData={imageData ? 'yes' : 'no'} onReanalyze={onReanalyze ? 'yes' : 'no'}</p>
        )}

        {onBackToItems && (
          <Button
            onClick={onBackToItems}
            variant="outline"
            className="w-full mt-4 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            {t('itemSelection.backToItems')}
          </Button>
        )}
        
        <Button
          onClick={() => {
            console.log('[ResultsScreen] Scan New Item clicked - non-animal product');
            onNewScan();
          }}
          className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold shadow-lg shadow-emerald-500/20 relative z-50"
        >
          {t('scanner.scanNew')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 glass-card rounded-2xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Animal Item Welfare Assessment</h1>
      
      {/* Prominent Disclaimer */}
      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100">
            <p className="font-semibold mb-1">Preliminary AI-Generated Estimate</p>
            <p className="text-amber-200/90">
              This is a preliminary AI-generated estimate based on general welfare criteria. It has not been formally reviewed or approved by the Welfare Footprint Institute. Please verify independently before making decisions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-700 pb-3">
          <h3 className="font-bold text-emerald-400 mb-1">{t('results.product')}</h3>
          <p className="text-gray-300">{data.productName?.value || 'N/A'}</p>
        </div>

        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">{t('results.productionSystem')}</h3>
            <div className="w-1/3">{getConfidenceMeter(data.productionSystem?.confidence)}</div>
          </div>
          <p className="text-gray-300">{data.productionSystem?.value || 'N/A'}</p>
          {data.productionSystem?.assumption && (
            <p className="text-xs text-gray-400 mt-2 italic">{data.productionSystem.assumption}</p>
          )}
        </div>

        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">{t('results.welfareConcerns')}</h3>
            <div className="w-1/3">{getConfidenceMeter(data.welfareConcerns?.confidence)}</div>
          </div>
          <p className="text-gray-300 whitespace-pre-wrap">{data.welfareConcerns?.value || 'N/A'}</p>
        </div>

        <div className="border-b border-gray-700 pb-4">
          <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
            <div className="flex justify-start items-center">
              <Label className="text-sm font-medium text-emerald-400">{t('ethicalLens.title')}</Label>
            </div>
            <div className="text-center space-y-1">
              <p 
                className="text-xs font-medium italic transition-colors duration-300"
                style={{
                  color: appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]
                }}
              >
                "{sliderValue[0] === 1 ? t('ethicalLens.persona1') :
                  sliderValue[0] === 2 ? t('ethicalLens.persona2') :
                  sliderValue[0] === 3 ? t('ethicalLens.persona3') :
                  sliderValue[0] === 4 ? t('ethicalLens.persona4') :
                  t('ethicalLens.persona5')}"
              </p>
              <p 
                className="text-sm font-semibold transition-colors duration-300"
                style={{
                  color: appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]
                }}
              >
                {sliderValue[0] === 1 ? t('ethicalLens.level1') :
                 sliderValue[0] === 2 ? t('ethicalLens.level2') :
                 sliderValue[0] === 3 ? t('ethicalLens.level3') :
                 sliderValue[0] === 4 ? t('ethicalLens.level4') :
                 t('ethicalLens.level5')}
              </p>
            </div>
            <div className="relative">
              <style>{`
                .ethical-lens-slider [role="slider"] {
                  background-color: ${appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]} !important;
                  border-color: ${appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]} !important;
                  box-shadow: 0 0 20px ${appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]}80 !important;
                  transition: all 0.3s ease;
                }
              `}</style>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                onValueCommit={handleSliderCommit}
                max={5}
                min={1}
                step={1}
                className="w-full ethical-lens-slider"
              />
            </div>
            <div className="flex justify-between text-xs font-medium -mx-2">
              <div className="flex flex-col items-start">
                <span className="text-lg mb-1" style={{ color: appConfig.ethicalLens.colors[1] }}>←</span>
                <span style={{ color: appConfig.ethicalLens.colors[1] }}>{t('ethicalLens.rangeStart')}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg mb-1" style={{ color: appConfig.ethicalLens.colors[5] }}>→</span>
                <span className="text-right" style={{ color: appConfig.ethicalLens.colors[5] }}>{t('ethicalLens.rangeEnd')}</span>
              </div>
            </div>
            {/* Ethical Lens Guidance - Focus */}
            <div className="space-y-3">
              <p 
                className="text-sm font-semibold text-center transition-colors duration-300"
                style={{
                  color: appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]
                }}
              >
                {getEthicalLensFocus(sliderValue[0])}
              </p>
              
              {/* Ethical Lens Guidance - Examples */}
              <div className="space-y-2">
                {getEthicalLensExamples(sliderValue[0]).map((example, index) => (
                  <div 
                    key={index}
                    className="flex gap-2 items-start text-xs text-gray-300 bg-gray-800/30 p-2 rounded"
                  >
                    <span 
                      className="text-lg leading-none mt-0.5 flex-shrink-0"
                      style={{
                        color: appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]
                      }}
                    >
                      •
                    </span>
                    <span className="leading-relaxed">{example}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-3">
          <div>
            {ethicalSwaps.length === 0 ? (
              <Button 
                onClick={handleEthicalSwap}
                disabled={isLoadingSwaps}
                className="w-full text-white font-bold transition-all duration-300"
                style={{
                  backgroundColor: appConfig.ethicalLens.colors[sliderValue[0] as 1 | 2 | 3 | 4 | 5]
                }}
              >
                {isLoadingSwaps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('results.findingSwaps')}
                  </>
                ) : (
                  <>{t('results.suggestAlternatives')}</>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-emerald-400">
                  {ethicalSwaps[0]?.ethicalLensPosition || t('results.suggestedAlternatives')}
                </h3>
                {ethicalSwaps[0]?.generalNote && (
                  <p className="text-xs text-gray-400 italic border-l-2 border-emerald-500/50 pl-3 py-2">
                    {ethicalSwaps[0].generalNote}
                  </p>
                )}
                <div className="space-y-3">
                  {ethicalSwaps[0]?.suggestions?.map((swap: any, index: number) => (
                    <Card key={index} className="p-4 bg-gray-800 border-gray-700">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-sm text-white">{swap.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                            swap.confidence === 'High' ? 'bg-emerald-900/50 text-emerald-300' :
                            swap.confidence === 'Medium' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {swap.confidence} {t('results.confidence')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{swap.description}</p>
                        <div className="text-xs space-y-1">
                          <p className="text-gray-400">
                            <span className="font-medium text-emerald-400">{t('results.reasoning')}</span> {swap.reasoning}
                          </p>
                          {swap.availability && (
                            <p className="text-gray-400">
                              <span className="font-medium text-emerald-400">{t('results.availability')}</span> {swap.availability}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-800/50 border border-gray-700 text-gray-300 rounded-lg text-center">
          <h3 className="font-bold">{t('results.disclaimer')}</h3>
          <p className="text-xs">
            {(data.disclaimer || t('results.defaultDisclaimer')).split('Welfare Footprint Institute').map((part, index, arr) => (
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
      </div>

        {/* Action Buttons - 2x2 Grid on desktop, stacked on mobile */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Share Button */}
          {!shareUrl ? (
            <Button
              onClick={handleShare}
              disabled={isSharing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('results.creatingShareLink')}
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  {t('results.shareResults')}
                </>
              )}
            </Button>
          ) : (
            <div className="md:col-span-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300 mb-2 font-medium">
                {user ? t('results.shareLinkPermanent') : t('results.shareLinkTemporary')}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-gray-800 border-gray-700 text-white text-sm px-3 py-2 rounded"
                />
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Back to Items Button */}
          {onBackToItems && (
            <Button
              onClick={onBackToItems}
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            >
              {t('itemSelection.backToItems')}
            </Button>
          )}
          
          {/* Scan New Item Button */}
          <Button
            onClick={() => {
              console.log('[ResultsScreen] Scan New Item button clicked - main results');
              onNewScan();
            }}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-semibold shadow-lg shadow-emerald-500/20 relative z-50 pointer-events-auto"
          >
            {t('scanner.scanNew')}
          </Button>
        </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-20 right-4 bg-gray-700 hover:bg-gray-600 text-white w-12 h-12 rounded-full shadow-lg z-50"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">How to Use This App</DialogTitle>
          </DialogHeader>
          <div className="text-gray-300 space-y-4 text-sm">
            <p><strong>1. Scan a Product:</strong> Use the 'Start Scan' button to upload an image of a food product.</p>
            <p><strong>2. View Analysis:</strong> The app will provide an AI-powered preliminary analysis of the product's potential animal welfare impact.</p>
            <p><strong>3. Ethical Lens ⚖️:</strong> On the results screen, use the slider to weigh the importance of intense vs. prolonged suffering. This will re-rank the 'Ethical Swap Suggestions' based on your values.</p>
            <p><strong>4. Knowledge Gaps 🗺️:</strong> Look for the 'Data Confidence' meters. These show how much scientific data is available for each part of the analysis. Low scores highlight where more research is needed!</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsScreen;
