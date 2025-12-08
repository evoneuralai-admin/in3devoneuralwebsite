import api from '../config/axios';
import { SUBSCRIPTION_PLANS } from './subscriptionService';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export class RazorpayService {
  private static instance: RazorpayService;
  private razorpayKeyId: string;
  private scriptLoaded: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {
    // Try multiple ways to get the Razorpay key ID
    this.razorpayKeyId = 
      import.meta.env.VITE_RAZORPAY_KEY_ID || 
      (window as any).__RAZORPAY_KEY_ID__ || 
      '';
    
    if (typeof window === 'undefined') {
      console.warn('RazorpayService: Not in browser environment, skipping initialization');
      return;
    }
    
    // In preview environments, try to fetch from API if not available
    if (!this.razorpayKeyId) {
      console.warn('Razorpay key ID not found in environment variables - attempting to fetch from API');
      this.fetchRazorpayKeyFromAPI().then(() => {
        if (this.razorpayKeyId) {
          this.isInitialized = true;
          this.loadRazorpayScript();
        } else {
          console.warn('Razorpay key ID could not be retrieved - payment features will be disabled');
        }
      }).catch(() => {
        console.warn('Failed to fetch Razorpay key from API - payment features will be disabled');
      });
      return;
    }
    
    this.isInitialized = true;
    this.loadRazorpayScript();
  }

  private async fetchRazorpayKeyFromAPI(): Promise<void> {
    try {
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/config/razorpay-key`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.keyId) {
          this.razorpayKeyId = data.keyId;
        }
      }
    } catch (error) {
      console.error('Failed to fetch Razorpay key from API:', error);
    }
  }

  private getApiBaseUrl(): string {
    // Check for explicit API base URL from environment
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    
    // Use local backend in development
    if (import.meta.env.DEV) {
      return 'http://localhost:5001/in3devoneuralai/us-central1/api';
    }
    
    const region = 'us-central1';
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'in3devoneuralai';
    return `https://${region}-${projectId}.cloudfunctions.net/api`;
  }

  private loadRazorpayScript(): void {
    if (this.scriptLoaded || typeof window === 'undefined') return;
    
    // Check if script is already loaded
    if (window.Razorpay) {
      this.scriptLoaded = true;
      return;
    }
    
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        this.scriptLoaded = true;
      });
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      this.scriptLoaded = true;
      console.log('✅ Razorpay script loaded successfully');
    };
    script.onerror = (error) => {
      console.error('Failed to load Razorpay script:', error);
      // Retry after a delay
      setTimeout(() => {
        if (!this.scriptLoaded) {
          console.log('🔄 Retrying Razorpay script load...');
          this.loadRazorpayScript();
        }
      }, 2000);
    };
    document.head.appendChild(script);
  }

  public static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  private async waitForRazorpayScript(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Razorpay is not available in this environment');
    }
    if (!this.isInitialized) {
      throw new Error('Razorpay is not properly initialized. Please check your environment variables.');
    }
    if (!this.scriptLoaded) {
      return new Promise((resolve, reject) => {
        const checkScript = () => {
          if (this.scriptLoaded) {
            resolve();
          } else {
            setTimeout(checkScript, 100);
          }
        };
        checkScript();
        setTimeout(() => {
          reject(new Error('Razorpay script failed to load within 10 seconds'));
        }, 10000);
      });
    }
  }

  private async createOrder(planId: string, userId: string): Promise<{ id: string; amount: number }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Razorpay is not properly initialized');
      }
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('Invalid plan selected');
      if (plan.price === null || plan.price === undefined) {
        throw new Error('This plan does not support direct payment. Please contact us for pricing.');
      }
      // Razorpay expects amount in paise, so multiply by 100
      const amountInPaise = Math.round(plan.price * 100);
      const response = await api.post('/payment/create-order', {
        amount: amountInPaise,
        currency: 'INR',
        planId,
        userId
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  public async initializePayment(planId: string, userEmail: string, userId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Payment is not available. Please check your configuration.');
      }
      await this.waitForRazorpayScript();
      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }
      const order = await this.createOrder(planId, userId);
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan selected');
      }
      return new Promise<void>((resolve, reject) => {
        const options = {
          key: this.razorpayKeyId,
          amount: order.amount,
          currency: 'INR',
          name: 'In3D.Ai',
          description: `Upgrade to ${plan.name} Plan`,
          order_id: order.id,
          prefill: { email: userEmail },
          handler: async (response: any) => {
            try {
              await this.verifyPayment(response, userId, planId);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
            confirm_close: true,
            escape: true,
            handleback: true
          },
          theme: { color: '#3B82F6' },
          // Add these options to prevent COOP issues
          config: {
            display: {
              blocks: {
                banks: {
                  name: "Pay using UPI",
                  instruments: [
                    {
                      method: "upi"
                    }
                  ]
                }
              },
              sequence: ["block.banks"],
              preferences: {
                show_default_blocks: false
              }
            }
          }
        };
        
        try {
          const rzp = new window.Razorpay(options);
          
          // Add event listeners to handle popup issues
          rzp.on('payment.failed', (response: any) => {
            console.error('Payment failed:', response.error);
            reject(new Error(`Payment failed: ${response.error.description || 'Unknown error'}`));
          });
          
          rzp.on('payment.cancelled', () => {
            reject(new Error('Payment was cancelled by user'));
          });
          
          // Try to open the payment modal
          try {
            const popup = rzp.open();
            
            // Check if popup was blocked
            if (popup && popup.closed) {
              throw new Error('Popup blocked by browser');
            }
            
            // Add a timeout to detect if popup is blocked
            setTimeout(() => {
              if (popup && popup.closed) {
                reject(new Error('Popup blocked by browser. Please allow popups for this site.'));
              }
            }, 1000);
            
          } catch (popupError) {
            console.warn('Popup blocked, trying redirect method:', popupError);
            // Fallback to redirect method if popup is blocked
            this.initializePaymentWithRedirect(options, resolve, reject);
          }
        } catch (error) {
          console.error('Error opening Razorpay modal:', error);
          reject(new Error('Failed to open payment modal. Please try again.'));
        }
      });
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw error;
    }
  }

  private initializePaymentWithRedirect(options: any, resolve: () => void, reject: (error: Error) => void): void {
    try {
      // Create a form and submit it to redirect to Razorpay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://checkout.razorpay.com/v1/checkout.html';
      form.target = '_blank';
      
      // Add all the options as hidden fields
      Object.keys(options).forEach(key => {
        if (key !== 'handler' && key !== 'modal' && key !== 'config') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = typeof options[key] === 'object' ? JSON.stringify(options[key]) : options[key];
          form.appendChild(input);
        }
      });
      
      // Add success and cancel URLs
      const successInput = document.createElement('input');
      successInput.type = 'hidden';
      successInput.name = 'callback_url';
      successInput.value = `${window.location.origin}/payment-success`;
      form.appendChild(successInput);
      
      const cancelInput = document.createElement('input');
      cancelInput.type = 'hidden';
      cancelInput.name = 'cancel_url';
      cancelInput.value = `${window.location.origin}/payment-cancelled`;
      form.appendChild(cancelInput);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      // For redirect method, we can't easily track the result
      // The user will be redirected back to our success/cancel URLs
      resolve();
    } catch (error) {
      console.error('Error with redirect payment:', error);
      reject(new Error('Failed to initialize redirect payment'));
    }
  }

  private async verifyPayment(response: any, userId: string, planId: string): Promise<void> {
    try {
      const verifyRes = await api.post('/payment/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
      if (!verifyRes.data.success) {
        throw new Error('Payment verification failed');
      }
      // Create subscription after payment verification
      await api.post('/subscription/create', {
        userId,
        planId,
        planName: SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name || planId,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id
      });
    } catch (error) {
      console.error('Error verifying payment or creating subscription:', error);
      throw error;
    }
  }

  /**
   * Initialize subscription checkout for a plan
   * @param planId - Internal plan ID (e.g., 'pro', 'team')
   * @param userEmail - User's email address
   * @param userId - User's unique identifier
   * @param billingCycle - 'monthly' or 'yearly'
   * @param customerName - Optional customer name
   * @param customerContact - Optional customer contact number
   */
  public async initializeSubscription(
    planId: string,
    userEmail: string,
    userId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    customerName?: string,
    customerContact?: string
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Payment is not available. Please check your configuration.');
      }
      await this.waitForRazorpayScript();
      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      // Create subscription checkout on backend
      const checkoutResponse = await api.post('/subscription/checkout', {
        userId,
        planId,
        billingCycle,
        customerEmail: userEmail,
        customerName,
        customerContact
      });

      if (!checkoutResponse.data.success) {
        throw new Error(checkoutResponse.data.error || 'Failed to create subscription checkout');
      }

      const { subscription_id, razorpay_plan_id, checkout_url } = checkoutResponse.data.data;

      // If checkout_url is provided, redirect to it
      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      }

      // Otherwise, use Razorpay subscription checkout modal
      return new Promise<void>((resolve, reject) => {
        const options = {
          key: this.razorpayKeyId,
          subscription_id: subscription_id,
          name: 'In3D.Ai',
          description: `Subscribe to ${plan.name} Plan (${billingCycle})`,
          prefill: {
            email: userEmail,
            name: customerName,
            contact: customerContact
          },
          handler: async (response: any) => {
            try {
              // Subscription created successfully
              await this.handleSubscriptionSuccess(response, userId, planId, subscription_id);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Subscription cancelled')),
            confirm_close: true,
            escape: true,
            handleback: true
          },
          theme: { color: '#3B82F6' }
        };

        try {
          const rzp = new window.Razorpay(options);

          // Add event listeners
          rzp.on('payment.failed', (response: any) => {
            console.error('Subscription payment failed:', response.error);
            reject(new Error(`Payment failed: ${response.error.description || 'Unknown error'}`));
          });

          rzp.on('payment.cancelled', () => {
            reject(new Error('Subscription was cancelled by user'));
          });

          rzp.open();
        } catch (error) {
          console.error('Error opening Razorpay subscription modal:', error);
          reject(new Error('Failed to open subscription modal. Please try again.'));
        }
      });
    } catch (error) {
      console.error('Subscription initialization error:', error);
      throw error;
    }
  }

  /**
   * Handle successful subscription creation
   */
  private async handleSubscriptionSuccess(
    response: any,
    userId: string,
    planId: string,
    razorpaySubscriptionId: string
  ): Promise<void> {
    try {
      // Create/update subscription in our system
      await api.post('/subscription/create', {
        userId,
        planId,
        planName: SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name || planId,
        razorpaySubscriptionId
      });
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && !!this.razorpayKeyId;
  }
}

export const razorpayService = RazorpayService.getInstance(); 