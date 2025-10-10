import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DetectedItem {
  name: string;
  likelyHasAnimalIngredients: boolean;
  reasoning: string;
  confidence: string;
}

interface ItemSelectionScreenProps {
  items: DetectedItem[];
  summary: string;
  imagePreview: string;
  onItemSelect: (itemName: string) => void;
  onBack: () => void;
  isAnalyzing: boolean;
}

const ItemSelectionScreen = ({ 
  items, 
  summary, 
  imagePreview,
  onItemSelect, 
  onBack,
  isAnalyzing 
}: ItemSelectionScreenProps) => {
  const { t } = useTranslation();

  const animalItems = items.filter(item => item.likelyHasAnimalIngredients);
  const plantItems = items.filter(item => !item.likelyHasAnimalIngredients);

  return (
    <div className="flex flex-col items-center p-4 pb-32 max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="self-start text-emerald-400 hover:underline mb-6"
        disabled={isAnalyzing}
      >
        ← {t('common.back')}
      </button>

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
          <div className="space-y-3">
            {animalItems.map((item, index) => (
              <div 
                key={index}
                className="glass-card rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-300 mb-2">{item.reasoning}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.confidence === 'High' ? 'bg-green-500/20 text-green-300' :
                      item.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {t('results.confidence')}: {item.confidence}
                    </span>
                  </div>
                  <Button
                    onClick={() => onItemSelect(item.name)}
                    disabled={isAnalyzing}
                    className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
                  >
                    {t('itemSelection.analyzeThis')}
                  </Button>
                </div>
              </div>
            ))}
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
          <div className="space-y-3">
            {plantItems.map((item, index) => (
              <div 
                key={index}
                className="glass-card rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-300">{item.reasoning}</p>
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
