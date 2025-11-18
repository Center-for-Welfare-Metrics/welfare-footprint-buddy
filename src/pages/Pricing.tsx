import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TIERS } from '@/config/subscription.config';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';

const Pricing = () => {
  const { user } = useAuth();
  const { tier: currentTier, isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, tierName: string) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      navigate('/auth');
      return;
    }

    setProcessingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening checkout page...');
      }
    } catch (error: any) {
      toast.error('Failed to start checkout', {
        description: error.message || 'Please try again later',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const getTierIcon = (tierKey: string) => {
    switch (tierKey) {
      case 'free':
        return <Star className="h-6 w-6" />;
      case 'basic':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const isCurrentPlan = (tierKey: string) => {
    return currentTier === tierKey && isSubscribed;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Make informed food choices with our AI-powered welfare analysis. 
            Select the plan that fits your needs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
            const isCurrent = isCurrentPlan(key);
            const isPopular = key === 'basic';
            
            return (
              <Card 
                key={key} 
                className={`relative flex flex-col ${
                  isCurrent ? 'border-primary shadow-lg ring-2 ring-primary' : ''
                } ${isPopular ? 'border-primary/50' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary">
                    Current Plan
                  </Badge>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getTierIcon(key)}
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold mt-4">
                    {tier.price === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${tier.price}
                        <span className="text-base font-normal text-muted-foreground">/month</span>
                      </>
                    )}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-2">
                    {tier.scansPerMonth} scans per month
                  </p>
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6">
                  {tier.priceId ? (
                    <Button
                      onClick={() => handleSubscribe(tier.priceId!, tier.name)}
                      disabled={processingPlan === tier.priceId || isCurrent}
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {processingPlan === tier.priceId ? (
                        'Processing...'
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      className="w-full"
                    >
                      Get Started
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time from your profile settings. 
                Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my scan limit?</h3>
              <p className="text-muted-foreground">
                You'll be notified when you're approaching your limit. Once reached, you can either 
                wait for the next billing cycle or upgrade your plan to continue scanning.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is my payment information secure?</h3>
              <p className="text-muted-foreground">
                Absolutely. All payments are processed securely through Stripe. We never store your 
                payment information on our servers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Need help choosing the right plan?
          </p>
          <Button variant="outline" onClick={() => navigate('/about')}>
            Learn More About Our Mission
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
