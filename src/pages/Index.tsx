import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import HomeScreen from "@/components/HomeScreen";
import ScannerScreen from "@/components/ScannerScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ItemSelectionScreen from "@/components/ItemSelectionScreen";
import ConfirmationScreen from "@/components/ConfirmationScreen";

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

  const handleStartScan = () => setCurrentScreen('scanner');
  
  const handleBack = () => {
    setCurrentScreen('home');
    setDetectedItems([]);
    setItemsSummary("");
    setCurrentImagePreview("");
  };
  
  const handleConfirmationNeeded = (items: any[], summary: string, imageData: string, imagePreview: string, noFoodItems: boolean = false) => {
    setDetectedItems(items);
    setItemsSummary(summary);
    setScannedImageData(imageData);
    setCurrentImagePreview(imagePreview);
    setHasNoFoodItems(noFoodItems);
    setCurrentScreen('confirmation');
  };
  
  const handleConfirmationContinue = () => {
    setCurrentScreen('itemSelection');
  };
  
  const handleConfirmationEdit = async (editedDescription: string) => {
    setIsAnalyzingItem(true);
    try {
      const imageData = JSON.parse(scannedImageData);
      
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { 
          imageData, 
          language: i18n.language,
          mode: 'detect',
          userCorrection: editedDescription
        }
      });

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const detectionJson = JSON.parse(sanitizedText);
          setDetectedItems(detectionJson.items);
          setItemsSummary(detectionJson.summary);
          setCurrentScreen('itemSelection');
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
    } finally {
      setIsAnalyzingItem(false);
    }
  };
  
  const handleAnalysisComplete = (data: any, imageData: string, metadata?: any) => {
    setAnalysisData(data);
    setScannedImageData(imageData);
    setCacheMetadata(metadata || null);
    setCurrentScreen('results');
    setIsAnalyzingItem(false);
  };

  const handleItemSelect = async (itemName: string) => {
    setIsAnalyzingItem(true);
    try {
      const imageData = JSON.parse(scannedImageData);
      
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { 
          imageData, 
          language: i18n.language,
          mode: 'analyze',
          focusItem: itemName
        }
      });

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
      setIsAnalyzingItem(false);
    }
  };

  const handleReanalyze = (newData: any) => {
    setAnalysisData(newData);
  };
  
  const handleNewScan = () => {
    setAnalysisData(null);
    setDetectedItems([]);
    setItemsSummary("");
    setCurrentImagePreview("");
    setCurrentScreen('home');
  };
  
  const handleBackToItems = () => {
    setAnalysisData(null);
    setCurrentScreen('itemSelection');
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      {currentScreen === 'home' && <HomeScreen onStartScan={handleStartScan} />}
      
      {currentScreen === 'scanner' && (
        <ScannerScreen 
          onBack={handleBack} 
          onAnalysisComplete={handleAnalysisComplete}
          onConfirmationNeeded={handleConfirmationNeeded}
        />
      )}
      
      {currentScreen === 'confirmation' && (
        <ConfirmationScreen
          summary={itemsSummary}
          imagePreview={currentImagePreview}
          onContinue={handleConfirmationContinue}
          onEdit={handleConfirmationEdit}
          onBack={handleBack}
          isProcessing={isAnalyzingItem}
          hasNoFoodItems={hasNoFoodItems}
        />
      )}
      
      {currentScreen === 'itemSelection' && (
        <ItemSelectionScreen
          items={detectedItems}
          summary={itemsSummary}
          imagePreview={currentImagePreview}
          onItemSelect={handleItemSelect}
          onBack={handleBack}
          isAnalyzing={isAnalyzingItem}
        />
      )}
      
      {currentScreen === 'results' && analysisData && (
        <ResultsScreen 
          data={analysisData} 
          onNewScan={handleNewScan}
          imageData={scannedImageData}
          onReanalyze={handleReanalyze}
          onBackToItems={detectedItems.length > 0 ? handleBackToItems : undefined}
          cacheMetadata={cacheMetadata}
        />
      )}
    </div>
  );
};

export default Index;
