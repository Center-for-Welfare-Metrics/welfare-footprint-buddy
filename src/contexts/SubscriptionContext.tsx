import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionTier } from '@/config/subscription.config';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isSubscribed: boolean;
  subscriptionEnd: string | null;
  scansLimit: number;
  scansUsed: number;
  scansRemaining: number;
  usagePercent: number;
  canScan: boolean;
  isLoading: boolean;
  warning: boolean;
  refreshSubscription: () => Promise<void>;
  refreshQuota: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [scansLimit, setScansLimit] = useState(10);
  const [scansUsed, setScansUsed] = useState(0);
  const [scansRemaining, setScansRemaining] = useState(10);
  const [usagePercent, setUsagePercent] = useState(0);
  const [canScan, setCanScan] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState(false);

  const refreshSubscription = async () => {
    if (!user) {
      setTier('free');
      setIsSubscribed(false);
      setScansLimit(10);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      setTier(data.tier || 'free');
      setIsSubscribed(data.subscribed || false);
      setSubscriptionEnd(data.subscription_end || null);
      setScansLimit(data.scans_limit || 10);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuota = async () => {
    if (!user) {
      setScansUsed(0);
      setScansRemaining(10);
      setUsagePercent(0);
      setCanScan(true);
      setWarning(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-scan-quota');
      if (error) throw error;

      setScansUsed(data.scans_used || 0);
      setScansRemaining(data.remaining || 0);
      setUsagePercent(data.usage_percent || 0);
      setCanScan(data.can_scan || false);
      setWarning(data.warning || false);
    } catch (error) {
      console.error('Error checking quota:', error);
    }
  };

  useEffect(() => {
    refreshSubscription();
    refreshQuota();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      refreshSubscription();
      refreshQuota();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isSubscribed,
        subscriptionEnd,
        scansLimit,
        scansUsed,
        scansRemaining,
        usagePercent,
        canScan,
        isLoading,
        warning,
        refreshSubscription,
        refreshQuota,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
