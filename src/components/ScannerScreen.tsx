import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { appConfig } from "@/config/app.config";
import { ErrorHandler, withRetry } from "@/lib/errorHandler";

interface ScannerScreenProps {
  onBack: () => void;
  onAnalysisComplete: (data: any, imageData: string, metadata?: any) => void;
  onConfirmationNeeded: (items: any[], summary: string, imageData: string, imagePreview: string, hasNoFoodItems?: boolean) => void;
}

const ScannerScreen = ({ onBack, onAnalysisComplete, onConfirmationNeeded }: ScannerScreenProps) => {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImagePreview(dataUrl);
        
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        setImageData({ base64, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const sanitizeJson = (text: string): string => {
    // Replace smart quotes with regular quotes
    return text
      .replace(/[\u2018\u2019]/g, "'")  // Single smart quotes
      .replace(/[\u201C\u201D]/g, '"')  // Double smart quotes
      .replace(/[\u2013\u2014]/g, '-')  // Em/en dashes
      .replace(/\u2026/g, '...');        // Ellipsis
  };

  const handleAnalyze = async () => {
    if (!imageData) {
      toast({
        title: t('scanner.analysisFailed'),
        description: t('results.failedToLoad'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, detect all items in the image with retry logic
      const { data, error } = await withRetry(async () => {
        const result = await supabase.functions.invoke(appConfig.api.functions.analyzeImage, {
          body: { 
            imageData, 
            language: i18n.language,
            mode: appConfig.api.modes.detect
          }
        });
        if (result.error) throw result.error;
        return result;
      }, 2, 1000);

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const detectionJson = JSON.parse(sanitizedText);
          const imageDataStr = JSON.stringify(imageData);
          
          // Check if there are any food items detected
          const hasFoodItems = detectionJson.items && detectionJson.items.length > 0;
          
          // Pass to confirmation screen with flag indicating if no food items found
          onConfirmationNeeded(
            detectionJson.items || [], 
            detectionJson.summary, 
            imageDataStr, 
            imagePreview,
            !hasFoodItems  // hasNoFoodItems flag
          );
        } catch (parseError) {
          console.error('[ERROR][' + new Date().toISOString() + '][handleAnalyze] JSON Parse Error:', parseError);
          console.error('Raw text:', rawText);
          console.error('Sanitized text:', sanitizedText);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleAnalyze');
      toast({
        title: appError.retryable ? "Analysis Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSingleItem = async (itemName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(appConfig.api.functions.analyzeImage, {
        body: { 
          imageData, 
          language: i18n.language,
          mode: appConfig.api.modes.analyze,
          focusItem: itemName
        }
      });

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const analysisJson = JSON.parse(sanitizedText);
          const imageDataString = JSON.stringify(imageData);
          const metadata = data._metadata;
          onAnalysisComplete(analysisJson, imageDataString, metadata);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Raw text:', rawText);
          console.error('Sanitized text:', sanitizedText);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      toast({
        title: t('scanner.analysisFailed'),
        description: error instanceof Error ? error.message : t('results.failedToLoad'),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pb-40">
      <h2 className="text-3xl font-bold mb-6 text-white">{t('scanner.uploadImage')}</h2>
      <div className="w-full max-w-2xl glass-card rounded-2xl p-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-60 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center mb-6 cursor-pointer overflow-hidden hover:border-emerald-500/50 transition-colors"
        >
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Product Preview" 
              className="h-full w-full object-contain rounded-lg" 
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <ImagePlus className="w-12 h-12 text-emerald-400" />
              <span className="text-gray-300 text-sm leading-relaxed">{t('scanner.takePhoto')}</span>
            </div>
          )}
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageChange}
        />
        
        <p className="text-sm text-gray-400 text-center mb-6">
          {t('scanner.uploadTip')}
        </p>
        
        {imageData && (
          <Button 
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold disabled:bg-gray-600 disabled:text-gray-400"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('scanner.analyzing')}
              </>
            ) : (
              t('scanner.title')
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScannerScreen;
