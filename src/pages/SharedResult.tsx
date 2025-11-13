import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Clock, Lightbulb, Share2 } from "lucide-react";
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
        // Use the public edge function to fetch shared results (no auth required)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-result/${shareToken}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load shared result');
        }

        const data = await response.json();

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

  const handleShare = (platform: 'twitter' | 'linkedin' | 'whatsapp' | 'copy') => {
    const shareUrl = window.location.href;
    const productName = analysisData?.productName?.value || 'this product';
    const text = `Check out this animal welfare analysis of ${productName} from Welfare Footprint App`;
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=600,height=600');
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        window.open(url, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard",
        });
        break;
    }
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
  const ethicalSwapsData = analysisData?.ethicalSwaps?.[0]; // Extract the first (and only) swap response
  const suggestions = ethicalSwapsData?.suggestions || [];
  const generalNote = ethicalSwapsData?.generalNote;
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
              Product Welfare Assessment
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
                {analysisData?.ethicalSwaps && (
                  <div className="border-b border-gray-700 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-emerald-400">Ethical Lens ⚖️</h3>
                      <span className={`text-sm font-medium ${getEthicalLensColor(ethicalLensValue)}`}>
                        {getEthicalLensLabel(ethicalLensValue)}
                      </span>
                    </div>

                    {suggestions.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {suggestions.map((swap: any, idx: number) => (
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

                        {generalNote && (
                          <Alert className="mt-3 border-blue-500/50 bg-blue-500/10">
                            <AlertDescription className="text-blue-200 text-xs">
                              <strong>Note:</strong> {generalNote}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <p className="text-gray-400 text-sm">
                          No Ethical Lens suggestions were generated for this analysis. The person who shared this link did not request product alternatives.
                        </p>
                      </div>
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

          </div>

          {/* Social Sharing Section */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Share2 className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-300">Share this result</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => handleShare('twitter')}
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800/50 hover:bg-gray-700 text-white"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X
              </Button>
              <Button
                onClick={() => handleShare('linkedin')}
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800/50 hover:bg-gray-700 text-white"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </Button>
              <Button
                onClick={() => handleShare('whatsapp')}
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800/50 hover:bg-gray-700 text-white"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </Button>
              <Button
                onClick={() => handleShare('copy')}
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800/50 hover:bg-gray-700 text-white"
              >
                Copy Link
              </Button>
            </div>
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