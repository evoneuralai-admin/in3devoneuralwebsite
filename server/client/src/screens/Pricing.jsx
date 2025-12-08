import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { PricingComparison } from '../Components/PricingComparison';
import { subscriptionService } from '../services/subscriptionService';
import { toast } from 'react-hot-toast';

const Pricing = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (user?.uid) {
        try {
          const userSubscription = await subscriptionService.getUserSubscription(user.uid);
          setSubscription(userSubscription);
        } catch (error) {
          console.error('Error fetching subscription:', error);
          toast.error('Failed to load subscription information');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/30"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.4
              }}
            />
          ))}
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-bold text-white mb-6"
            >
              Choose Your Plan
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Select the plan that best fits your needs
            </motion.p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400"></div>
              </div>
            ) : (
              <PricingComparison currentSubscription={subscription} />
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="
              relative
              backdrop-blur-xl
              bg-[#141414]/90
              border border-[#262626]
              rounded-2xl
              shadow-[0_8px_32px_rgba(0,0,0,0.4)]
              p-8
            ">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none rounded-2xl overflow-hidden" />
              
              <div className="relative">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  <div className="border-b border-[#262626] pb-4">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Can I change my plan later?
                    </h4>
                    <p className="text-gray-400">
                      Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                    </p>
                  </div>
                  <div className="border-b border-[#262626] pb-4">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      What payment methods do you accept?
                    </h4>
                    <p className="text-gray-400">
                      We accept all major credit cards, debit cards, and UPI through our secure payment gateway.
                    </p>
                  </div>
                  <div className="border-b border-[#262626] pb-4">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Is there a free trial?
                    </h4>
                    <p className="text-gray-400">
                      Yes! Our Free plan is available forever with no credit card required. You can start generating immediately.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      What happens if I exceed my plan limits?
                    </h4>
                    <p className="text-gray-400">
                      You'll be notified when you're approaching your limits. You can upgrade your plan at any time to continue generating.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

