import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import HomeScreen from "@/components/HomeScreen";
import ScannerScreen from "@/components/ScannerScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ItemSelectionScreen from "@/components/ItemSelectionScreen";

type Screen = 'home' | 'scanner' | 'itemSelection' | 'results';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [scannedImageData, setScannedImageData] = useState<string>("");
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [itemsSummary, setItemsSummary] = useState<string>("");
  const [currentImagePreview, setCurrentImagePreview] = useState<string>("");
  const [isAnalyzingItem, setIsAnalyzingItem] = useState(false);
  
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  const handleStartScan = () => setCurrentScreen('scanner');
  
  const handleBack = () => {
    setCurrentScreen('home');
    setDetectedItems([]);
    setItemsSummary("");
    setCurrentImagePreview("");
  };
  
  const handleItemsDetected = (items: any[], summary: string, imageData: string, imagePreview: string) => {
    setDetectedItems(items);
    setItemsSummary(summary);
    setScannedImageData(imageData);
    setCurrentImagePreview(imagePreview);
    setCurrentScreen('itemSelection');
  };
  
  const handleAnalysisComplete = (data: any, imageData: string) => {
    setAnalysisData(data);
    setScannedImageData(imageData);
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
        const analysisJson = JSON.parse(data.candidates[0].content.parts[0].text);
        handleAnalysisComplete(analysisJson, scannedImageData);
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
          onItemsDetected={handleItemsDetected}
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
        />
      )}
    </div>
  );
};

export default Index;
