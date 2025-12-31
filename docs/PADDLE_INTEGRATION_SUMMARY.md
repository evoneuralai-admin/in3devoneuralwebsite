# Paddle Integration Summary

## ✅ What Has Been Completed

### 1. **Paddle Setup Guide** (`docs/PADDLE_SETUP_GUIDE.md`)
   - Comprehensive step-by-step guide for setting up Paddle products
   - Detailed instructions for creating Pro and Team plans with monthly/yearly pricing
   - Currency configuration and India exclusion instructions
   - Webhook setup instructions
   - Product ID mapping guide

### 2. **Paddle Service** (`server/client/src/services/paddleService.ts`)
   - Client-side Paddle integration service
   - Handles Paddle checkout initialization
   - Payment verification flow
   - Product configuration management

### 3. **Location Detection Utility** (`server/client/src/utils/locationUtils.ts`)
   - Automatic user location detection
   - Currency selection (INR for India, USD for international)
   - Payment provider selection (Razorpay for India, Paddle for international)
   - Price formatting utilities

### 4. **Updated Subscription Service** (`server/client/src/services/subscriptionService.ts`)
   - Added USD pricing for international users
   - Pro Plan: $145/month, $1,445/year
   - Team Plan: $301/month, $3,012/year
   - Maintains INR pricing for Indian users

### 5. **Backend Payment Routes** (`server/src/routes/payment.ts`)
   - Paddle payment verification endpoint (`/paddle/verify`)
   - Paddle webhook handler (`/paddle/webhook`)
   - Webhook signature verification
   - Event handling for:
     - `transaction.completed`
     - `transaction.payment_succeeded`
     - `transaction.payment_failed`
     - `subscription.created`
     - `subscription.updated`
     - `subscription.cancelled`

### 6. **Updated Pricing Component** (`server/client/src/Components/PricingTiers.tsx`)
   - Automatic location detection
   - Currency-aware price display
   - Payment gateway selection (Razorpay vs Paddle)
   - Dynamic pricing based on user location

### 7. **Environment Variables**
   - Client-side variables added to `server/client/env.template`
   - Server-side variables added to `server/env.template`
   - Configuration for Paddle Vendor ID, Public Key, Product IDs

## 📋 What You Need to Do Next

### Step 1: Set Up Paddle Account
1. Log in to [Paddle](https://vendors.paddle.com/login) using `ceo@evoneural.ai`
2. Follow the detailed guide in `docs/PADDLE_SETUP_GUIDE.md`

### Step 2: Create Products in Paddle
Create the following products with pricing:

**Pro Plan:**
- Monthly: $145 USD
- Yearly: $1,445 USD

**Team Plan:**
- Monthly: $301 USD
- Yearly: $3,012 USD

### Step 3: Get Paddle Credentials
After creating products, collect:
- Vendor ID
- Public Key (for client-side)
- API Key (for server-side)
- Webhook Secret
- Product Price IDs (for each plan and billing cycle)

### Step 4: Configure Webhook
1. Go to Paddle Dashboard → Developer Tools → Notifications → Webhooks
2. Add webhook URL: `https://us-central1-in3devoneuralai.cloudfunctions.net/api/paddle/webhook`
3. Subscribe to required events (see setup guide)

### Step 5: Update Environment Variables

**Client-side** (`server/client/.env`):
```env
VITE_PADDLE_VENDOR_ID=your_vendor_id
VITE_PADDLE_PUBLIC_KEY=your_public_key
VITE_PADDLE_ENVIRONMENT=production
VITE_PADDLE_PRICE_ID_PRO_MONTHLY=your_pro_monthly_price_id
VITE_PADDLE_PRICE_ID_PRO_YEARLY=your_pro_yearly_price_id
VITE_PADDLE_PRICE_ID_TEAM_MONTHLY=your_team_monthly_price_id
VITE_PADDLE_PRICE_ID_TEAM_YEARLY=your_team_yearly_price_id
```

**Server-side** (`server/.env`):
```env
PADDLE_API_KEY=your_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret
```

**Firebase Functions** (via Secret Manager):
```bash
# Add Paddle secrets to Firebase Secret Manager
firebase functions:secrets:set PADDLE_API_KEY
firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
```

### Step 6: Exclude India from Paddle Products
In Paddle dashboard, configure products to exclude India:
- Go to each product's pricing settings
- Add country restrictions to exclude India
- This ensures Indian users use Razorpay

### Step 7: Test the Integration
1. Test with an international user (non-India location)
   - Should see USD pricing
   - Should use Paddle checkout
2. Test with an Indian user
   - Should see INR pricing
   - Should use Razorpay checkout
3. Test webhook events
   - Monitor webhook logs in Firebase Functions
   - Verify subscription creation in Firestore

## 🔍 How It Works

### Location Detection
- Uses browser's `Intl` API to detect timezone and locale
- If India is detected → Uses Razorpay with INR pricing
- Otherwise → Uses Paddle with USD pricing

### Payment Flow

**For International Users (Paddle):**
1. User selects plan and billing cycle
2. System detects non-India location
3. Shows USD pricing
4. Opens Paddle checkout
5. User completes payment
6. Paddle sends webhook to backend
7. Backend verifies and creates subscription

**For Indian Users (Razorpay):**
1. User selects plan and billing cycle
2. System detects India location
3. Shows INR pricing
4. Opens Razorpay checkout
5. User completes payment
6. Backend verifies payment
7. Creates subscription

## 📝 Important Notes

1. **Currency Conversion**: Current USD prices are approximate (based on ₹83 = $1). You may want to adjust based on current exchange rates.

2. **Paddle Checkout**: The integration uses Paddle's overlay checkout. Make sure to test the checkout flow thoroughly.

3. **Webhook Security**: Webhook signature verification is implemented. Ensure the webhook secret matches in both Paddle and your backend.

4. **Product IDs**: After creating products in Paddle, you MUST update the environment variables with the actual Price IDs.

5. **Testing**: Use Paddle's test mode for initial testing before going live.

## 🐛 Troubleshooting

### Payment Not Working
- Check if Paddle credentials are correctly set in environment variables
- Verify Product Price IDs are correct
- Check browser console for errors
- Verify webhook endpoint is accessible

### Wrong Currency Displayed
- Check location detection logic
- Verify user's browser locale/timezone settings
- Test with different locations

### Webhook Not Receiving Events
- Verify webhook URL is correct and accessible
- Check webhook secret matches
- Monitor Firebase Functions logs
- Verify events are subscribed in Paddle dashboard

## 📚 Additional Resources

- [Paddle Setup Guide](./PADDLE_SETUP_GUIDE.md) - Detailed setup instructions
- [Paddle Developer Documentation](https://developer.paddle.com/)
- [Paddle Support](https://paddle.com/support)

## ✅ Checklist

- [ ] Log in to Paddle account
- [ ] Create Pro Plan product with monthly and yearly pricing
- [ ] Create Team Plan product with monthly and yearly pricing
- [ ] Exclude India from Paddle products
- [ ] Get Vendor ID, Public Key, API Key, and Webhook Secret
- [ ] Get Product Price IDs for all plans
- [ ] Configure webhook endpoint
- [ ] Update client-side environment variables
- [ ] Update server-side environment variables
- [ ] Add Paddle secrets to Firebase Secret Manager
- [ ] Test payment flow for international users
- [ ] Test payment flow for Indian users
- [ ] Verify webhook events are received
- [ ] Monitor subscription creation in Firestore

