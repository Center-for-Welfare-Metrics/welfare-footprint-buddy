import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Edit3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ConfirmationScreenProps {
  summary: string;
  imagePreview: string;
  onContinue: () => void;
  onEdit: (editedDescription: string) => void;
  onBack: () => void;
  isProcessing: boolean;
  hasNoFoodItems?: boolean;
}

const ConfirmationScreen = ({ 
  summary, 
  imagePreview,
  onContinue, 
  onEdit, 
  onBack,
  isProcessing,
  hasNoFoodItems = false
}: ConfirmationScreenProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(summary);

  const handleEditSubmit = () => {
    onEdit(editedText);
  };

  return (
    <div className="flex flex-col items-center p-4 pb-32 max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="self-start text-emerald-400 hover:underline mb-6"
        disabled={isProcessing}
      >
        ← {t('common.back')}
      </button>

      <h1 className="text-3xl font-bold mb-4 text-center text-white">
        {t('confirmation.title')}
      </h1>

      {/* Image Preview */}
      <div className="w-full max-w-md mb-6">
        <img 
          src={imagePreview} 
          alt="Uploaded product" 
          className="w-full h-60 object-contain rounded-xl border-2 border-gray-700"
        />
      </div>

      {/* Instruction Message */}
      <div className="glass-card rounded-2xl p-6 mb-6 w-full border-2 border-emerald-500/30">
        <p className="text-gray-200 text-center mb-4">
          {hasNoFoodItems ? t('confirmation.noFoodItemsMessage') : t('confirmation.instructionMessageGeneric')}
        </p>
        
        {/* AI Interpretation - Only show if food items were detected */}
        {!hasNoFoodItems && (
          !isEditing ? (
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-white text-center">{summary}</p>
            </div>
          ) : (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="mb-4 min-h-[100px] bg-white/10 text-white border-gray-600"
              disabled={isProcessing}
            />
          )
        )}
        
        {/* Allow challenge when no food items detected */}
        {hasNoFoodItems && (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder={t('confirmation.challengePlaceholder')}
            className="mb-4 min-h-[100px] bg-white/10 text-white border-gray-600"
            disabled={isProcessing}
          />
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasNoFoodItems ? (
            <>
              <Button
                onClick={handleEditSubmit}
                disabled={isProcessing || !editedText.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
              >
                {isProcessing ? t('confirmation.analyzing') : t('confirmation.challengeSubmit')}
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
              >
                {t('scanner.scanNew')}
              </Button>
            </>
          ) : !isEditing ? (
            <>
              <Button
                onClick={onContinue}
                disabled={isProcessing}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                {isProcessing ? t('confirmation.analyzing') : t('confirmation.continue')}
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                disabled={isProcessing}
                className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 gap-2"
              >
                <Edit3 className="h-5 w-5" />
                {t('confirmation.edit')}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleEditSubmit}
                disabled={isProcessing}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
              >
                {isProcessing ? t('confirmation.analyzing') : t('confirmation.submitEdit')}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditedText(summary);
                }}
                variant="outline"
                disabled={isProcessing}
                className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
              >
                {t('common.cancel')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
