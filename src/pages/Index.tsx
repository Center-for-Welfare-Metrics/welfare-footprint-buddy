import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import HomeScreen from "@/components/HomeScreen";
import ScannerScreen from "@/components/ScannerScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ItemSelectionScreen from "@/components/ItemSelectionScreen";
import ConfirmationScreen from "@/components/ConfirmationScreen";
import NavigationWrapper from "@/components/NavigationWrapper";
import { ErrorHandler, withRetry } from "@/lib/errorHandler";

type Screen = 'home' | 'scanner' | 'confirmation' | 'itemSelection' | 'results';

// Utility function to sanitize JSON from AI responses
const sanitizeJson = (text: string): string => {
  // Replace smart quotes with regular quotes
  return text
    .replace(/[\u2018\u2019]/g, "'")  // Single smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Double smart quotes
    .replace(/[\u2013\u2014]/g, '-')  // Em/en dashes
    .replace(/\u2026/g, '...');        // Ellipsis
};

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>(['home']);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [scannedImageData, setScannedImageData] = useState<string>("");
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [itemsSummary, setItemsSummary] = useState<string>("");
  const [currentImagePreview, setCurrentImagePreview] = useState<string>("");
  const [hasNoFoodItems, setHasNoFoodItems] = useState(false);
  const [isAnalyzingItem, setIsAnalyzingItem] = useState(false);
  const [cacheMetadata, setCacheMetadata] = useState<any>(null);
  
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  // Navigate to a new screen and add to history
  const navigateToScreen = (screen: Screen) => {
    setNavigationHistory(prev => [...prev, screen]);
    setCurrentScreen(screen);
  };

  // Navigate back one step in history
  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentScreen(previousScreen);
    }
  };

  // Navigate to home and reset history
  const handleGoHome = () => {
    console.log('[Navigation] Going to home - resetting all state');
    setCurrentScreen('home');
    setNavigationHistory(['home']);
    setDetectedItems([]);
    setItemsSummary("");
    setCurrentImagePreview("");
    setAnalysisData(null);
    setScannedImageData("");
    setHasNoFoodItems(false);
    setCacheMetadata(null);
  };

  const handleStartScan = () => navigateToScreen('scanner');
  
  const handleConfirmationNeeded = (items: any[], summary: string, imageData: string, imagePreview: string, noFoodItems: boolean = false) => {
    setDetectedItems(items);
    setItemsSummary(summary);
    setScannedImageData(imageData);
    setCurrentImagePreview(imagePreview);
    setHasNoFoodItems(noFoodItems);
    // Skip confirmation screen, go directly to item selection
    navigateToScreen('itemSelection');
  };
  
  const handleConfirmationContinue = () => {
    navigateToScreen('itemSelection');
  };
  
  const handleConfirmationEdit = async (editedDescription: string) => {
    setIsAnalyzingItem(true);
    try {
      const imageData = JSON.parse(scannedImageData);
      
      const { data, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            imageData, 
            language: i18n.language,
            mode: 'detect',
            userCorrection: editedDescription
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const detectionJson = JSON.parse(sanitizedText);
          setDetectedItems(detectionJson.items);
          setItemsSummary(detectionJson.summary);
          navigateToScreen('itemSelection');
        } catch (parseError) {
          console.error('[ERROR][' + new Date().toISOString() + '][handleConfirmationEdit] JSON Parse Error:', parseError);
          console.error('Raw text:', rawText);
          console.error('Sanitized text:', sanitizedText);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleConfirmationEdit');
      toast({
        title: appError.retryable ? "Analysis Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingItem(false);
    }
  };

  const handleItemReanalyze = async (_itemName: string, additionalInfo: string) => {
    setIsAnalyzingItem(true);
    try {
      const imageData = JSON.parse(scannedImageData);
      
      const { data, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            imageData, 
            language: i18n.language,
            mode: 'detect',
            additionalInfo: additionalInfo.trim() || undefined
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const detectionJson = JSON.parse(sanitizedText);
          setDetectedItems(detectionJson.items);
          setItemsSummary(detectionJson.summary);
        } catch (parseError) {
          console.error('[ERROR][' + new Date().toISOString() + '][handleItemReanalyze] JSON Parse Error:', parseError);
          console.error('Raw text:', rawText);
          console.error('Sanitized text:', sanitizedText);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleItemReanalyze');
      toast({
        title: appError.retryable ? "Analysis Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingItem(false);
    }
  };
  
  const handleAnalysisComplete = (data: any, imageData: string, metadata?: any) => {
    setAnalysisData(data);
    setScannedImageData(imageData);
    setCacheMetadata(metadata || null);
    navigateToScreen('results');
    setIsAnalyzingItem(false);
  };

  const handleItemSelect = async (itemName: string) => {
    setIsAnalyzingItem(true);
    try {
      const imageData = JSON.parse(scannedImageData);
      
      console.log('[handleItemSelect] Analyzing item:', itemName);
      
      const { data, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            imageData,
            language: i18n.language,
            mode: 'analyze',
            focusItem: itemName
          }
        });
        if (res.error) throw res.error;
        return res;
      }, 2, 1000);

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const analysisJson = JSON.parse(sanitizedText);
          // Extract cache metadata if available
          const metadata = data._metadata;
          handleAnalysisComplete(analysisJson, scannedImageData, metadata);
        } catch (parseError) {
          console.error('[ERROR][' + new Date().toISOString() + '][handleItemSelect] JSON Parse Error:', parseError);
          console.error('Raw text:', rawText);
          console.error('Sanitized text:', sanitizedText);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleItemSelect');
      toast({
        title: appError.retryable ? "Analysis Failed" : "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
      setIsAnalyzingItem(false);
    }
  };

  const handleReanalyze = (newData: any) => {
    setAnalysisData(newData);
  };
  
  const handleNewScan = () => {
    console.log('[Navigation] New scan requested - going home');
    handleGoHome();
  };
  
  const handleBackToItems = () => {
    setAnalysisData(null);
    handleBack();
  };

  // Determine if Home icon should be shown
  const showHomeIcon = currentScreen !== 'home' && currentScreen !== 'scanner';

  return (
    <div className="container mx-auto max-w-lg">
      {currentScreen === 'home' && (
        <div className="p-4">
          <HomeScreen onStartScan={handleStartScan} />
        </div>
      )}
      
      {currentScreen === 'scanner' && (
        <NavigationWrapper 
          onBack={handleBack}
          onHome={handleGoHome}
          showHome={showHomeIcon}
          isProcessing={isAnalyzingItem}
        >
          <div className="p-4">
            <ScannerScreen 
              onBack={() => {}} 
              onAnalysisComplete={handleAnalysisComplete}
              onConfirmationNeeded={handleConfirmationNeeded}
            />
          </div>
        </NavigationWrapper>
      )}
      
      
      {currentScreen === 'itemSelection' && (
        <NavigationWrapper 
          onBack={handleBack}
          onHome={handleGoHome}
          showHome={showHomeIcon}
          isProcessing={isAnalyzingItem}
        >
          <div className="p-4">
            <ItemSelectionScreen
              items={detectedItems}
              summary={itemsSummary}
              imagePreview={currentImagePreview}
              onItemSelect={handleItemSelect}
              onBack={handleGoHome}
              imageData={scannedImageData}
              onReanalyze={handleItemReanalyze}
            />
          </div>
        </NavigationWrapper>
      )}
      
      {currentScreen === 'results' && analysisData && (
        <NavigationWrapper 
          onBack={handleBack}
          onHome={handleGoHome}
          showHome={showHomeIcon}
          isProcessing={isAnalyzingItem}
        >
          <div className="p-4">
            <ResultsScreen 
              data={analysisData} 
              onNewScan={handleNewScan}
              imageData={scannedImageData}
              onReanalyze={handleReanalyze}
              onBackToItems={detectedItems.length > 0 ? handleBackToItems : undefined}
              cacheMetadata={cacheMetadata}
            />
          </div>
        </NavigationWrapper>
      )}
    </div>
  );
};

export default Index;
