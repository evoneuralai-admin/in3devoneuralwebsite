import React, { useState } from 'react';
import { getSubscriptionPlans } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { razorpayService } from '../services/razorpayService';
import { toast } from 'react-hot-toast';
import { ContactFormModal } from './ContactFormModal';

interface PricingComparisonProps {
  currentSubscription?: {
    planId: string;
  };
}

export const PricingComparison: React.FC<PricingComparisonProps> = ({ currentSubscription }) => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showContactModal, setShowContactModal] = useState(false);
  
  const plans = getSubscriptionPlans(billingCycle);
  const regularPlans = plans.filter(plan => plan.id !== 'enterprise');
  const enterprisePlan = plans.find(plan => plan.id === 'enterprise');

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
      await razorpayService.initializePayment(planId, user.email, user.uid);
      toast.success('Payment successful! Your plan will be updated shortly.');
    } catch (error) {
      console.error('Payment error details:', error);
      if (error instanceof Error && error.message === 'Payment cancelled') {
        toast.error('Payment was cancelled');
      } else {
        toast.error('Failed to process payment. Please try again.');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {regularPlans.map((plan, index) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const isPopular = plan.id === 'pro';
          
          return (
            <div
              key={plan.id}
              className={`
                relative
                backdrop-blur-xl
                bg-[#0a0a0a]/80
                border rounded-2xl
                shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                p-8
                flex flex-col
                transition-all duration-300
                ${isPopular 
                  ? 'border-purple-500/50 shadow-purple-500/10 scale-105' 
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
                <h3 className={`text-3xl font-bold mb-2 ${
                  isPopular ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 'text-white'
                }`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-white">
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price !== null && plan.price !== 0 && (
                    <span className="text-lg text-gray-400 font-normal">
                      {billingCycle === 'monthly' ? '/mo' : '/yr'}
                    </span>
                  )}
                </div>
                {billingCycle === 'yearly' && plan.price !== null && plan.price > 0 && (
                  <p className="text-sm text-gray-400">
                    ₹{Math.round(plan.price / 12).toLocaleString('en-IN')}/month billed annually
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrentPlan}
                className={`
                  relative w-full px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 mb-8
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
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Monthly Generations</span>
                    <span className="text-sm font-semibold text-white">{plan.monthlyIn3DGenerations || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Assets per Generation</span>
                    <span className="text-sm font-semibold text-white">{plan.assetsPerGeneration || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Max Assets/Month</span>
                    <span className="text-sm font-semibold text-white">{plan.maxAssetsPerMonth || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Commercial Rights</span>
                    {plan.commercialRights ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Team Collaboration</span>
                    {plan.teamCollaboration ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">API Access</span>
                    {plan.apiAccess ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1a1a1a]">
                    <span className="text-sm text-gray-400">Unity/Unreal</span>
                    {plan.unityUnrealIntegration ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-gray-400">Support</span>
                    <span className="text-sm font-semibold text-white">{plan.supportLevel || 'N/A'}</span>
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
          p-10
          transition-all duration-300
          hover:shadow-[0_12px_48px_rgba(139,92,246,0.3)]
          hover:border-purple-500/50
        ">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.1] via-transparent to-pink-500/[0.1] pointer-events-none rounded-2xl overflow-hidden" />
          
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {enterprisePlan.name}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                    Enterprise
                  </span>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Custom pricing and features tailored to your enterprise needs. Scale without limits.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="text-left sm:text-right">
                  <div className="text-3xl font-bold text-white mb-1">Contact Us</div>
                  <div className="text-sm text-gray-400">Custom Pricing</div>
                </div>
                <button
                  onClick={() => handleSelectPlan('enterprise')}
                  className="
                    px-8 py-4 rounded-xl font-semibold transition-all duration-300
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-8 border-t border-purple-500/20">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Monthly Generations</div>
                <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Custom</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Assets per Generation</div>
                <div className="text-xl font-bold text-white">Up to 5</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Max Assets/Month</div>
                <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Custom</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Support Level</div>
                <div className="text-xl font-bold text-white">Dedicated</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">All Features</div>
                <div className="text-xl font-bold text-green-400 flex items-center justify-center gap-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Included
                </div>
              </div>
            </div>

            {/* Enterprise Feature List */}
            <div className="mt-8 pt-8 border-t border-purple-500/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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

