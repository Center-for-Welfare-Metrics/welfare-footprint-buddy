import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface ScannerScreenProps {
  onBack: () => void;
  onAnalysisComplete: (data: any, imageData: string) => void;
}

const ScannerScreen = ({ onBack, onAnalysisComplete }: ScannerScreenProps) => {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { i18n } = useTranslation();

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

  const handleAnalyze = async () => {
    if (!imageData) {
      toast({
        title: "No image selected",
        description: "Please select an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { imageData, additionalInfo, language: i18n.language }
      });

      if (error) throw error;

      if (data?.candidates?.[0]?.content?.parts[0]?.text) {
        const analysisJson = JSON.parse(data.candidates[0].content.parts[0].text);
        // Convert the imageData to the format expected by ResultsScreen
        const imageDataString = JSON.stringify(imageData);
        onAnalysisComplete(analysisJson, imageDataString);
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <button 
        onClick={onBack}
        className="self-start text-emerald-400 hover:underline mb-6"
      >
        ← Back
      </button>
      <h2 className="text-3xl font-bold mb-6 text-white">Upload Product Image</h2>
      <div className="w-full max-w-md glass-card rounded-2xl p-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-60 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center mb-6 cursor-pointer overflow-hidden"
        >
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Product Preview" 
              className="h-full w-full object-contain rounded-lg" 
            />
          ) : (
            <span className="text-gray-400">Tap to upload</span>
          )}
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageChange}
        />
        
        {imagePreview && (
          <div className="mb-6 space-y-2">
            <Label htmlFor="additional-info" className="text-sm text-gray-300">
              Have more info? share it here
            </Label>
            <Textarea
              id="additional-info"
              placeholder="Add details like certifications or farming practices to help refine the welfare results"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="min-h-[100px] bg-gray-800/50 border-gray-600 text-white"
            />
          </div>
        )}
        
        <Button 
          onClick={handleAnalyze}
          disabled={!imageData || isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold disabled:bg-gray-600 disabled:text-gray-400"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ScannerScreen;
