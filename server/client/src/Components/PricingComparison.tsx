import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSubscriptionPlans } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { razorpayService } from '../services/razorpayService';
import { toast } from 'react-hot-toast';
import { ContactFormModal } from './ContactFormModal';

// Animated Number Component
interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 0.6 }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTime: number;
    let startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;
    const steps = 30;
    const stepDuration = (duration * 1000) / steps;
    let currentStep = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (currentStep < steps) {
        const progress = currentStep / steps;
        // Easing function for smooth animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (difference * easeProgress);
        setDisplayValue(Math.round(currentValue));
        currentStep++;
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    if (value !== displayValue) {
      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return <span>{displayValue.toLocaleString('en-IN')}</span>;
};

interface PricingComparisonProps {
  currentSubscription?: {
    planId: string;
  };
}

export const PricingComparison: React.FC<PricingComparisonProps> = ({ currentSubscription }) => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showContactModal, setShowContactModal] = useState(false);
  const [priceKey, setPriceKey] = useState(0); // Key to trigger animation on billing cycle change
  
  const plans = getSubscriptionPlans(billingCycle);
  const monthlyPlans = getSubscriptionPlans('monthly'); // Get monthly plans to access original monthly price
  const regularPlans = plans.filter(plan => plan.id !== 'enterprise');
  const enterprisePlan = plans.find(plan => plan.id === 'enterprise');

  // Trigger animation when billing cycle changes
  useEffect(() => {
    setPriceKey(prev => prev + 1);
  }, [billingCycle]);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      toast.success('You are already on the Free plan!');
      return;
    }

    if (planId === 'enterprise') {
      // For enterprise, show contact form modal
      setShowContactModal(true);
      return;
    }

    if (!user || !user.email) {
      toast.error('Please sign in to upgrade your plan');
      return;
    }

    try {
      const loadingToast = toast.loading('Initializing subscription...');
      
      await razorpayService.initializeSubscription(
        planId,
        user.email,
        user.uid,
        billingCycle,
        user.displayName || undefined,
        undefined // customerContact - can be added if available
      );
      
      toast.dismiss(loadingToast);
      toast.success('Subscription created successfully! Your plan will be activated shortly.');
    } catch (error) {
      console.error('Subscription error details:', error);
      if (error instanceof Error) {
        if (error.message.includes('cancelled')) {
          toast.error('Subscription was cancelled');
        } else if (error.message.includes('not configured')) {
          toast.error('Subscription plans are being set up. Please try again later or contact support.');
        } else {
          toast.error(error.message || 'Failed to process subscription. Please try again.');
        }
      } else {
        toast.error('Failed to process subscription. Please try again.');
      }
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Contact Us';
    if (price === 0) return '₹0';
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'Custom';
    return value.toString();
  };

  return (
    <div className="w-full">
      {/* Monthly/Yearly Toggle */}
      <div className="flex justify-center mb-16">
        <div className="
          relative
          backdrop-blur-xl
          bg-[#0a0a0a]/80
          border border-[#1a1a1a]
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.6)]
          px-6 py-4
          transition-all duration-300
          hover:border-[#2a2a2a]
        ">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.03] via-transparent to-pink-500/[0.03] pointer-events-none rounded-2xl overflow-hidden" />
          
          <div className="relative inline-flex items-center bg-[#0f0f0f] rounded-xl p-1 border border-[#1f1f1f]">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                relative px-8 py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm
                ${billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-[#888] hover:text-white'
                }
              `}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`
                relative px-8 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 text-sm
                ${billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-[#888] hover:text-white'
                }
              `}
            >
              Yearly
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-black">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Regular Plans - Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
        {regularPlans.map((plan, index) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const isPopular = plan.id === 'pro';
          const monthlyPlan = monthlyPlans.find(p => p.id === plan.id);
          const originalMonthlyPrice = monthlyPlan?.price || null;
          
          return (
            <div
              key={plan.id}
              className={`
                relative
                backdrop-blur-xl
                bg-[#0a0a0a]/80
                border rounded-2xl
                shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                p-6 sm:p-8
                flex flex-col
                transition-all duration-300
                ${isPopular 
                  ? 'border-purple-500/50 shadow-purple-500/10 lg:scale-105' 
                  : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                }
                hover:shadow-[0_12px_48px_rgba(0,0,0,0.8)]
                ${isCurrentPlan ? 'ring-2 ring-blue-500/50' : ''}
              `}
            >
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 pointer-events-none rounded-2xl overflow-hidden ${
                isPopular 
                  ? 'bg-gradient-to-br from-purple-500/[0.08] via-transparent to-pink-500/[0.08]' 
                  : 'bg-gradient-to-br from-sky-500/[0.03] via-transparent to-purple-500/[0.03]'
              }`} />
              
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              {/* Current Plan Badge */}
              {isCurrentPlan && !isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-blue-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="relative mb-6">
                <h3 className={`text-2xl sm:text-3xl font-bold mb-2 ${
                  isPopular ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 'text-white'
                }`}>
                  {plan.name}
                </h3>
                
                {/* Animated Price Display */}
                <AnimatePresence mode="wait">
                  {billingCycle === 'yearly' && plan.price !== null && plan.price > 0 && originalMonthlyPrice !== null && originalMonthlyPrice > 0 ? (
                    <motion.div
                      key="yearly-price"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-2"
                    >
                      {/* Original Monthly Price (Strikethrough) */}
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="text-base sm:text-lg text-gray-500 line-through"
                        >
                          ₹{originalMonthlyPrice.toLocaleString('en-IN')}
                        </motion.span>
                        {/* Discounted Monthly Price */}
                        <motion.span
                          key={`price-${plan.id}-${priceKey}`}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                          className="text-3xl sm:text-4xl font-bold text-white"
                        >
                          ₹<AnimatedNumber value={Math.round(plan.price / 12)} duration={0.6} />
                        </motion.span>
                        <span className="text-base sm:text-lg text-gray-400 font-normal">
                          / month
                        </span>
                      </div>
                      {/* Yearly Billing Info */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs sm:text-sm text-gray-400"
                      >
                        Billed yearly - ₹<AnimatedNumber value={plan.price} duration={0.6} /> today
                      </motion.p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="monthly-price"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-2"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <motion.span
                          key={`price-${plan.id}-${priceKey}`}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="text-3xl sm:text-4xl font-bold text-white"
                        >
                          {plan.price === null ? 'Contact Us' : plan.price === 0 ? '₹0' : (
                            <>₹<AnimatedNumber value={plan.price} duration={0.6} /></>
                          )}
                        </motion.span>
                        {plan.price !== null && plan.price !== 0 && (
                          <span className="text-base sm:text-lg text-gray-400 font-normal">
                            {billingCycle === 'monthly' ? '/mo' : '/yr'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrentPlan}
                className={`
                  relative w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 mb-6 sm:mb-8
                  ${isCurrentPlan
                    ? 'bg-[#1a1a1a]/50 text-gray-500 cursor-not-allowed border border-[#2a2a2a]'
                    : isPopular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                    : 'bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a] hover:border-[#3a3a3a]'
                  }
                `}
              >
                {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Get Started' : 'Select Plan'}
              </button>

              {/* Key Features */}
              <div className="relative flex-1">
                <div className="space-y-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Monthly Generations</span>
                    <span className="text-xs sm:text-sm font-semibold text-white">{plan.monthlyIn3DGenerations || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Assets per Generation</span>
                    <span className="text-xs sm:text-sm font-semibold text-white">{plan.assetsPerGeneration || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Max Assets/Month</span>
                    <span className="text-xs sm:text-sm font-semibold text-white">{plan.maxAssetsPerMonth || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Commercial Rights</span>
                    {plan.commercialRights ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Team Collaboration</span>
                    {plan.teamCollaboration ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">API Access</span>
                    {plan.apiAccess ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3 border-b border-[#1a1a1a]">
                    <span className="text-xs sm:text-sm text-gray-400">Unity/Unreal</span>
                    {plan.unityUnrealIntegration ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2.5 sm:py-3">
                    <span className="text-xs sm:text-sm text-gray-400">Support</span>
                    <span className="text-xs sm:text-sm font-semibold text-white">{plan.supportLevel || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Plan - Horizontal Box */}
      {enterprisePlan && (
        <div className="
          relative
          backdrop-blur-xl
          bg-gradient-to-br from-[#0a0a0a]/90 to-[#1a0a1a]/90
          border border-purple-500/30
          rounded-2xl
          shadow-[0_8px_32px_rgba(139,92,246,0.2)]
          p-6
          transition-all duration-300
          hover:shadow-[0_12px_48px_rgba(139,92,246,0.3)]
          hover:border-purple-500/50
        ">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.1] via-transparent to-pink-500/[0.1] pointer-events-none rounded-2xl overflow-hidden" />
          
          <div className="relative">
            <div className="flex flex-row items-center justify-between gap-6 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {enterprisePlan.name}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 whitespace-nowrap">
                    Enterprise
                  </span>
                </div>
                <p className="text-gray-300 text-base leading-relaxed">
                  Custom pricing and features tailored to your enterprise needs. Scale without limits.
                </p>
              </div>
              <div className="flex flex-row items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-1">Contact Us</div>
                  <div className="text-sm text-gray-400">Custom Pricing</div>
                </div>
                <button
                  onClick={() => handleSelectPlan('enterprise')}
                  className="
                    px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-sm
                    bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700
                    text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                    whitespace-nowrap
                  "
                >
                  Contact Now
                </button>
              </div>
            </div>

            {/* Enterprise Features Grid */}
            <div className="grid grid-cols-5 gap-4 pt-4 border-t border-purple-500/20">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Monthly Generations</div>
                <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Custom</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Assets per Generation</div>
                <div className="text-lg font-bold text-white">Up to 5</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Max Assets/Month</div>
                <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Custom</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Support Level</div>
                <div className="text-lg font-bold text-white">Dedicated</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">All Features</div>
                <div className="text-lg font-bold text-green-400 flex items-center justify-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Included
                </div>
              </div>
            </div>

            {/* Enterprise Feature List */}
            <div className="mt-4 pt-4 border-t border-purple-500/20">
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 font-medium">Commercial Rights</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 font-medium">Team Collaboration</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 font-medium">API Access</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 font-medium">Unity/Unreal Integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        plan="Enterprise"
      />
    </div>
  );
};

