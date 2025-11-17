// CHANGE START – quota system upgrade: Daily limit dialog for anonymous users
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DailyLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyLimitDialog({ open, onOpenChange }: DailyLimitDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = () => {
    navigate("/auth");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-emerald-500/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            {t('dailyLimit.title', { defaultValue: 'Daily Limit Reached' })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              {t('dailyLimit.message', { 
                defaultValue: "You've used your 10 free scans for today! To continue scanning and unlock unlimited access, please create a free account or log in."
              })}
            </p>
            <p className="text-sm text-emerald-400">
              {t('dailyLimit.benefits', {
                defaultValue: '✨ Free accounts get 10 scans per month with scan history saved!'
              })}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleLogin}
            className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold"
          >
            {t('dailyLimit.loginButton', { defaultValue: 'Log In / Sign Up' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
// CHANGE END
