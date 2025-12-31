/**
 * Script to test Razorpay API connection and list all plans
 * 
 * This script:
 * 1. Tests Razorpay API connection
 * 2. Lists all existing plans in Razorpay
 * 3. Compares with configured plans in the code
 * 4. Verifies plan IDs match
 * 
 * Usage:
 *   node scripts/test-razorpay-plans.js
 */

const path = require('path');
const fs = require('fs');

// Load dotenv from multiple possible locations
let envLoaded = false;
const possibleEnvPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'functions', '.env'),
  path.join(__dirname, '..', 'server', '.env'),
  path.join(__dirname, '..', 'server', 'client', '.env'),
  '.env'
];

try {
  const dotenv = require('dotenv');
  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      envLoaded = true;
      break;
    }
  }
  if (!envLoaded) {
    dotenv.config();
    envLoaded = true;
  }
} catch (e) {
  console.log('Note: dotenv not found, using environment variables directly');
}

// Initialize Razorpay
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('\n❌ Error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Expected plans from subscriptionService.ts
const EXPECTED_PLANS = [
  { id: 'pro', name: 'Pro', monthlyPrice: 12000, yearlyPrice: 120000 },
  { id: 'team', name: 'Team', monthlyPrice: 25000, yearlyPrice: 250000 },
  { id: 'enterprise', name: 'Enterprise', monthlyPrice: 50000, yearlyPrice: 500000 }
];

// Expected plan IDs from environment
const EXPECTED_PLAN_IDS = {
  pro: {
    monthly: process.env.VITE_RAZORPAY_PRO_MONTHLY_PLAN_ID || '',
    yearly: process.env.VITE_RAZORPAY_PRO_YEARLY_PLAN_ID || ''
  },
  team: {
    monthly: process.env.VITE_RAZORPAY_TEAM_MONTHLY_PLAN_ID || '',
    yearly: process.env.VITE_RAZORPAY_TEAM_YEARLY_PLAN_ID || ''
  },
  enterprise: {
    monthly: process.env.VITE_RAZORPAY_ENTERPRISE_MONTHLY_PLAN_ID || '',
    yearly: process.env.VITE_RAZORPAY_ENTERPRISE_YEARLY_PLAN_ID || ''
  }
};

async function testConnection() {
  console.log('\n🔌 Testing Razorpay API Connection...\n');
  console.log('='.repeat(60));
  console.log(`Key ID: ${RAZORPAY_KEY_ID.substring(0, 12)}...`);
  console.log(`Mode: ${RAZORPAY_KEY_ID.startsWith('rzp_test_') ? 'TEST' : 'LIVE'}`);
  console.log('='.repeat(60));
  
  try {
    // Test connection by fetching account details
    const account = await razorpay.accounts.fetch();
    console.log('✅ Razorpay API connection successful!');
    console.log(`   Account ID: ${account.id || 'N/A'}`);
    return true;
  } catch (error) {
    console.error('❌ Razorpay API connection failed!');
    console.error(`   Error: ${error.message}`);
    if (error.error) {
      console.error(`   Details: ${JSON.stringify(error.error, null, 2)}`);
    }
    return false;
  }
}

async function listAllPlans() {
  console.log('\n📋 Fetching all Razorpay Plans...\n');
  
  try {
    const plans = await razorpay.plans.all();
    console.log(`✅ Found ${plans.items.length} plans in Razorpay:\n`);
    
    if (plans.items.length === 0) {
      console.log('⚠️  No plans found in Razorpay account.');
      console.log('   Run: node scripts/create-razorpay-plans.js to create plans.');
      return [];
    }
    
    // Display all plans
    plans.items.forEach((plan, index) => {
      const amount = plan.item ? plan.item.amount / 100 : 0;
      const period = plan.period || 'N/A';
      const interval = plan.interval || 'N/A';
      
      console.log(`${index + 1}. ${plan.item?.name || 'Unnamed Plan'}`);
      console.log(`   Plan ID: ${plan.id}`);
      console.log(`   Amount: ₹${amount.toLocaleString('en-IN')}`);
      console.log(`   Period: ${period} (Interval: ${interval})`);
      console.log(`   Status: ${plan.status || 'active'}`);
      if (plan.notes) {
        console.log(`   Notes: ${JSON.stringify(plan.notes)}`);
      }
      console.log('');
    });
    
    return plans.items;
  } catch (error) {
    console.error('❌ Error fetching plans:', error.message);
    if (error.error) {
      console.error(`   Details: ${JSON.stringify(error.error, null, 2)}`);
    }
    return [];
  }
}

function verifyPlanMapping(razorpayPlans) {
  console.log('\n🔍 Verifying Plan Mapping...\n');
  console.log('='.repeat(60));
  
  const issues = [];
  const matches = [];
  
  // Check each expected plan
  for (const expectedPlan of EXPECTED_PLANS) {
    console.log(`\n📦 Checking ${expectedPlan.name} Plan:`);
    
    // Check monthly plan
    const monthlyPlanId = EXPECTED_PLAN_IDS[expectedPlan.id].monthly;
    if (!monthlyPlanId) {
      console.log(`   ❌ Monthly Plan ID not configured in environment`);
      issues.push({
        plan: expectedPlan.name,
        type: 'monthly',
        issue: 'Plan ID not in environment variables'
      });
    } else {
      const razorpayPlan = razorpayPlans.find(p => p.id === monthlyPlanId);
      if (!razorpayPlan) {
        console.log(`   ❌ Monthly Plan ID (${monthlyPlanId}) not found in Razorpay`);
        issues.push({
          plan: expectedPlan.name,
          type: 'monthly',
          issue: `Plan ID ${monthlyPlanId} not found in Razorpay`
        });
      } else {
        const planAmount = razorpayPlan.item?.amount ? razorpayPlan.item.amount / 100 : 0;
        if (planAmount !== expectedPlan.monthlyPrice) {
          console.log(`   ⚠️  Monthly Plan amount mismatch:`);
          console.log(`      Expected: ₹${expectedPlan.monthlyPrice.toLocaleString('en-IN')}`);
          console.log(`      Actual: ₹${planAmount.toLocaleString('en-IN')}`);
          issues.push({
            plan: expectedPlan.name,
            type: 'monthly',
            issue: `Amount mismatch: Expected ₹${expectedPlan.monthlyPrice}, Got ₹${planAmount}`
          });
        } else {
          console.log(`   ✅ Monthly Plan: ${razorpayPlan.item?.name || 'N/A'} (${monthlyPlanId})`);
          console.log(`      Amount: ₹${planAmount.toLocaleString('en-IN')} ✓`);
          matches.push({
            plan: expectedPlan.name,
            type: 'monthly',
            planId: monthlyPlanId,
            amount: planAmount
          });
        }
      }
    }
    
    // Check yearly plan
    const yearlyPlanId = EXPECTED_PLAN_IDS[expectedPlan.id].yearly;
    if (!yearlyPlanId) {
      console.log(`   ❌ Yearly Plan ID not configured in environment`);
      issues.push({
        plan: expectedPlan.name,
        type: 'yearly',
        issue: 'Plan ID not in environment variables'
      });
    } else {
      const razorpayPlan = razorpayPlans.find(p => p.id === yearlyPlanId);
      if (!razorpayPlan) {
        console.log(`   ❌ Yearly Plan ID (${yearlyPlanId}) not found in Razorpay`);
        issues.push({
          plan: expectedPlan.name,
          type: 'yearly',
          issue: `Plan ID ${yearlyPlanId} not found in Razorpay`
        });
      } else {
        const planAmount = razorpayPlan.item?.amount ? razorpayPlan.item.amount / 100 : 0;
        if (planAmount !== expectedPlan.yearlyPrice) {
          console.log(`   ⚠️  Yearly Plan amount mismatch:`);
          console.log(`      Expected: ₹${expectedPlan.yearlyPrice.toLocaleString('en-IN')}`);
          console.log(`      Actual: ₹${planAmount.toLocaleString('en-IN')}`);
          issues.push({
            plan: expectedPlan.name,
            type: 'yearly',
            issue: `Amount mismatch: Expected ₹${expectedPlan.yearlyPrice}, Got ₹${planAmount}`
          });
        } else {
          console.log(`   ✅ Yearly Plan: ${razorpayPlan.item?.name || 'N/A'} (${yearlyPlanId})`);
          console.log(`      Amount: ₹${planAmount.toLocaleString('en-IN')} ✓`);
          matches.push({
            plan: expectedPlan.name,
            type: 'yearly',
            planId: yearlyPlanId,
            amount: planAmount
          });
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  console.log(`✅ Correctly mapped: ${matches.length} plans`);
  console.log(`❌ Issues found: ${issues.length} plans\n`);
  
  if (issues.length > 0) {
    console.log('⚠️  Issues to fix:\n');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.plan} (${issue.type}): ${issue.issue}`);
    });
    console.log('\n💡 To fix issues:');
    console.log('   1. Run: node scripts/create-razorpay-plans.js');
    console.log('   2. Update environment variables with the new Plan IDs');
    console.log('   3. Restart your application');
  } else {
    console.log('🎉 All plans are correctly configured and mapped!');
  }
  
  return { matches, issues };
}

async function main() {
  console.log('🚀 Razorpay Plans Verification Script\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Cannot proceed without API connection.');
    process.exit(1);
  }
  
  // List all plans
  const razorpayPlans = await listAllPlans();
  
  // Verify mapping
  if (razorpayPlans.length > 0) {
    verifyPlanMapping(razorpayPlans);
  }
  
  console.log('\n✨ Verification complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

