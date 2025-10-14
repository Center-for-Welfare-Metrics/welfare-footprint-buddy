import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, Loader2, Edit3, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
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
  
  console.log('🎨 getCategoryStyle for:', itemName);
  
  // Check for multiple items (commas indicate grouped items)
  const hasMultipleItems = itemName.includes(',');
  
  // Dairy category - check for dairy-related keywords
  if (lowerName.includes('dairy') || lowerName.includes('milk') || lowerName.includes('cream') || 
      lowerName.includes('butter') || lowerName.includes('yogurt') || 
      (lowerName.includes('cheese') && hasMultipleItems)) {
    console.log('✅ Matched DAIRY category');
    return {
      accentColor: 'hsl(217, 91%, 60%)', // soft blue
      bgColor: 'bg-blue-500/5',
      borderColor: 'border-blue-500/30'
    };
  }
  
  // Meat category - check for meat-related keywords
  if (lowerName.includes('meat') || lowerName.includes('beef') || lowerName.includes('pork') || 
      lowerName.includes('sausage') || lowerName.includes('bacon') || lowerName.includes('ham') ||
      lowerName.includes('chicken') || lowerName.includes('turkey') || lowerName.includes('lamb')) {
    console.log('✅ Matched MEAT category');
    return {
      accentColor: 'hsl(0, 84%, 60%)', // muted red
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/30'
    };
  }
  
  // Seafood category - check for seafood-related keywords
  if (lowerName.includes('seafood') || lowerName.includes('fish') || lowerName.includes('shrimp') ||
      lowerName.includes('salmon') || lowerName.includes('tuna') || lowerName.includes('crab')) {
    console.log('✅ Matched SEAFOOD category');
    return {
      accentColor: 'hsl(172, 79%, 40%)', // teal
      bgColor: 'bg-teal-500/5',
      borderColor: 'border-teal-500/30'
    };
  }
  
  // Egg category - check for egg-related keywords
  if (lowerName.includes('egg')) {
    console.log('✅ Matched EGG category');
    return {
      accentColor: 'hsl(45, 93%, 53%)', // golden yellow
      bgColor: 'bg-yellow-500/5',
      borderColor: 'border-yellow-500/30'
    };
  }
  
  // Mixed/general animal-derived - check for generic grouping words
  if (lowerName.includes('ingredient') || lowerName.includes('item') || lowerName.includes('product') ||
      hasMultipleItems) {
    console.log('✅ Matched MIXED/GENERAL category');
    return {
      accentColor: 'hsl(38, 92%, 50%)', // amber
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/30'
    };
  }
  
  console.log('❌ No category matched - using default styling');
  return null;
};

const isGroupedItem = (itemName: string): boolean => {
  const lowerName = itemName.toLowerCase();
  const hasCommas = itemName.includes(',');
  const hasGroupingWords = lowerName.includes('ingredient') || 
                           lowerName.includes('item') || 
                           lowerName.includes('product');
  
  const isGrouped = hasGroupingWords || hasCommas;
  console.log('📦 isGroupedItem:', itemName, '→', isGrouped);
  
  return isGrouped;
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(summary);
  const [isUpdatingResults, setIsUpdatingResults] = useState(false);

  const handleItemSelect = (itemName: string) => {
    setAnalyzingItemName(itemName);
    onItemSelect(itemName);
  };

  const handleUpdateDescription = async () => {
    if (!imageData || !onReanalyze || !editedDescription.trim()) return;

    setIsUpdatingResults(true);
    try {
      const parsedImageData = JSON.parse(imageData);
      
      const { data: result, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            imageData: parsedImageData,
            mode: 'detect',
            language: localStorage.getItem("i18nextLng") || "en",
            additionalInfo: editedDescription.trim(),
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      setIsEditingDescription(false);
      toast({
        title: "Results Updated",
        description: "The detected items have been updated based on your description.",
      });

      // Trigger parent reanalysis
      if (onReanalyze) {
        onReanalyze("", editedDescription);
      }
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleUpdateDescription');
      toast({
        title: appError.retryable ? "Update Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingResults(false);
    }
  };

  // Split items that contain multiple comma-separated items into individual cards
  const splitItems = (items: DetectedItem[]): DetectedItem[] => {
    const result: DetectedItem[] = [];
    
    items.forEach(item => {
      // Check if item name contains commas (multiple items) - ALWAYS split comma-separated items
      if (item.name.includes(',')) {
        // Split by comma and create individual items
        const itemNames = item.name.split(',').map(n => n.trim()).filter(n => n.length > 0);
        
        console.log('🔪 Splitting comma-separated item:', item.name, '→', itemNames);
        
        itemNames.forEach(name => {
          // Generate item-specific reasoning
          const lowerName = name.toLowerCase();
          let itemReasoning = item.reasoning;
          
          // Try to extract item-specific reasoning from the original text
          const reasoningSentences = item.reasoning.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const relevantSentence = reasoningSentences.find(sentence => 
            sentence.toLowerCase().includes(lowerName) || 
            lowerName.split(' ').some(word => word.length > 3 && sentence.toLowerCase().includes(word))
          );
          
          if (relevantSentence) {
            itemReasoning = relevantSentence.trim() + '.';
          } else {
            // Fallback: generic reasoning based on common ingredients
            if (lowerName.includes('cream') || lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('butter') || lowerName.includes('yogurt')) {
              itemReasoning = 'This item likely contains dairy products.';
            } else if (lowerName.includes('egg')) {
              itemReasoning = 'This item contains eggs.';
            } else if (lowerName.includes('meat') || lowerName.includes('beef') || lowerName.includes('pork') || lowerName.includes('chicken')) {
              itemReasoning = 'This item contains meat.';
            } else if (lowerName.includes('fish') || lowerName.includes('seafood')) {
              itemReasoning = 'This item contains seafood.';
            } else {
              itemReasoning = 'This item may contain animal-derived ingredients.';
            }
          }
          
          result.push({
            ...item,
            name: name,
            reasoning: itemReasoning
          });
        });
      } else {
        // Keep as single item
        result.push(item);
      }
    });
    
    return result;
  };

  const animalItems = splitItems(items.filter(item => item.likelyHasAnimalIngredients));
  const plantItems = splitItems(items.filter(item => !item.likelyHasAnimalIngredients));

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

      {/* Summary with Edit Functionality */}
      <div className="glass-card rounded-2xl p-6 mb-6 w-full border-2 border-emerald-500/30">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">
              {t('itemSelection.summaryTitle')}
            </h3>
            
            {!isEditingDescription ? (
              <>
                <p className="text-gray-200 leading-relaxed mb-4">{summary}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingDescription(true);
                    setEditedDescription(summary);
                  }}
                  className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Refine Description
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-3 italic">
                  Refine or correct the AI's description below — your changes will automatically update the items detected.
                </p>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Example: The soup is served inside bread and topped with cheese."
                  className="min-h-[120px] bg-white/10 text-white border-gray-600 mb-3"
                  disabled={isUpdatingResults}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingDescription(false);
                      setEditedDescription(summary);
                    }}
                    disabled={isUpdatingResults}
                    className="flex-1 border-gray-500 text-gray-400 hover:bg-gray-500/10"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleUpdateDescription}
                    disabled={!editedDescription.trim() || isUpdatingResults}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
                  >
                    {isUpdatingResults ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Results'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
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
              
              console.log('🔍 Rendering item:', { 
                name: item.name, 
                isGrouped, 
                hasCategoryStyle: !!categoryStyle,
                categoryStyle 
              });
              
              return (
                <div 
                  key={index}
                  className={`glass-card rounded-xl overflow-hidden hover:bg-white/10 transition-all ${
                    categoryStyle && isGrouped ? categoryStyle.bgColor : ''
                  }`}
                  style={{
                    borderTop: categoryStyle && isGrouped 
                      ? `4px solid ${categoryStyle.accentColor}` 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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
