/**
 * Subscription Configuration
 * 
 * Centralized configuration for subscription tiers and pricing.
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    productId: 'free',
    scansPerMonth: 10,
    features: [
      '10 scans per month',
      'Basic welfare analysis',
      'Ethical lens customization',
    ],
  },
  basic: {
    name: 'Basic',
    price: 3.99,
    priceId: 'price_1SIzOQLVMPYO4lWcpamrjQvZ',
    productId: 'prod_TFUNPU55PGdYSt',
    scansPerMonth: 200,
    features: [
      '200 scans per month',
      'Advanced welfare analysis',
      'Ethical lens customization',
      'Scan history',
      'Export results',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceId: 'price_1SIzOcLVMPYO4lWcDIMYeXeN',
    productId: 'prod_TFUNP2Cp1fIeun',
    scansPerMonth: 1000,
    features: [
      '1,000 scans per month',
      'Advanced welfare analysis',
      'Ethical lens customization',
      'Scan history & analytics',
      'Export results',
      'API access',
      'Priority support',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const getSubscriptionTier = (productId: string): SubscriptionTier => {
  if (productId === SUBSCRIPTION_TIERS.basic.productId) return 'basic';
  if (productId === SUBSCRIPTION_TIERS.pro.productId) return 'pro';
  return 'free';
};

export const RATE_LIMITS = {
  pro: {
    requestsPerHour: 100,
  },
} as const;

export const USAGE_WARNING_THRESHOLD = 0.8; // 80%
