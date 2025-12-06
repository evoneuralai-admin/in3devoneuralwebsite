import React, { useState } from 'react';
import { getSubscriptionPlans } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { razorpayService } from '../services/razorpayService';
import { toast } from 'react-hot-toast';

interface PricingTiersProps {
  currentSubscription?: {
    planId: string;
  };
}

export const PricingTiers: React.FC<PricingTiersProps> = ({ currentSubscription }) => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [tooltips, setTooltips] = useState<{ [key: string]: boolean }>({});
  
  const plans = getSubscriptionPlans(billingCycle);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      toast.success('You are already on the Free plan!');
      return;
    }

    console.log('handleSelectPlan called with planId:', planId);
    console.log('Current user:', user);

    if (!user || !user.email) {
      console.log('No user or email found');
      toast.error('Please sign in to upgrade your plan');
      return;
    }

    try {
      console.log('Attempting to initialize payment...');
      await razorpayService.initializePayment(planId, user.email, user.uid);
      console.log('Payment initialization successful');
      toast.success('Payment successful! Your plan will be updated shortly.');
    } catch (error) {
      console.error('Payment error details:', error);
      if (error instanceof Error && error.message === 'Payment cancelled') {
        toast.error('Payment was cancelled');
      } else {
        console.error('Payment error:', error);
        toast.error('Failed to process payment. Please try again.');
      }
    }
  };

  const toggleTooltip = (key: string) => {
    setTooltips(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getButtonText = (planId: string) => {
    if (currentSubscription?.planId === planId) {
      return 'Current Plan';
    }
    if (planId === 'free') {
      return 'Get Started';
    }
    return 'Upgrade';
  };

  const getSubtitle = (planId: string) => {
    if (planId === 'free') {
      return 'No credit card needed';
    }
    return 'Cancel anytime';
  };

  return (
    <div className="w-full">
      {/* Monthly/Yearly Toggle - Matching Image Design */}
      <div className="flex justify-center mb-8">
        <div className="
          relative
          backdrop-blur-xl
          bg-[#141414]/90
          border border-[#262626]
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          px-6 py-4
        ">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none rounded-2xl overflow-hidden" />
          
          <div className="relative inline-flex items-center bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                relative px-8 py-2.5 rounded-lg font-medium transition-all duration-300
                ${billingCycle === 'monthly'
                  ? 'bg-[#3a573a] text-[#90ee90]'
                  : 'text-[#a9a9a9] hover:text-gray-300'
                }
              `}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
          className={`
                relative px-8 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2
                ${billingCycle === 'yearly'
                  ? 'bg-[#3a573a] text-[#90ee90]'
                  : 'text-[#a9a9a9] hover:text-gray-300'
            }
          `}
        >
              Yearly
              <span className={`
                px-2 py-0.5 rounded-md text-xs font-semibold
                ${billingCycle === 'yearly'
                  ? 'bg-[#3a573a] text-[#90ee90]'
                  : 'bg-[#3a573a] text-[#90ee90]'
                }
              `}>
              </span>
            </button>
          </div>
        </div>
            </div>

      {/* Pricing Cards - Matching Header Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
        const isCurrentPlan = currentSubscription?.planId === plan.id;
        
        return (
          <div
            key={plan.id}
            className="
              relative
              backdrop-blur-xl
              bg-[#141414]/90
              border border-[#262626]
              rounded-2xl
              shadow-[0_8px_32px_rgba(0,0,0,0.4)]
              p-6
              flex flex-col
            "
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none rounded-2xl overflow-hidden" />
            {/* Header */}
            <div className="relative mb-4">
              <h3 className="text-2xl font-bold text-[#4ade80] mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{getSubtitle(plan.id)}</p>
              <div className="text-3xl font-bold text-white mb-1">
                ₹{plan.price}
                <span className="text-lg text-gray-400 font-normal">
                  {billingCycle === 'monthly' ? ' / month' : ' / year'}
                </span>
              </div>
              {billingCycle === 'yearly' && plan.price !== null && plan.price > 0 && (
                <p className="text-sm text-gray-400">
                  ₹{Math.round(plan.price / 12)}/month billed annually
                </p>
              )}
            </div>

            {/* Button - Matching Header Theme */}
            <button
              onClick={() => handleSelectPlan(plan.id)}
              disabled={isCurrentPlan}
              className={`
                relative w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 mb-6
                ${isCurrentPlan
                  ? 'bg-[#1a1a1a]/50 text-gray-400 cursor-not-allowed border border-[#2a2a2a]'
                  : 'bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a] hover:border-[#3a3a3a]'
                }
              `}
            >
              {getButtonText(plan.id)}
            </button>

            {/* Features Section */}
            <div className="relative flex-1">
              <h4 className="text-sm font-medium text-gray-300 mb-4">
                Essentials to get started:
              </h4>
              <ul className="space-y-3 text-sm text-gray-300">
                {plan.features.map((feature, index) => {
                  const hasTooltip = feature.includes('Core AI features') || feature.includes('monthly credits');
                  
                  // Parse feature text to highlight numbers and specific terms
                  const renderFeatureText = (text: string) => {
                    // Split by numbers, "Meshy-4", "CC BY 4.0", and priority words
                    const parts = text.split(/(\d+|Meshy-4|CC BY 4.0|Unlimited|Low|Medium|High)/i);
                    
                    return parts.map((part, i) => {
                      const lowerPart = part.toLowerCase();
                      // Highlight numbers
                      if (/^\d+$/.test(part)) {
                        return (
                          <span key={i} className="text-[#4ade80] font-medium">
                            {part}
                          </span>
                        );
                      }
                      // Highlight Meshy-4
                      if (part === 'Meshy-4') {
                        return (
                          <span key={i} className="text-[#4ade80] font-medium">
                            {part}
                          </span>
                        );
                      }
                      // Highlight priority levels
                      if (lowerPart === 'low' || lowerPart === 'medium' || lowerPart === 'high') {
                        return (
                          <span key={i} className="text-[#4ade80] font-medium">
                            {part}
                          </span>
                        );
                      }
                      // Highlight Unlimited
                      if (lowerPart === 'unlimited') {
                        return (
                          <span key={i} className="text-[#4ade80] font-medium">
                            {part}
                          </span>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    });
                  };
                  
                  return (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-[#4ade80] mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                      <div className="flex-1 flex items-center flex-wrap">
                        <span>{renderFeatureText(feature)}</span>
                        {hasTooltip && (
                          <div className="relative ml-2">
            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTooltip(`${plan.id}-${index}`);
                              }}
                              className="text-gray-500 hover:text-gray-400"
                              onMouseEnter={() => setTooltips(prev => ({ ...prev, [`${plan.id}-${index}`]: true }))}
                              onMouseLeave={() => setTooltips(prev => ({ ...prev, [`${plan.id}-${index}`]: false }))}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11.718-1.197A1 1 0 0110 7zm0 4a1 1 0 100-2 1 1 0 000 2zm-7 4a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
            </button>
                            {tooltips[`${plan.id}-${index}`] && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 backdrop-blur-xl bg-[#141414]/95 text-xs text-gray-300 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 border border-[#262626]">
                                {feature.includes('Core AI features') 
                                  ? 'Access to all core AI-powered generation features'
                                  : 'Credits reset monthly and can be used for any generation'}
                              </div>
                            )}
                          </div>
                        )}
                        {/* CC BY 4.0 License Link */}
                        {feature.includes('CC BY 4.0') && (
                          <a
                            href="https://creativecommons.org/licenses/by/4.0/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4ade80] underline ml-1 hover:text-[#4ade80]/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            CC BY 4.0 license
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
          </div>
        </div>
        );
        })}
      </div>
    </div>
  );
}; 