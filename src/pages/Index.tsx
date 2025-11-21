import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HomeScreen from "@/components/HomeScreen";
import ScannerScreen from "@/components/ScannerScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ItemSelectionScreen from "@/components/ItemSelectionScreen";
import ConfirmationScreen from "@/components/ConfirmationScreen";
import DescriptionConfirmationScreen from "@/components/DescriptionConfirmationScreen";
import TextInputConfirmationScreen from "@/components/TextInputConfirmationScreen";
import NavigationWrapper from "@/components/NavigationWrapper";
import { ErrorHandler, withRetry } from "@/lib/errorHandler";

type Screen = 'home' | 'scanner' | 'confirmation' | 'textConfirmation' | 'descriptionConfirmation' | 'itemSelection' | 'results';

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
  const [enrichedDescription, setEnrichedDescription] = useState<string>("");
  
  const { toast } = useToast();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Debug log - no auth redirects should happen on Index page
  console.log('Index page loaded - user:', user?.email || 'not logged in', 'loading:', loading);

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
    setEnrichedDescription("");
  };

  const handleStartScan = () => navigateToScreen('scanner');
  
  const handleDescribeFood = () => {
    console.log('[Describe Food] Navigating to text input screen');
    
    // Navigate to text confirmation screen (Step 1 for text mode)
    setItemsSummary("");
    setDetectedItems([]);
    setScannedImageData("");
    setCurrentImagePreview("");
    setHasNoFoodItems(false);
    setEnrichedDescription("");
    setCacheMetadata(null);
    
    navigateToScreen('textConfirmation');
  };
  
  // Handle text confirmation and generate AI description
  const handleTextConfirmed = async (confirmedText: string) => {
    console.log('[Text Confirmation] Generating AI description for:', confirmedText);
    setIsAnalyzingItem(true);
    
    try {
      // Call AI to enrich the description AND detect items in parallel
      const [enrichResult, detectResult] = await Promise.all([
        withRetry(async () => {
          const res = await supabase.functions.invoke('enrich-description', {
            body: { 
              description: confirmedText,
              language: i18n.language
            }
          });
          if (res.error) {
            // Extract error details from edge function response
            const errorData = (res as any).error?.context?.body;
            const errorDetail = errorData?.error || res.error?.message || 'Description enrichment failed';
            const error = new Error(errorDetail) as any;
            error.context = { body: errorData };
            throw error;
          }
          return res;
        }, 2, 1000),
        withRetry(async () => {
          const res = await supabase.functions.invoke('analyze-image', {
            body: { 
              mode: 'detect',
              additionalInfo: confirmedText,
              language: i18n.language
            }
          });
          if (res.error) {
            // Extract error details from edge function response
            const errorData = (res as any).error?.context?.body;
            const errorDetail = errorData?.error || res.error?.message || 'Item detection failed';
            const error = new Error(errorDetail) as any;
            error.context = { body: errorData };
            throw error;
          }
          return res;
        }, 2, 1000)
      ]);

      if (enrichResult.error) throw enrichResult.error;
      if (detectResult.error) throw detectResult.error;

      // Set enriched description
      const enrichedDesc = enrichResult.data?.enrichedDescription || confirmedText;
      setEnrichedDescription(enrichedDesc);

      if (detectResult.data?.candidates?.[0]?.content?.parts[0]?.text) {
        const rawText = detectResult.data.candidates[0].content.parts[0].text;
        const sanitizedText = sanitizeJson(rawText);
        
        try {
          const detectionJson = JSON.parse(sanitizedText);
          // Store the user's description as the primary source
          setItemsSummary(confirmedText);
          setDetectedItems(detectionJson.items || []);
          setHasNoFoodItems((detectionJson.items || []).length === 0);
          setCacheMetadata(detectResult.data._metadata);
          
          console.log('[Text Confirmation] Enriched description generated:', enrichedDesc);
          
          // Navigate to description confirmation screen
          navigateToScreen('descriptionConfirmation');
        } catch (parseError) {
          console.error('[ERROR][handleTextConfirmed] JSON Parse Error:', parseError);
          throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
        }
      }
    } catch (error) {
      console.error('[ERROR][handleTextConfirmed]', error);
      
      // Extract error message from edge function response
      let errorMessage = 'We couldn\'t complete this analysis. Please try again later.';
      let errorTitle = 'Analysis Failed';
      
      // Try to extract error details from Supabase function response
      if (error && typeof error === 'object') {
        // Check if the error response contains error details
        const errorObj = error as any;
        
        // Look for error message in various possible locations
        if (errorObj.context?.body?.error) {
          errorMessage = errorObj.context.body.error;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        // Check for quota/rate limit errors
        if (errorMessage.toLowerCase().includes('daily') && 
            errorMessage.toLowerCase().includes('limit')) {
          errorTitle = 'Daily Limit Reached';
        } else if (errorMessage.toLowerCase().includes('rate limit')) {
          errorTitle = 'Rate Limit Exceeded';
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsAnalyzingItem(false);
    }
  };
  
  const handleConfirmationNeeded = (items: any[], summary: string, imageData: string, imagePreview: string, noFoodItems: boolean = false) => {
    // Store the initial detection results (Step 1)
    setDetectedItems(items);
    setItemsSummary(summary);
    setScannedImageData(imageData);
    setCurrentImagePreview(imagePreview);
    setHasNoFoodItems(noFoodItems);
    
    // Show description confirmation screen first (Step 1 UI)
    navigateToScreen('descriptionConfirmation');
  };
  
  // Step 1 → Step 2 transition: User confirms description, proceed to item detection
  const handleDescriptionConfirmed = async (confirmedDescription: string) => {
    console.log('[Step 1→2] Description confirmed:', confirmedDescription);
    setIsAnalyzingItem(true);
    
    try {
      const isTextOnlyMode = !scannedImageData || scannedImageData === "";
      
      if (isTextOnlyMode) {
        // Text-only mode: items already detected in handleTextConfirmed
        // If user edited description, re-detect
        if (confirmedDescription !== itemsSummary) {
          console.log('[Step 1→2] Text-only mode - re-detecting with edited description');
          
          const { data, error } = await withRetry(async () => {
            const res = await supabase.functions.invoke('analyze-image', {
              body: { 
                mode: 'detect',
                additionalInfo: confirmedDescription,
                language: i18n.language
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
              setDetectedItems(detectionJson.items || []);
              setItemsSummary(confirmedDescription);
              setHasNoFoodItems((detectionJson.items || []).length === 0);
              
              console.log('[Step 1→2] Text-only re-detection complete');
            } catch (parseError) {
              console.error('[ERROR][handleDescriptionConfirmed] JSON Parse Error:', parseError);
              throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
            }
          }
        } else {
          // Description not changed, use existing items from handleTextConfirmed
          setItemsSummary(confirmedDescription);
        }
      } else if (confirmedDescription !== itemsSummary) {
        // Image mode: user edited description, re-detect with new context
        console.log('[Step 1→2] Image mode - description was edited, re-analyzing');
        
        const imageData = JSON.parse(scannedImageData);
        
        const { data, error } = await withRetry(async () => {
          const res = await supabase.functions.invoke('analyze-image', {
            body: { 
              imageData,
              language: i18n.language,
              mode: 'detect',
              additionalInfo: confirmedDescription
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
            setDetectedItems(detectionJson.items || []);
            setItemsSummary(confirmedDescription);
            
            console.log('[Step 1→2] Re-analysis complete with edited description');
          } catch (parseError) {
            console.error('[ERROR][handleDescriptionConfirmed] JSON Parse Error:', parseError);
            throw new Error(`JSON Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
          }
        }
      } else {
        // Image mode: description not changed, use existing items
        setItemsSummary(confirmedDescription);
      }
      
      navigateToScreen('itemSelection');
    } catch (error) {
      const appError = ErrorHandler.parseSupabaseError(error, 'handleDescriptionConfirmed');
      toast({
        title: "Detection Failed",
        description: appError.userMessage,
        variant: "destructive",
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setIsAnalyzingItem(false);
    }
  };
  
  // Handle description edits - update summary and proceed to items
  const handleConfirmationEdit = async (editedDescription: string) => {
    console.log('[Step 1] Description edited by user');
    setItemsSummary(editedDescription);
    navigateToScreen('itemSelection');
  };

  // New Step 2: User refines detected items (adds/removes/modifies)
  const handleItemReanalyze = async (_itemName: string, userEditedDescription: string) => {
    setIsAnalyzingItem(true);
    try {
      // Call Step 2 (refine mode) with original detection results and user correction
      const originalDetectionResults = JSON.stringify({
        items: detectedItems,
        summary: itemsSummary
      });
      
      const { data, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: { 
            language: i18n.language,
            mode: 'refine', // Step 2: refinement mode
            userCorrection: userEditedDescription.trim(),
            originalDetectionResults // Pass Step 1 results
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
          // Update items from refinement, filter out suppressedByUser items
          const refinedItems = detectionJson.items.filter((item: any) => !item.suppressedByUser);
          setDetectedItems(refinedItems);
          setItemsSummary(detectionJson.summary || userEditedDescription.trim());
          
          console.log('[Step 2] Refinement complete:', {
            userEdits: detectionJson.userEdits,
            refinedItemCount: refinedItems.length
          });
        } catch (parseError) {
          console.error('[ERROR][handleItemReanalyze] JSON Parse Error:', parseError);
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
        duration: 5000, // Auto-dismiss after 5 seconds
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
      // Check if we're in text-only mode (no image data)
      const isTextOnlyMode = !scannedImageData || scannedImageData === "";
      
      console.log('[handleItemSelect] Analyzing item:', itemName, 'Text-only mode:', isTextOnlyMode);
      
      const requestBody: any = {
        language: i18n.language,
        mode: 'analyze',
        focusItem: itemName
      };

      // Only include imageData if we have it (image scan mode)
      if (!isTextOnlyMode) {
        requestBody.imageData = JSON.parse(scannedImageData);
      }

      // Include the enriched description or summary as additional context
      if (enrichedDescription) {
        requestBody.additionalInfo = enrichedDescription;
      } else if (itemsSummary) {
        requestBody.additionalInfo = itemsSummary;
      }
      
      const { data, error } = await withRetry(async () => {
        const res = await supabase.functions.invoke('analyze-image', {
          body: requestBody
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
        duration: 5000, // Auto-dismiss after 5 seconds
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
    <div className="container mx-auto max-w-4xl px-4">
      {currentScreen === 'home' && (
        <div className="p-4">
          <HomeScreen onStartScan={handleStartScan} onDescribeFood={handleDescribeFood} />
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
      
      {currentScreen === 'textConfirmation' && (
        <NavigationWrapper 
          onBack={handleBack}
          onHome={handleGoHome}
          showHome={showHomeIcon}
          isProcessing={isAnalyzingItem}
        >
          <div className="p-4">
            <TextInputConfirmationScreen
              initialText={itemsSummary}
              onContinue={handleTextConfirmed}
              isProcessing={isAnalyzingItem}
            />
          </div>
        </NavigationWrapper>
      )}
      
      {currentScreen === 'descriptionConfirmation' && (
        <NavigationWrapper 
          onBack={handleBack}
          onHome={handleGoHome}
          showHome={showHomeIcon}
          isProcessing={isAnalyzingItem}
        >
          <div className="p-4">
            <DescriptionConfirmationScreen
              initialDescription={itemsSummary}
              imagePreview={currentImagePreview}
              onConfirm={handleDescriptionConfirmed}
              isProcessing={isAnalyzingItem}
              enrichedDescription={enrichedDescription}
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
