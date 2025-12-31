# Razorpay Plans Verification Guide

## Quick Check Summary

To verify Razorpay plans are correctly configured:

### 1. Check Environment Variables

The following environment variables should be set in `server/client/.env`:

```env
VITE_RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxxx
VITE_RAZORPAY_PRO_YEARLY_PLAN_ID=plan_xxxxx
VITE_RAZORPAY_TEAM_MONTHLY_PLAN_ID=plan_xxxxx
VITE_RAZORPAY_TEAM_YEARLY_PLAN_ID=plan_xxxxx
VITE_RAZORPAY_ENTERPRISE_MONTHLY_PLAN_ID=plan_xxxxx
VITE_RAZORPAY_ENTERPRISE_YEARLY_PLAN_ID=plan_xxxxx
```

### 2. Expected Plan Prices

Based on `subscriptionService.ts`:

- **Pro Monthly**: ₹12,000
- **Pro Yearly**: ₹1,20,000
- **Team Monthly**: ₹25,000
- **Team Yearly**: ₹2,50,000
- **Enterprise Monthly**: ₹50,000 (custom pricing)
- **Enterprise Yearly**: ₹5,00,000 (custom pricing)

### 3. Verify Plans in Razorpay Dashboard

1. Go to: https://dashboard.razorpay.com/app/subscriptions/plans
2. Check that all 6 plans exist
3. Verify amounts match the expected prices above
4. Copy the Plan IDs and compare with environment variables

### 4. Test API Connection

Run the test script (requires Razorpay credentials in .env):

```bash
# Set credentials in .env file first
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# Then run
node scripts/test-razorpay-plans.js
```

### 5. Check Pricing Page Mapping

The pricing page uses these plan IDs from `subscriptionService.ts`:
- `free` - No Razorpay plan (handled in app)
- `pro` - Uses `razorpayPlanIdMonthly` and `razorpayPlanIdYearly`
- `team` - Uses `razorpayPlanIdMonthly` and `razorpayPlanIdYearly`
- `enterprise` - Uses `razorpayPlanIdMonthly` and `razorpayPlanIdYearly`

### 6. Function to Get Razorpay Plan ID

The code uses `getRazorpayPlanId(planId, billingCycle)` which:
- Takes plan ID: `'pro'`, `'team'`, or `'enterprise'`
- Takes billing cycle: `'monthly'` or `'yearly'`
- Returns the Razorpay Plan ID from environment variables

### Common Issues

1. **Missing Plan IDs**: Check browser console for warnings about missing plan IDs
2. **Amount Mismatch**: Verify plan amounts in Razorpay dashboard match expected prices
3. **Wrong Environment**: Make sure you're using test credentials for test mode and live for production



