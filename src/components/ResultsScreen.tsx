import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

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
}

const ResultsScreen = ({ data, onNewScan, imageData, onReanalyze }: ResultsScreenProps) => {
  const [ethicalSwaps, setEthicalSwaps] = useState<any[]>([]);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const [sliderValue, setSliderValue] = useState([3]); // Default to "Minimal Animal Suffering"
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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
    const level = (confidence || 'Low').toLowerCase();
    let width = 'w-1/3';
    let color = 'bg-red-500';
    
    if (level === 'medium') {
      width = 'w-2/3';
      color = 'bg-yellow-500';
    } else if (level === 'high') {
      width = 'w-full';
      color = 'bg-emerald-500';
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
      const { data: result, error } = await supabase.functions.invoke('suggest-ethical-swap', {
        body: { 
          productName,
          animalIngredients,
          ethicalLens: sliderValue[0]
        }
      });

      if (error) throw error;

      const parsedResult = JSON.parse(result.candidates[0].content.parts[0].text);
      setEthicalSwaps([parsedResult]);
    } catch (error) {
      toast({
        title: "Failed to load suggestions",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSwaps(false);
    }
  };

  useEffect(() => {
    if (ethicalSwaps.length === 0 || !data.hasAnimalIngredients) return;

    const debounceTimer = setTimeout(() => {
      handleEthicalSwap();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [sliderValue]);

  const handleChallengeAnalysis = async () => {
    if (!imageData || !onReanalyze) return;

    setIsReanalyzing(true);
    try {
      // Parse the imageData string back to object
      const parsedImageData = JSON.parse(imageData);
      
      const { data: result, error } = await supabase.functions.invoke('analyze-image', {
        body: { 
          imageData: parsedImageData,
          additionalInfo: additionalInfo.trim() || undefined
        }
      });

      if (error) throw error;

      const analysisData = result.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(analysisData.replace(/```json\n?|\n?```/g, ''));
      
      onReanalyze(parsedData);
      setChallengeOpen(false);
      setAdditionalInfo("");
      toast({
        title: "Re-analysis Complete",
        description: "The product has been re-analyzed with your additional information.",
      });
    } catch (error) {
      toast({
        title: "Re-analysis Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };


  if (!data.hasAnimalIngredients) {
    console.log('Non-animal product view - imageData:', imageData ? 'present' : 'missing', 'onReanalyze:', onReanalyze ? 'present' : 'missing');
    
    return (
      <div className="p-4 glass-card rounded-2xl animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Analysis</h1>
        <div className="text-center p-8">
          <h3 className="font-bold text-2xl text-emerald-400 mb-2">
            {data.productName?.value || 'Product Analysis'}
          </h3>
          <p className="text-gray-300">
            This product does not appear to contain animal-derived ingredients.
          </p>
          <p className="text-gray-400 text-sm mt-4">
            As such, it is outside the scope of this animal welfare assessment.
          </p>
          {data.isFood && (
            <p className="text-emerald-300 text-base font-medium mt-6">
              The good news? If it's food, it's already a welfare-friendly choice!
            </p>
          )}
        </div>
        {imageData && onReanalyze ? (
          <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full mt-4 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Challenge Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Have more info? share it here</DialogTitle>
            </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="info" className="text-gray-300">Have info on how this product was made? Add details like certifications or farming practices to help refine the welfare results</Label>
                  <Textarea
                    id="info"
                    placeholder="E.g., 'pasture-raised', 'cage-free', specific ingredients, certifications, or any other welfare-relevant information..."
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
                      Re-analyzing...
                    </>
                  ) : (
                    "Re-analyze Product"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-gray-500 text-center mt-4">Debug: imageData={imageData ? 'yes' : 'no'} onReanalyze={onReanalyze ? 'yes' : 'no'}</p>
        )}

        <Button
          onClick={onNewScan}
          className="w-full mt-8 bg-gray-700 hover:bg-gray-600 text-white font-bold"
        >
          Scan New Item
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 glass-card rounded-2xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Analysis</h1>
      <div className="space-y-4">
        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">Product</h3>
            <div className="w-1/3">{getConfidenceMeter(data.productName?.confidence)}</div>
          </div>
          <p className="text-gray-300">{data.productName?.value || 'N/A'}</p>
        </div>

        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">Animal-Derived Ingredients</h3>
            <div className="w-1/3">{getConfidenceMeter(data.animalIngredients?.confidence)}</div>
          </div>
          <p className="text-gray-300">{data.animalIngredients?.value || 'N/A'}</p>
        </div>

        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">Production System</h3>
            <div className="w-1/3">{getConfidenceMeter(data.productionSystem?.confidence)}</div>
          </div>
          <p className="text-gray-300">{data.productionSystem?.value || 'N/A'}</p>
          {data.productionSystem?.assumption && (
            <p className="text-xs text-gray-400 mt-2 italic">{data.productionSystem.assumption}</p>
          )}
        </div>

        <div className="border-b border-gray-700 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-emerald-400">Potential Welfare Concerns</h3>
            <div className="w-1/3">{getConfidenceMeter(data.welfareConcerns?.confidence)}</div>
          </div>
          <p className="text-gray-300 whitespace-pre-wrap">{data.welfareConcerns?.value || 'N/A'}</p>
        </div>

        <div className="border-b border-gray-700 pb-4">
          <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
            <div className="flex justify-start items-center">
              <Label className="text-sm font-medium text-emerald-400">Ethical Lens ⚖️</Label>
            </div>
            <div className="text-center">
              <span className="text-base text-white font-semibold">
                {sliderValue[0] === 1 ? "Prioritize Big Welfare Gains" :
                 sliderValue[0] === 2 ? "Strong Welfare Standards" :
                 sliderValue[0] === 3 ? "Minimal Animal Suffering" :
                 sliderValue[0] === 4 ? "Minimal Animal Use" :
                 "Aim for Zero Animal Harm"}
              </span>
            </div>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Same Product, High Welfare</span>
              <span>Plant-Based/Cultured Only</span>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {sliderValue[0] === 1 && "Same type of product but from animals raised under high-welfare conditions."}
              {sliderValue[0] === 2 && "Certified or verifiably higher-welfare animal products meeting multiple criteria."}
              {sliderValue[0] === 3 && "Hybrid or blended options that reduce overall welfare impact."}
              {sliderValue[0] === 4 && "Mostly plant-based options with only trace animal ingredients."}
              {sliderValue[0] === 5 && "Fully animal-free products (plant-based, cultured, or synthetic)."}
            </p>
          </div>
        </div>

        <div className="pb-3">
          <div>
            {ethicalSwaps.length === 0 ? (
              <Button 
                onClick={handleEthicalSwap}
                disabled={isLoadingSwaps}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isLoadingSwaps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Swaps...
                  </>
                ) : (
                  <>Suggest Alternatives ✨</>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-emerald-400">
                  {ethicalSwaps[0]?.ethicalLensPosition || "Suggested Alternatives"}
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
                            {swap.confidence} Confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{swap.description}</p>
                        <div className="text-xs space-y-1">
                          <p className="text-gray-400">
                            <span className="font-medium text-emerald-400">Reasoning:</span> {swap.reasoning}
                          </p>
                          {swap.availability && (
                            <p className="text-gray-400">
                              <span className="font-medium text-emerald-400">Availability:</span> {swap.availability}
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

        <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 text-yellow-300 rounded-lg">
          <h3 className="font-bold">Disclaimer</h3>
          <p className="text-xs">
            {data.disclaimer || 'This is a Preliminary AI Estimate and has not been scientifically validated by the Welfare Footprint Institute.'}
          </p>
        </div>
      </div>

        {imageData && onReanalyze && (
          <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full mt-4 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Challenge Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white">Challenge or Clarify Analysis</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="info-full" className="text-gray-300">Have info on how this product was made? Add details like certifications or farming practices to help refine the welfare results</Label>
                  <Textarea
                    id="info-full"
                    placeholder="E.g., 'pasture-raised', 'cage-free', specific ingredients, certifications, or any other welfare-relevant information..."
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
                      Re-analyzing...
                    </>
                  ) : (
                    "Re-analyze Product"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Button 
          onClick={onNewScan}
          className="w-full mt-8 bg-gray-700 hover:bg-gray-600 text-white font-bold"
        >
          Scan New Item
        </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-4 right-4 bg-gray-700 hover:bg-gray-600 text-white w-12 h-12 rounded-full shadow-lg z-10"
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
