import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import ScannerScreen from "@/components/ScannerScreen";
import ResultsScreen from "@/components/ResultsScreen";

type Screen = 'home' | 'scanner' | 'results';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleStartScan = () => setCurrentScreen('scanner');
  const handleBack = () => setCurrentScreen('home');
  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setCurrentScreen('results');
  };
  const handleNewScan = () => {
    setAnalysisData(null);
    setCurrentScreen('home');
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      {currentScreen === 'home' && <HomeScreen onStartScan={handleStartScan} />}
      {currentScreen === 'scanner' && (
        <ScannerScreen onBack={handleBack} onAnalysisComplete={handleAnalysisComplete} />
      )}
      {currentScreen === 'results' && analysisData && (
        <ResultsScreen data={analysisData} onNewScan={handleNewScan} />
      )}
    </div>
  );
};

export default Index;
