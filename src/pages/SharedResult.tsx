import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Clock, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/config/app.config";

const SharedResult = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isTemporary, setIsTemporary] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSharedResult = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shared_results')
          .select('*')
          .eq('share_token', shareToken)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("Shared result not found or expired");
          return;
        }

        // Increment view count
        await supabase
          .from('shared_results')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);

        setAnalysisData(data.analysis_data);
        setExpiresAt(data.expires_at);
        setIsTemporary(data.expires_at !== null);
      } catch (err) {
        console.error('Error fetching shared result:', err);
        setError(err instanceof Error ? err.message : "Failed to load shared result");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedResult();
  }, [shareToken]);

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursRemaining = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursRemaining;
  };

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

  const getEthicalLensLabel = (value: number) => {
    const labels = [
      { value: 1, label: 'Welfare Concerns Only' },
      { value: 2, label: 'Reduced Harm' },
      { value: 3, label: 'Minimal Animal Use' },
      { value: 4, label: 'Plant-Forward' },
      { value: 5, label: 'No Animal Products' },
    ];
    const label = labels.find(l => l.value === value);
    return label ? label.label : '';
  };

  const getEthicalLensColor = (value: number) => {
    const colors: { [key: number]: string } = appConfig.ethicalLens.colors;
    return colors[value] ? `text-[${colors[value]}]` : 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-white">Loading shared result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Result</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const hoursRemaining = getTimeRemaining();
  const ethicalSwaps = analysisData?.ethicalSwaps || [];
  const ethicalLensValue = analysisData?.ethicalLensValue || appConfig.ethicalLens.defaultValue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 p-4">
      <div className="container mx-auto max-w-lg">
        {isTemporary && hoursRemaining !== null && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <Clock className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              ⏱ This analysis expires in {hoursRemaining > 24 ? Math.floor(hoursRemaining / 24) + ' days' : hoursRemaining + ' hours'}
            </AlertDescription>
          </Alert>
        )}

        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="mb-6 pb-4 border-b border-gray-700">
            <h1 className="text-3xl font-bold text-center text-white mb-2">
              Shared Welfare Analysis
            </h1>
            <p className="text-center text-gray-400 text-sm">
              View-only shared result
            </p>
          </div>

          <div className="space-y-4">
            {/* Product Name */}
            <div className="border-b border-gray-700 pb-3">
              <h3 className="font-bold text-emerald-400 mb-1">Product</h3>
              <p className="text-gray-300">{analysisData?.productName?.value || 'N/A'}</p>
              {analysisData?.productName?.confidence && getConfidenceMeter(analysisData.productName.confidence)}
            </div>

            {analysisData?.hasAnimalIngredients ? (
              <>
                {/* Animal Ingredients */}
                <div className="border-b border-gray-700 pb-3">
                  <h3 className="font-bold text-emerald-400 mb-1">Animal-Derived Ingredients</h3>
                  <p className="text-gray-300">{analysisData?.animalIngredients?.value || 'N/A'}</p>
                  {analysisData?.animalIngredients?.confidence && getConfidenceMeter(analysisData.animalIngredients.confidence)}
                </div>

                {/* Production System */}
                <div className="border-b border-gray-700 pb-3">
                  <h3 className="font-bold text-emerald-400 mb-1">Production System</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{analysisData?.productionSystem?.value || 'N/A'}</p>
                  {analysisData?.productionSystem?.assumption && (
                    <p className="text-xs text-gray-400 mt-2 italic">{analysisData.productionSystem.assumption}</p>
                  )}
                  {analysisData?.productionSystem?.confidence && getConfidenceMeter(analysisData.productionSystem.confidence)}
                </div>

                {/* Welfare Concerns */}
                <div className="border-b border-gray-700 pb-3">
                  <h3 className="font-bold text-emerald-400 mb-1">Potential Welfare Concerns</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{analysisData?.welfareConcerns?.value || 'N/A'}</p>
                  {analysisData?.welfareConcerns?.confidence && getConfidenceMeter(analysisData.welfareConcerns.confidence)}
                </div>

                {/* Ethical Lens Suggestions */}
                {ethicalSwaps.length > 0 && (
                  <div className="border-b border-gray-700 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-emerald-400">Ethical Lens ⚖️</h3>
                      <span className={`text-sm font-medium ${getEthicalLensColor(ethicalLensValue)}`}>
                        {getEthicalLensLabel(ethicalLensValue)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {ethicalSwaps.map((swap: any, idx: number) => (
                        <Card key={idx} className="p-4 bg-gray-800/50 border-gray-700">
                          <div className="flex gap-3">
                            <Lightbulb className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{swap.name}</h4>
                              <p className="text-sm text-gray-300 mb-2">{swap.description}</p>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-400">
                                  <span className="font-medium text-emerald-400">Reasoning:</span> {swap.reasoning}
                                </p>
                                <p className="text-xs text-gray-400">
                                  <span className="font-medium text-emerald-400">Availability:</span> {swap.availability}
                                </p>
                                <p className="text-xs text-gray-400">
                                  <span className="font-medium text-emerald-400">Confidence:</span> {swap.confidence}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {ethicalSwaps[0]?.generalNote && (
                      <Alert className="mt-3 border-blue-500/50 bg-blue-500/10">
                        <AlertDescription className="text-blue-200 text-xs">
                          <strong>Note:</strong> {ethicalSwaps[0].generalNote}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <p className="text-emerald-300 font-medium mb-2">
                  No Animal-Derived Ingredients Detected
                </p>
                <p className="text-gray-400 text-sm">
                  This product appears to be welfare-friendly!
                </p>
              </div>
            )}

            {/* Disclaimer */}
            {analysisData?.disclaimer && (
              <div className="border-t border-gray-700 pt-3">
                <h3 className="font-bold text-amber-400 mb-1">Disclaimer</h3>
                <p className="text-xs text-gray-400 italic">{analysisData.disclaimer}</p>
              </div>
            )}

            {/* Cache Metadata (if present) */}
            {analysisData?.cacheMetadata && (
              <div className="text-xs text-gray-500 text-center pt-2">
                {analysisData.cacheMetadata.cacheHit ? '⚡ Cached' : '🔄 Fresh'} • 
                {' '}{analysisData.cacheMetadata.latencyMs}ms • 
                {' '}{analysisData.cacheMetadata.provider}/{analysisData.cacheMetadata.model}
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Want to analyze your own products?
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Try Welfare Footprint App
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by Welfare Footprint Institute
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedResult;