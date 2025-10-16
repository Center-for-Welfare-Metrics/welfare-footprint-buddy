import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TIERS } from '@/config/subscription.config';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, AlertTriangle, Crown } from 'lucide-react';
import { toast } from 'sonner';

export const SubscriptionManagement = () => {
  const { 
    tier, 
    isSubscribed, 
    subscriptionEnd, 
    scansUsed, 
    scansRemaining, 
    usagePercent,
    warning,
    refreshSubscription,
    refreshQuota,
    isLoading 
  } = useSubscription();
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    setProcessingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error('Failed to create checkout session', {
        description: error.message,
      });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error('Failed to open customer portal', {
        description: error.message,
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refreshSubscription(), refreshQuota()]);
    toast.success('Subscription status refreshed');
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
              {SUBSCRIPTION_TIERS[tier].name}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isSubscribed && subscriptionEnd && (
              <>Renews on {new Date(subscriptionEnd).toLocaleDateString()}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Monthly Usage</span>
              <span className="font-medium">
                {scansUsed} / {SUBSCRIPTION_TIERS[tier].scansPerMonth} scans
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            {warning && (
              <div className="flex items-center gap-2 mt-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">You've used {usagePercent}% of your monthly quota</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              Refresh Status
            </Button>
            {isSubscribed && (
              <Button onClick={handleManageSubscription} disabled={openingPortal}>
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(SUBSCRIPTION_TIERS).map(([key, plan]) => {
          const isCurrentPlan = key === tier;
          const isFree = key === 'free';

          return (
            <Card 
              key={key} 
              className={isCurrentPlan ? 'border-primary shadow-lg' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {key === 'pro' && <Crown className="h-5 w-5 text-primary" />}
                  </CardTitle>
                  {isCurrentPlan && (
                    <Badge variant="default">Current</Badge>
                  )}
                </div>
                <CardDescription className="text-2xl font-bold">
                  {isFree ? 'Free' : `$${plan.price}`}
                  {!isFree && <span className="text-sm font-normal">/month</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isFree && !isCurrentPlan && (
                  <Button 
                    onClick={() => handleSubscribe(plan.priceId!)}
                    disabled={processingCheckout}
                    className="w-full"
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
