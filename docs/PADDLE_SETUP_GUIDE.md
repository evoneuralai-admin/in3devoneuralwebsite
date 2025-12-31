# Paddle Payment Integration Setup Guide

## Overview

This guide will help you set up Paddle products for international (non-Indian) users. Paddle will handle payments for users outside India, while Razorpay continues to handle payments for Indian users.

## Prerequisites

- Access to Paddle account with email: `ceo@evoneural.ai`
- Admin access to Paddle dashboard
- Understanding of current pricing structure

## Current Pricing Structure (INR → USD Conversion)

Based on current INR pricing (approximate conversion at ₹83 = $1):

### Pro Plan
- **Monthly**: ₹12,000 → **$145 USD/month**
- **Yearly**: ₹1,20,000 → **$1,445 USD/year** (Save ~17%)

### Team Plan
- **Monthly**: ₹25,000 → **$301 USD/month**
- **Yearly**: ₹2,50,000 → **$3,012 USD/year** (Save ~17%)

## Step-by-Step Paddle Setup

### Step 1: Log in to Paddle

1. Visit [https://vendors.paddle.com/login](https://vendors.paddle.com/login)
2. Log in using: `ceo@evoneural.ai`
3. Navigate to your vendor dashboard

### Step 2: Create Products

You need to create **2 products** (Pro and Team) with **2 pricing plans each** (Monthly and Yearly).

#### Product 1: Pro Plan

1. Go to **Catalog** → **Products** → **New Product**
2. **Product Details:**
   - **Name**: `In3D.AI Pro Plan`
   - **Description**: 
     ```
     Pro Plan includes:
     - 60 generations per month
     - 3 assets per generation
     - Maximum 180 assets per month
     - Commercial rights included
     - API access
     - Unity / Unreal integration
     - Standard support
     ```
   - **Product Type**: Subscription
   - **Category**: Software/SaaS
   - **Image**: Upload In3D.AI logo (optional)

3. **Create Monthly Pricing Plan:**
   - Click **Add Pricing Plan**
   - **Plan Name**: `Pro Monthly`
   - **Billing Cycle**: Monthly
   - **Price**: `$145.00 USD`
   - **Currency**: USD
   - **Trial Period**: None (or set as needed)
   - **Save Plan**

4. **Create Yearly Pricing Plan:**
   - Click **Add Pricing Plan** again
   - **Plan Name**: `Pro Yearly`
   - **Billing Cycle**: Yearly
   - **Price**: `$1,445.00 USD`
   - **Currency**: USD
   - **Trial Period**: None (or set as needed)
   - **Save Plan**

5. **Save Product**

#### Product 2: Team Plan

1. Go to **Catalog** → **Products** → **New Product**
2. **Product Details:**
   - **Name**: `In3D.AI Team Plan`
   - **Description**: 
     ```
     Team Plan includes:
     - 120 generations per month
     - 4 assets per generation
     - Maximum 480 assets per month
     - Commercial rights included
     - Team collaboration
     - API access
     - Unity / Unreal integration
     - Priority support
     ```
   - **Product Type**: Subscription
   - **Category**: Software/SaaS
   - **Image**: Upload In3D.AI logo (optional)

3. **Create Monthly Pricing Plan:**
   - Click **Add Pricing Plan**
   - **Plan Name**: `Team Monthly`
   - **Billing Cycle**: Monthly
   - **Price**: `$301.00 USD`
   - **Currency**: USD
   - **Trial Period**: None (or set as needed)
   - **Save Plan**

4. **Create Yearly Pricing Plan:**
   - Click **Add Pricing Plan** again
   - **Plan Name**: `Team Yearly`
   - **Billing Cycle**: Yearly
   - **Price**: `$3,012.00 USD`
   - **Currency**: USD
   - **Trial Period**: None (or set as needed)
   - **Save Plan**

5. **Save Product**

### Step 3: Configure Currency Settings

1. Go to **Settings** → **Business Details** → **Currencies**
2. Ensure **USD** is enabled
3. Optionally enable other currencies for automatic conversion
4. **Save Settings**

### Step 4: Exclude India from Paddle Products

To ensure Indian users use Razorpay:

1. For each product (Pro and Team):
   - Go to **Pricing Plans** → Select each plan
   - Scroll to **Country Restrictions** or **Regional Pricing**
   - **Exclude India** from these plans
   - Alternatively, set India price to $0 or disable for India

2. **Alternative Method** (if available):
   - Go to **Settings** → **Checkout** → **Regional Settings**
   - Set India to use a different payment provider
   - Or disable Paddle checkout for India

### Step 5: Get API Credentials

1. Go to **Developer Tools** → **Authentication**
2. Copy the following:
   - **Vendor ID** (also called Seller ID)
   - **API Key** (for server-side operations)
   - **Public Key** (for client-side operations)
   - **Webhook Secret** (for webhook verification)

3. **Save these credentials securely** - you'll need them for integration

### Step 6: Configure Webhooks

1. Go to **Developer Tools** → **Notifications** → **Webhooks**
2. Click **Add Webhook**
3. **Webhook URL**: `https://your-domain.com/api/paddle/webhook`
   - Replace `your-domain.com` with your actual domain
   - For Firebase Functions: `https://us-central1-in3devoneuralai.cloudfunctions.net/api/paddle/webhook`
4. **Events to Subscribe**:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.cancelled`
   - ✅ `transaction.completed`
   - ✅ `transaction.payment_succeeded`
   - ✅ `transaction.payment_failed`
5. **Save Webhook**

### Step 7: Test Mode Setup

1. Go to **Settings** → **Test Mode**
2. Enable **Test Mode** for testing
3. Get **Test Mode API credentials** (separate from production)
4. Test the checkout flow with test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

### Step 8: Product IDs Mapping

After creating products, note down the **Product IDs** and **Price IDs**:

#### Pro Plan
- Product ID: `pro_xxxxx` (from Paddle)
- Monthly Price ID: `monthly_xxxxx`
- Yearly Price ID: `yearly_xxxxx`

#### Team Plan
- Product ID: `team_xxxxx` (from Paddle)
- Monthly Price ID: `monthly_xxxxx`
- Yearly Price ID: `yearly_xxxxx`

**Important**: These IDs will be used in the code integration. Update the environment variables with these IDs.

## Environment Variables Required

Add these to your `.env` files:

```bash
# Paddle Configuration
VITE_PADDLE_VENDOR_ID=your_vendor_id
VITE_PADDLE_PUBLIC_KEY=your_public_key
PADDLE_API_KEY=your_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret

# Paddle Product IDs (update after creating products)
PADDLE_PRODUCT_ID_PRO=pro_xxxxx
PADDLE_PRICE_ID_PRO_MONTHLY=monthly_xxxxx
PADDLE_PRICE_ID_PRO_YEARLY=yearly_xxxxx
PADDLE_PRODUCT_ID_TEAM=team_xxxxx
PADDLE_PRICE_ID_TEAM_MONTHLY=monthly_xxxxx
PADDLE_PRICE_ID_TEAM_YEARLY=yearly_xxxxx
```

## Integration Checklist

- [ ] Created Pro Plan product with Monthly and Yearly pricing
- [ ] Created Team Plan product with Monthly and Yearly pricing
- [ ] Excluded India from Paddle products
- [ ] Obtained API credentials (Vendor ID, API Key, Public Key, Webhook Secret)
- [ ] Configured webhook endpoint
- [ ] Tested checkout flow in Test Mode
- [ ] Collected Product IDs and Price IDs
- [ ] Added environment variables to `.env` files
- [ ] Updated code with Product IDs and Price IDs
- [ ] Tested payment flow for international users
- [ ] Verified webhook handling

## Testing

### Test Scenarios

1. **International User (Non-India)**:
   - Should see USD pricing
   - Should use Paddle checkout
   - Should complete payment successfully

2. **Indian User**:
   - Should see INR pricing
   - Should use Razorpay checkout
   - Should not see Paddle checkout

3. **Webhook Handling**:
   - Test subscription creation
   - Test payment success
   - Test payment failure
   - Test subscription cancellation

## Support

For Paddle-specific issues:
- Paddle Documentation: [https://developer.paddle.com/](https://developer.paddle.com/)
- Paddle Support: [https://paddle.com/support](https://paddle.com/support)

For integration issues:
- Check webhook logs in Firebase Functions
- Verify API credentials are correct
- Ensure webhook endpoint is accessible

## Next Steps

After completing this setup:

1. Update environment variables with actual Product IDs and Price IDs
2. Deploy the updated code with Paddle integration
3. Test the complete payment flow
4. Monitor webhook events in Paddle dashboard
5. Monitor subscription activations in your database





