import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SubscriptionPlan, UserSubscription } from '../types/subscription';
import api from '../config/axios';

// Helper function to get plans with specific billing cycle
export const getSubscriptionPlans = (billingCycle: 'monthly' | 'yearly'): SubscriptionPlan[] => {
  const basePlans = [
  {
    id: 'free',
    name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyIn3DGenerations: 5,
      assetsPerGeneration: 1,
      maxAssetsPerMonth: 5,
      commercialRights: false,
      teamCollaboration: false,
      apiAccess: false,
      unityUnrealIntegration: false,
      supportLevel: 'Community',
    features: [
        '5 In3D.Ai generations per month',
        '1 asset per generation',
        '5 max assets per month',
      'Community support'
    ],
    limits: {
      skyboxGenerations: 5,
      maxQuality: 'standard',
      customStyles: false,
      apiAccess: false
    }
  },
  {
    id: 'pro',
    name: 'Pro',
      monthlyPrice: 12000, // ₹12,000/month
      yearlyPrice: 120000, // ₹1,20,000/year
      monthlyIn3DGenerations: 60,
      assetsPerGeneration: 3,
      maxAssetsPerMonth: 180,
      commercialRights: true,
      teamCollaboration: false,
      apiAccess: true,
      unityUnrealIntegration: true,
      supportLevel: 'Standard',
      features: [
        '60 In3D.Ai generations per month',
        '3 assets per generation',
        '180 max assets per month',
        'Commercial rights',
        'API access',
        'Unity/Unreal integration',
        'Standard support'
      ],
      limits: {
        skyboxGenerations: 60,
        maxQuality: 'high',
        customStyles: true,
        apiAccess: true
      }
    },
    {
      id: 'team',
      name: 'Team',
      monthlyPrice: 25000, // ₹25,000/month
      yearlyPrice: 250000, // ₹2,50,000/year
      monthlyIn3DGenerations: 120,
      assetsPerGeneration: 4,
      maxAssetsPerMonth: 480,
      commercialRights: true,
      teamCollaboration: true,
      apiAccess: true,
      unityUnrealIntegration: true,
      supportLevel: 'Priority',
    features: [
        '120 In3D.Ai generations per month',
        '4 assets per generation',
        '480 max assets per month',
        'Commercial rights',
        'Team collaboration',
      'API access',
        'Unity/Unreal integration',
        'Priority support'
    ],
    limits: {
        skyboxGenerations: 120,
      maxQuality: 'high',
      customStyles: true,
      apiAccess: true
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
      monthlyPrice: null, // Contact Us
      yearlyPrice: null, // Custom
      monthlyIn3DGenerations: null, // Custom
      assetsPerGeneration: 5,
      maxAssetsPerMonth: null, // Custom
      commercialRights: true,
      teamCollaboration: true,
      apiAccess: true,
      unityUnrealIntegration: true,
      supportLevel: 'Dedicated',
    features: [
        'Custom In3D.Ai generations',
        'Up to 5 assets per generation',
        'Custom max assets per month',
        'Commercial rights',
        'Team collaboration',
        'API access',
        'Unity/Unreal integration',
        'Dedicated support'
    ],
    limits: {
        skyboxGenerations: Infinity,
      maxQuality: 'ultra',
      customStyles: true,
      apiAccess: true
    }
  }
];

  return basePlans.map(plan => ({
    id: plan.id,
    name: plan.name,
    price: billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice,
    billingCycle,
    features: plan.features,
    limits: plan.limits,
    monthlyIn3DGenerations: plan.monthlyIn3DGenerations,
    assetsPerGeneration: plan.assetsPerGeneration,
    maxAssetsPerMonth: plan.maxAssetsPerMonth,
    commercialRights: plan.commercialRights,
    teamCollaboration: plan.teamCollaboration,
    apiAccess: plan.apiAccess,
    unityUnrealIntegration: plan.unityUnrealIntegration,
    supportLevel: plan.supportLevel
  }));
};

// Export default monthly plans for backward compatibility
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = getSubscriptionPlans('monthly');

/**
 * Creates a default subscription document for a new user
 * @param userId - The user's unique identifier
 * @returns Default subscription document
 */
export const createDefaultSubscription = async (userId: string): Promise<UserSubscription> => {
  if (!db) {
    throw new Error('Firestore is not available');
  }

  const defaultSubscription: UserSubscription = {
    userId,
    planId: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usage: {
      skyboxGenerations: 0
    }
  };

  const subscriptionRef = doc(db, 'subscriptions', userId);
  await setDoc(subscriptionRef, defaultSubscription);
  
  console.log(`Default subscription created for user: ${userId}`);
  return defaultSubscription;
};

class SubscriptionService {
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    try {
      if (!db) {
        throw new Error('Firestore is not available');
      }
      
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      if (subscriptionDoc.exists()) {
        return subscriptionDoc.data() as UserSubscription;
      } else {
        // Create default free subscription using the helper function
        return await createDefaultSubscription(userId);
      }
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  }

  async updateUserSubscription(userId: string, subscriptionData: Partial<UserSubscription>): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore is not available');
      }
      
      const subscriptionRef = doc(db, 'subscriptions', userId);
      await updateDoc(subscriptionRef, {
        ...subscriptionData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  async incrementUsage(userId: string, usageType: keyof UserSubscription['usage']): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore is not available');
      }
      
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      if (subscriptionDoc.exists()) {
        const currentData = subscriptionDoc.data() as UserSubscription;
        const currentUsage = currentData.usage?.[usageType] || 0;
        
        await updateDoc(subscriptionRef, {
          [`usage.${usageType}`]: currentUsage + 1,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  async checkUsageLimit(userId: string, usageType: keyof UserSubscription['usage']): Promise<boolean> {
    try {
      if (!db) {
        throw new Error('Firestore is not available');
      }
      
      const subscription = await this.getUserSubscription(userId);
      const currentPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === subscription.planId);
      
      if (!currentPlan) {
        return false;
      }
      
      const currentUsage = subscription.usage?.[usageType] || 0;
      
      // Map usage types to limit keys - only skyboxGenerations is supported
      if (usageType === 'skyboxGenerations') {
        const limit = currentPlan.limits.skyboxGenerations;
        return currentUsage < limit;
      }
      
      // For other usage types (count, limit), return true (no limit check)
      return true;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      throw error;
    }
  }

  async createSubscription(userId: string, planId: string, planName: string) {
    const response = await api.post('/subscription/create', { userId, planId, planName });
    return response.data;
  }

  async getUserSubscriptionStatus(userId: string) {
    const response = await api.post('/subscription/status', { userId });
    return response.data;
  }

  getPlanById(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
  }

  getAllPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }
}

export const subscriptionService = new SubscriptionService();