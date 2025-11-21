import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit3, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TextInputConfirmationScreenProps {
  initialText: string;
  onContinue: (confirmedText: string) => void;
  isProcessing?: boolean;
}

const EXAMPLE_DESCRIPTIONS = [
  "Grilled salmon with rice and vegetables",
  "Cheese pizza with tomato sauce",
  "Chicken curry with coconut milk and spices",
  "Scrambled eggs with toast and butter",
  "Omelet made with eggs from a certified cage-free producer",
  "Beef burger with cheese and lettuce",
  "Paella with chicken, rabbit, and vegetables",
  "Roast chicken from a high-welfare farm with potatoes",
  "Yogurt made with milk from pasture-raised cows",
  "Sushi roll with salmon and avocado",
  "Pasta with shrimp and garlic sauce",
  "Ice cream made from organic dairy ingredients"
];

const TextInputConfirmationScreen = ({ 
  initialText, 
  onContinue,
  isProcessing = false
}: TextInputConfirmationScreenProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText);
  
  // Reset text when initialText changes (e.g., when starting a new scan)
  useEffect(() => {
    setText(initialText);
  }, [initialText]);
  
  const randomExample = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * EXAMPLE_DESCRIPTIONS.length);
    return `Example: ${EXAMPLE_DESCRIPTIONS[randomIndex]}`;
  }, []);

  const handleContinue = () => {
    onContinue(text.trim());
  };

  return (
    <div className="flex flex-col items-center pb-32 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center text-white">
        Describe the Product or Dish
      </h1>
      
      <p className="text-gray-300 text-center mb-8 max-w-2xl">
        Review or edit your food description below, then continue for AI-powered analysis.
      </p>

      <div className="glass-card rounded-2xl p-6 w-full border-2 border-emerald-500/30">
        <div className="flex items-start gap-3 mb-4">
          <Edit3 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-3">
              Your Description
            </h3>
            
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={randomExample}
              className="min-h-[120px] bg-white/10 text-white border-gray-600 mb-4"
              disabled={isProcessing}
              autoComplete="off"
              data-form-type="other"
            />
            
            <Button
              onClick={handleContinue}
              disabled={!text.trim() || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Description...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextInputConfirmationScreen;
