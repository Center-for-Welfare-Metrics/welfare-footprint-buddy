import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Edit3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DescriptionConfirmationScreenProps {
  initialDescription: string;
  imagePreview: string;
  onConfirm: (confirmedDescription: string) => void;
  isProcessing?: boolean;
}

const DescriptionConfirmationScreen = ({ 
  initialDescription, 
  imagePreview,
  onConfirm,
  isProcessing = false
}: DescriptionConfirmationScreenProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription);

  const handleConfirm = () => {
    onConfirm(description.trim());
  };

  return (
    <div className="flex flex-col items-center pb-32 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center text-white">
        {t('itemSelection.title')}
      </h1>

      {/* Image Preview */}
      <div className="w-full max-w-md mb-6">
        <img 
          src={imagePreview} 
          alt="Uploaded products" 
          className="w-full h-60 object-contain rounded-xl border-2 border-gray-700"
        />
      </div>

      {/* Description Confirmation */}
      <div className="glass-card rounded-2xl p-6 mb-6 w-full border-2 border-emerald-500/30">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">
              AI-Generated Description
            </h3>
            
            {!isEditing ? (
              <>
                <p className="text-gray-200 leading-relaxed mb-4 break-words whitespace-normal overflow-hidden">{description}</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={isProcessing}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Description
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting Items...
                      </>
                    ) : (
                      'Confirm & Continue'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-3 italic">
                  Edit the description below to ensure accurate item detection. Your corrections will guide the AI's analysis.
                </p>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: A vegan pizza with plant-based cheese and vegetables."
                  className="min-h-[120px] bg-white/10 text-white border-gray-600 mb-3"
                  disabled={isProcessing}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setDescription(initialDescription);
                    }}
                    disabled={isProcessing}
                    className="flex-1 border-gray-500 text-gray-400 hover:bg-gray-500/10"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!description.trim() || isProcessing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting Items...
                      </>
                    ) : (
                      'Confirm & Detect Items'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 w-full bg-blue-500/10 border border-blue-500/30">
        <p className="text-sm text-gray-300 text-center">
          <strong className="text-white">Note:</strong> After confirming, the app will analyze the image to detect specific food items based on your description.
        </p>
      </div>
    </div>
  );
};

export default DescriptionConfirmationScreen;
