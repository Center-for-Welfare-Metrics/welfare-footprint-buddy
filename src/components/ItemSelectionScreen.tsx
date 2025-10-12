import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ErrorHandler, withRetry } from "@/lib/errorHandler";

interface DetectedItem {
  name: string;
  likelyHasAnimalIngredients: boolean;
  reasoning: string;
  confidence: string;
}

interface CategoryStyle {
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

const getCategoryStyle = (itemName: string): CategoryStyle | null => {
  const lowerName = itemName.toLowerCase();
  
  // Dairy category
  if (lowerName.includes('dairy') || (lowerName.includes('cheese') && lowerName.includes(','))) {
    return {
      accentColor: 'hsl(217, 91%, 60%)', // soft blue
      bgColor: 'bg-blue-500/5',
      borderColor: 'border-blue-500/30'
    };
  }
  
  // Meat category
  if (lowerName.includes('meat') || lowerName.includes('beef') || lowerName.includes('pork') || lowerName.includes('sausage')) {
    return {
      accentColor: 'hsl(0, 84%, 60%)', // muted red
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/30'
    };
  }
  
  // Seafood category
  if (lowerName.includes('seafood') || lowerName.includes('fish') || lowerName.includes('shrimp')) {
    return {
      accentColor: 'hsl(172, 79%, 40%)', // teal
      bgColor: 'bg-teal-500/5',
      borderColor: 'border-teal-500/30'
    };
  }
  
  // Egg category
  if (lowerName.includes('egg')) {
    return {
      accentColor: 'hsl(45, 93%, 53%)', // golden yellow
      bgColor: 'bg-yellow-500/5',
      borderColor: 'border-yellow-500/30'
    };
  }
  
  // Mixed/general animal-derived
  if (lowerName.includes('ingredient') || lowerName.includes('item') || lowerName.includes('product')) {
    return {
      accentColor: 'hsl(38, 92%, 50%)', // amber
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/30'
    };
  }
  
  return null;
};

const isGroupedItem = (itemName: string): boolean => {
  const lowerName = itemName.toLowerCase();
  return (
    lowerName.includes('ingredient') ||
    lowerName.includes('item') ||
    lowerName.includes('product') ||
    (lowerName.split(',').length > 2)
  );
};

interface ItemSelectionScreenProps {
  items: DetectedItem[];
  summary: string;
  imagePreview: string;
  onItemSelect: (itemName: string) => void;
  onBack: () => void;
  imageData?: string;
  onReanalyze?: (itemName: string, additionalInfo: string) => void;
}

const ItemSelectionScreen = ({ 
  items, 
  summary, 
  imagePreview,
  onItemSelect, 
  onBack,
  imageData,
  onReanalyze
}: ItemSelectionScreenProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [analyzingItemName, setAnalyzingItemName] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const handleItemSelect = (itemName: string) => {
    setAnalyzingItemName(itemName);
    onItemSelect(itemName);
  };

  const handleChallengeAnalysis = async () => {
    if (!imageData || !onReanalyze) return;

    setIsReanalyzing(true);
    try {
      const parsedImageData = JSON.parse(imageData);
      
      const { data: result, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('detect-items', {
          body: { 
            imageData: parsedImageData,
            additionalInfo: additionalInfo.trim() || undefined,
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      setChallengeOpen(false);
      setAdditionalInfo("");
      toast({
        title: t('results.reanalysisComplete'),
        description: t('results.reanalysisCompleteDesc'),
      });

      // Trigger parent reanalysis
      if (onReanalyze) {
        onReanalyze("", additionalInfo);
      }
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

  const animalItems = items.filter(item => item.likelyHasAnimalIngredients);
  const plantItems = items.filter(item => !item.likelyHasAnimalIngredients);

  return (
    <div className="flex flex-col items-center pb-32 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center text-white">
        {t('itemSelection.title')}
      </h1>

      {/* Image Preview */}
      <div className="w-full max-w-md mb-6">
        <img 
          src={imagePreview} 
          alt="Uploaded products" 
          className="w-full h-60 object-contain rounded-xl border-2 border-gray-700"
        />
      </div>

      {/* Summary */}
      <div className="glass-card rounded-2xl p-6 mb-6 w-full">
        <p className="text-gray-200 text-center">{summary}</p>
      </div>

      {/* Animal-derived items */}
      {animalItems.length > 0 && (
        <div className="w-full mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-400" />
            {t('itemSelection.animalDerivedItems')} ({animalItems.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {animalItems.map((item, index) => {
              const categoryStyle = getCategoryStyle(item.name);
              const isGrouped = isGroupedItem(item.name);
              
              return (
                <div 
                  key={index}
                  className={`glass-card rounded-xl overflow-hidden hover:bg-white/10 transition-all border ${
                    categoryStyle ? categoryStyle.borderColor : 'border-white/10'
                  } ${categoryStyle && isGrouped ? categoryStyle.bgColor : ''}`}
                  style={{
                    borderTopWidth: categoryStyle && isGrouped ? '4px' : '1px',
                    borderTopColor: categoryStyle && isGrouped ? categoryStyle.accentColor : undefined
                  }}
                >
                  {/* Grouped Card Header */}
                  {isGrouped && categoryStyle && (
                    <div 
                      className="px-5 pt-4 pb-2"
                      style={{ 
                        background: `linear-gradient(to bottom, ${categoryStyle.accentColor}10, transparent)` 
                      }}
                    >
                      <h3 className="font-bold text-lg text-white mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-400 italic">
                        Grouped detection: multiple items identified in this category
                      </p>
                    </div>
                  )}
                  
                  {/* Card Content */}
                  <div className={`flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    isGrouped ? 'px-5 pb-5 pt-3' : 'p-5'
                  }`}>
                    <div className="flex-1 w-full">
                      {!isGrouped && (
                        <h3 className="font-bold text-lg text-white mb-2">{item.name}</h3>
                      )}
                      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{item.reasoning}</p>
                      <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                        item.confidence === 'High' ? 'bg-green-500/20 text-green-300' :
                        item.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {t('results.confidence')}: {item.confidence}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleItemSelect(item.name)}
                      disabled={analyzingItemName !== null}
                      className={`font-bold transition-all shrink-0 ${
                        isGrouped ? 'text-sm' : ''
                      } ${
                        analyzingItemName === item.name 
                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                          : 'bg-emerald-500 hover:bg-emerald-400 text-gray-900'
                      }`}
                    >
                      {analyzingItemName === item.name ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('scanner.analyzing')}
                        </>
                      ) : (
                        t('itemSelection.analyzeThis')
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plant-based items */}
      {plantItems.length > 0 && (
        <div className="w-full mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            {t('itemSelection.plantBasedItems')} ({plantItems.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {plantItems.map((item, index) => (
              <div 
                key={index}
                className="glass-card rounded-xl p-5 bg-emerald-500/5 border border-emerald-500/30"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-2">{item.name}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {animalItems.length === 0 && (
            <p className="text-emerald-300 text-base font-medium mt-6 text-center">
              {t('results.welfareFriendly')}
            </p>
          )}
        </div>
      )}

      {/* Challenge Analysis Dialog */}
      {imageData && animalItems.length === 0 && plantItems.length > 0 && (
        <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="w-full mb-4 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
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
      )}

      {/* Scan New Item button - shown when no animal items detected */}
      {animalItems.length === 0 && plantItems.length > 0 && (
        <Button
          onClick={onBack}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold shadow-lg shadow-emerald-500/20"
        >
          {t('scanner.scanNew')}
        </Button>
      )}

      {/* No items found */}
      {items.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300">{t('itemSelection.noItemsDetected')}</p>
        </div>
      )}
    </div>
  );
};

export default ItemSelectionScreen;
