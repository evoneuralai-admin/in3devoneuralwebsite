# Razorpay Subscription Setup Guide

This guide explains how to set up Razorpay subscriptions for your application.

## Overview

The application now supports Razorpay recurring subscriptions. Users can subscribe to monthly or yearly plans, and payments will be automatically charged on a recurring basis.

## Prerequisites

1. Razorpay account with API keys configured
2. Environment variables set:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - Optional: `RAZORPAY_PLAN_PRO_MONTHLY`, `RAZORPAY_PLAN_PRO_YEARLY`, `RAZORPAY_PLAN_TEAM_MONTHLY`, `RAZORPAY_PLAN_TEAM_YEARLY`

## Step 1: Create Razorpay Plans

You need to create subscription plans in Razorpay. You can do this in two ways:

### Option A: Using the API (Recommended)

Use the `/razorpay/plan/create` endpoint to create plans programmatically:

```bash
# Create Pro Monthly Plan
curl -X POST https://your-api-url/razorpay/plan/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Monthly",
    "amount": 12000,
    "currency": "INR",
    "interval": 1,
    "period": "monthly",
    "description": "Pro Plan - Monthly Subscription"
  }'

# Create Pro Yearly Plan
curl -X POST https://your-api-url/razorpay/plan/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Yearly",
    "amount": 120000,
    "currency": "INR",
    "interval": 1,
    "period": "yearly",
    "description": "Pro Plan - Yearly Subscription"
  }'

# Create Team Monthly Plan
curl -X POST https://your-api-url/razorpay/plan/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Monthly",
    "amount": 25000,
    "currency": "INR",
    "interval": 1,
    "period": "monthly",
    "description": "Team Plan - Monthly Subscription"
  }'

# Create Team Yearly Plan
curl -X POST https://your-api-url/razorpay/plan/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Yearly",
    "amount": 250000,
    "currency": "INR",
    "interval": 1,
    "period": "yearly",
    "description": "Team Plan - Yearly Subscription"
  }'
```

### Option B: Using Razorpay Dashboard

1. Log in to your Razorpay Dashboard
2. Go to **Settings** → **Plans**
3. Click **Create Plan**
4. Fill in the details:
   - **Plan Name**: e.g., "Pro Monthly"
   - **Amount**: ₹12,000 (in rupees, not paise)
   - **Billing Period**: Monthly or Yearly
   - **Interval**: 1
5. Save the plan and note the Plan ID

## Step 2: Map Plan IDs

After creating plans, you need to map your internal plan IDs to Razorpay plan IDs. Update the `RAZORPAY_PLAN_MAP` in `functions/src/index.ts` or set environment variables:

```bash
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PRO_YEARLY=plan_yyyyyyyyyyyyy
RAZORPAY_PLAN_TEAM_MONTHLY=plan_zzzzzzzzzzzzz
RAZORPAY_PLAN_TEAM_YEARLY=plan_wwwwwwwwwwwww
```

Or update the code directly in `functions/src/index.ts`:

```typescript
const RAZORPAY_PLAN_MAP: Record<string, { monthly?: string; yearly?: string }> = {
  'pro': {
    monthly: 'plan_xxxxxxxxxxxxx', // Replace with actual Razorpay plan ID
    yearly: 'plan_yyyyyyyyyyyyy'   // Replace with actual Razorpay plan ID
  },
  'team': {
    monthly: 'plan_zzzzzzzzzzzzz', // Replace with actual Razorpay plan ID
    yearly: 'plan_wwwwwwwwwwwww'   // Replace with actual Razorpay plan ID
  }
};
```

## Step 3: Update Components to Use Subscriptions

The `RazorpayService` now has a new method `initializeSubscription()` that should be used instead of `initializePayment()` for subscription-based plans.

### Example Usage

```typescript
import { razorpayService } from '../services/razorpayService';

// Initialize subscription checkout
await razorpayService.initializeSubscription(
  'pro',                    // planId
  'user@example.com',       // userEmail
  'user-id-123',            // userId
  'monthly',                // billingCycle: 'monthly' | 'yearly'
  'John Doe',               // customerName (optional)
  '+919876543210'           // customerContact (optional)
);
```

## Step 4: Handle Subscription Webhooks (Optional but Recommended)

Set up webhooks in Razorpay Dashboard to handle subscription events:

1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-api-url/razorpay/webhook`
3. Select events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.paused`
   - `subscription.cancelled`
   - `subscription.completed`

## API Endpoints

### Create Razorpay Plan
```
POST /razorpay/plan/create
Body: {
  "name": "Plan Name",
  "amount": 12000,
  "currency": "INR",
  "interval": 1,
  "period": "monthly" | "yearly",
  "description": "Plan description"
}
```

### Create Subscription Checkout
```
POST /subscription/checkout
Body: {
  "userId": "user-id",
  "planId": "pro" | "team",
  "billingCycle": "monthly" | "yearly",
  "customerEmail": "user@example.com",
  "customerName": "John Doe" (optional),
  "customerContact": "+919876543210" (optional)
}
```

### Create Subscription Record
```
POST /subscription/create
Body: {
  "userId": "user-id",
  "planId": "pro",
  "planName": "Pro Plan",
  "razorpaySubscriptionId": "sub_xxxxxxxxxxxxx" (optional)
}
```

## Testing

1. Use Razorpay Test Mode for testing
2. Use test cards from Razorpay documentation
3. Test subscription creation, renewal, and cancellation flows

## Troubleshooting

### Error: "Razorpay plan not configured"
- Make sure you've created the plan in Razorpay
- Verify the plan ID mapping in `RAZORPAY_PLAN_MAP`
- Check environment variables if using them

### Error: "Failed to create subscription checkout"
- Verify Razorpay credentials are correct
- Check that the plan ID exists in Razorpay
- Ensure customer email is provided

### Subscription not activating
- Check Razorpay webhook logs
- Verify subscription status in Razorpay Dashboard
- Check Firebase logs for subscription creation

## Migration from One-Time Payments

If you're migrating from one-time payments to subscriptions:

1. Keep `initializePayment()` for one-time payments (if needed)
2. Update components to use `initializeSubscription()` for recurring plans
3. Update existing users' subscription records to include `razorpaySubscriptionId`
4. Set up webhooks to sync subscription status

## Support

For issues or questions:
- Check Razorpay documentation: https://razorpay.com/docs/
- Review application logs in Firebase Console
- Contact support with subscription ID and user ID

