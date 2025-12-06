export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'limited';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number | null; // null for Enterprise (Contact Us)
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    skyboxGenerations: number;
    maxQuality: string;
    customStyles: boolean;
    apiAccess: boolean;
  };
  // New detailed fields
  monthlyIn3DGenerations?: number | null;
  assetsPerGeneration?: number;
  maxAssetsPerMonth?: number | null;
  commercialRights?: boolean;
  teamCollaboration?: boolean;
  apiAccess?: boolean;
  unityUnrealIntegration?: boolean;
  supportLevel?: string;
  // Optional fields
  description?: string;
  featuresLabel?: string;
  originalPrice?: number;
  yearlyTotal?: number;
  badge?: string;
  promotionalBanner?: string;
  isHorizontal?: boolean;
  ctaText?: string;
}

export interface UserSubscription {
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  paymentMethod?: string;
  lastPayment?: {
    amount: number;
    date: Date;
    transactionId: string;
  };
  usage: {
    skyboxGenerations: number;
    count?: number;
    limit?: number;
  };
  orderId?: string;
  paymentId?: string;
  amount?: number;
}